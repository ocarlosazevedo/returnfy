import crypto from 'crypto';

/**
 * ============================================
 * API: CONECTAR LOJA VIA CUSTOM APP (DEV DASHBOARD)
 * ============================================
 * 
 * Solução para conectar lojas usando OAuth via Dev Dashboard.
 * O usuário cria um Custom App e fornece: domain, client_id, client_secret
 * 
 * POST /api/shopify/custom-app/connect
 * Body: { domain, client_id, client_secret, store_name }
 * 
 * Retorna URL para autorização OAuth
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

// Normaliza domínio para formato .myshopify.com
function normalizeShopDomain(shop) {
  if (!shop) return null;
  let normalized = shop.toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/\/$/, '');
  if (!normalized.includes('.myshopify.com')) {
    normalized = normalized.replace(/\.myshopify\.com.*$/, '');
    normalized = `${normalized}.myshopify.com`;
  }
  return normalized;
}

// Gera state seguro para OAuth
function generateOAuthState(data) {
  const payload = {
    ...data,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex')
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Verifica auth admin
    const authHeader = req.headers.authorization;
    const isAdmin = authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`;
    
    if (!isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Extrai dados do body
    const { domain, client_id, client_secret, store_name } = req.body;
    
    // Validações
    if (!domain || !client_id || !client_secret) {
      return res.status(400).json({ 
        error: 'Required fields: domain, client_id, client_secret' 
      });
    }
    
    // Normaliza domínio
    const normalizedDomain = normalizeShopDomain(domain);
    if (!normalizedDomain) {
      return res.status(400).json({ error: 'Invalid domain' });
    }
    
    console.log(`[CUSTOM-APP] 🔗 Starting connection: ${normalizedDomain}`);
    
    // Gera state com dados necessários para o callback
    const state = generateOAuthState({
      clientId: client_id,
      clientSecret: client_secret,
      domain: normalizedDomain,
      storeName: store_name || normalizedDomain.replace('.myshopify.com', '')
    });
    
    // Monta URL de autorização
    const baseUrl = getAppBaseUrl();
    // Scopes necessários para Returnfy (acesso a pedidos)
    const scopes = 'read_orders,read_products,read_customers';
    const redirectUri = `${baseUrl}/api/shopify-callback`;
    
    console.log(`[CUSTOM-APP] 📍 Base URL: ${baseUrl}`);
    console.log(`[CUSTOM-APP] 📍 Redirect URI: ${redirectUri}`);
    
    const authUrl = `https://${normalizedDomain}/admin/oauth/authorize?` +
      `client_id=${encodeURIComponent(client_id)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}`;
    
    console.log(`[CUSTOM-APP] 🔗 URL generated successfully`);
    
    return res.status(200).json({
      success: true,
      auth_url: authUrl,
      message: 'Redirect user to authorization URL'
    });
    
  } catch (error) {
    console.error('[CUSTOM-APP] ❌ Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
