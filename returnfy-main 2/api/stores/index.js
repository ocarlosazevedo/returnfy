const { getSupabase } = require('../lib/supabase.js');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const supabase = getSupabase();
  
  // Auth check for admin endpoints
  const authHeader = req.headers.authorization;
  const isAdmin = authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`;
  
  try {
    // GET - Listar lojas (admin only)
    if (req.method === 'GET') {
      if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, shopify_domain, is_active, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return res.status(200).json({ stores: data });
    }
    
    // POST - Criar loja (admin only)
    if (req.method === 'POST') {
      if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { name, shopify_domain, shopify_token } = req.body;
      
      if (!name || !shopify_domain || !shopify_token) {
        return res.status(400).json({ error: 'Missing required fields: name, shopify_domain, shopify_token' });
      }
      
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('stores')
        .select('id')
        .eq('shopify_domain', shopify_domain)
        .single();
      
      if (existing) {
        return res.status(409).json({ error: 'Store already exists' });
      }
      
      // Testar conexão com Shopify
      const testUrl = `https://${shopify_domain}/admin/api/2024-01/shop.json`;
      const testResponse = await fetch(testUrl, {
        headers: { 'X-Shopify-Access-Token': shopify_token }
      });
      
      if (!testResponse.ok) {
        return res.status(400).json({ error: 'Invalid Shopify credentials' });
      }
      
      const { data, error } = await supabase
        .from('stores')
        .insert({ name, shopify_domain, shopify_token })
        .select()
        .single();
      
      if (error) throw error;
      
      return res.status(201).json({ 
        store: { 
          id: data.id, 
          name: data.name, 
          shopify_domain: data.shopify_domain,
          is_active: data.is_active 
        } 
      });
    }
    
    // PUT - Atualizar loja
    if (req.method === 'PUT') {
      if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { id, name, shopify_domain, shopify_token, is_active } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Missing store id' });
      }
      
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (shopify_domain !== undefined) updates.shopify_domain = shopify_domain;
      if (shopify_token !== undefined) updates.shopify_token = shopify_token;
      if (is_active !== undefined) updates.is_active = is_active;
      
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', id)
        .select('id, name, shopify_domain, is_active')
        .single();
      
      if (error) throw error;
      
      return res.status(200).json({ store: data });
    }
    
    // DELETE - Remover loja
    if (req.method === 'DELETE') {
      if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Missing store id' });
      }
      
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Stores API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
