import { getSupabase } from '../lib/supabase.js';

/**
 * ============================================
 * API: CALLBACK OAUTH CUSTOM APP
 * ============================================
 * 
 * Recebe callback do OAuth após autorização.
 * Troca code por access_token usando as credenciais
 * do Custom App fornecidas pelo usuário.
 * 
 * GET /api/shopify/custom-app/callback
 */

function getAppBaseUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://returnfy.vercel.app';
}

// Decodifica state do OAuth
function decodeOAuthState(state) {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const data = JSON.parse(decoded);
    
    // Verifica se não expirou (15 minutos)
    if (Date.now() - data.timestamp > 15 * 60 * 1000) {
      console.error('[CUSTOM-CALLBACK] State expired');
      return null;
    }
    
    return data;
  } catch (e) {
    console.error('[CUSTOM-CALLBACK] Error decoding state:', e);
    return null;
  }
}

// Troca code por token usando credenciais do Custom App
async function exchangeCodeForToken(shop, code, clientId, clientSecret) {
  const url = `https://${shop}/admin/oauth/access_token`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error exchanging code: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

// Obtém info da loja via API
async function getShopInfo(shop, accessToken) {
  const url = `https://${shop}/admin/api/2024-01/shop.json`;
  
  const response = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': accessToken }
  });
  
  if (!response.ok) {
    return { name: shop.replace('.myshopify.com', '') };
  }
  
  const data = await response.json();
  return data.shop || { name: shop.replace('.myshopify.com', '') };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const baseUrl = getAppBaseUrl();
  
  try {
    const { code, shop, state } = req.query;
    
    console.log(`[CUSTOM-CALLBACK] 📥 Callback received from ${shop}`);
    
    // Valida parâmetros
    if (!code || !shop || !state) {
      console.error('[CUSTOM-CALLBACK] ❌ Missing parameters');
      return res.redirect(302, `${baseUrl}/admin?setup_error=missing_params`);
    }
    
    // Decodifica state
    const stateData = decodeOAuthState(state);
    if (!stateData) {
      console.error('[CUSTOM-CALLBACK] ❌ Invalid or expired state');
      return res.redirect(302, `${baseUrl}/admin?setup_error=invalid_state`);
    }
    
    const { clientId, clientSecret, storeName } = stateData;
    
    console.log(`[CUSTOM-CALLBACK] 🏪 Store: ${storeName}`);
    
    // Troca code por token
    console.log(`[CUSTOM-CALLBACK] 🔄 Exchanging code for token...`);
    const tokenData = await exchangeCodeForToken(shop, code, clientId, clientSecret);
    
    if (!tokenData.access_token) {
      console.error('[CUSTOM-CALLBACK] ❌ No access_token received');
      return res.redirect(302, `${baseUrl}/admin?setup_error=no_token`);
    }
    
    console.log(`[CUSTOM-CALLBACK] ✅ Token obtained! Scopes: ${tokenData.scope}`);
    
    // Obtém info da loja
    const shopInfo = await getShopInfo(shop, tokenData.access_token);
    console.log(`[CUSTOM-CALLBACK] 🏪 Shop name: ${shopInfo.name}`);
    
    // Conecta ao banco
    const supabase = getSupabase();
    
    // Verifica se a loja já existe
    const { data: existingStore } = await supabase
      .from('stores')
      .select('id')
      .eq('shopify_domain', shop)
      .single();
    
    if (existingStore) {
      // Atualiza loja existente
      console.log(`[CUSTOM-CALLBACK] 🔄 Updating existing store: ${existingStore.id}`);
      
      const { error: updateError } = await supabase
        .from('stores')
        .update({
          shopify_token: tokenData.access_token,
          name: storeName || shopInfo.name,
          is_active: true,
          oauth_connected: true,
          oauth_connected_at: new Date().toISOString(),
          oauth_scopes: tokenData.scope,
          integration_type: 'custom_app'
        })
        .eq('id', existingStore.id);
      
      if (updateError) {
        console.error('[CUSTOM-CALLBACK] ❌ Update error:', updateError);
        return res.redirect(302, `${baseUrl}/admin?setup_error=update_failed`);
      }
      
    } else {
      // Cria nova loja
      console.log(`[CUSTOM-CALLBACK] 🆕 Creating new store...`);
      
      const { error: createError } = await supabase
        .from('stores')
        .insert({
          name: storeName || shopInfo.name,
          shopify_domain: shop,
          shopify_token: tokenData.access_token,
          is_active: true,
          oauth_connected: true,
          oauth_connected_at: new Date().toISOString(),
          oauth_scopes: tokenData.scope,
          integration_type: 'custom_app'
        });
      
      if (createError) {
        console.error('[CUSTOM-CALLBACK] ❌ Create error:', createError);
        return res.redirect(302, `${baseUrl}/admin?setup_error=create_failed`);
      }
    }
    
    console.log(`[CUSTOM-CALLBACK] 🎉 Integration via Custom App complete!`);
    
    // Redireciona para sucesso
    return res.redirect(302, `${baseUrl}/admin?store_connected=true`);
    
  } catch (error) {
    console.error('[CUSTOM-CALLBACK] ❌ Error:', error.message);
    console.error(error.stack);
    return res.redirect(302, `${baseUrl}/admin?setup_error=${encodeURIComponent(error.message)}`);
  }
}
