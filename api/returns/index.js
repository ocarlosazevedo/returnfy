const { getSupabase } = require('../../lib/supabase.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const supabase = getSupabase();
  const authHeader = req.headers.authorization;
  const isAdmin = authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`;
  
  try {
    // GET - Listar solicitações (admin only)
    if (req.method === 'GET') {
      if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { status, store_id, limit = 50, offset = 0 } = req.query;
      
      let query = supabase
        .from('return_requests')
        .select(`
          *,
          stores (id, name, shopify_domain)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      if (store_id) {
        query = query.eq('store_id', store_id);
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Buscar contagem por status
      const { data: statusCounts } = await supabase
        .from('return_requests')
        .select('status')
        .then(result => {
          const counts = { pending: 0, reviewing: 0, approved_refund: 0, approved_resend: 0, denied: 0 };
          (result.data || []).forEach(r => {
            if (counts[r.status] !== undefined) counts[r.status]++;
          });
          return { data: counts };
        });
      
      return res.status(200).json({ 
        returns: data,
        counts: statusCounts
      });
    }
    
    // POST - Criar solicitação (cliente)
    if (req.method === 'POST') {
      const {
        store_id,
        shopify_order_id,
        shopify_order_number,
        order_date,
        order_total,
        order_currency,
        customer_email,
        customer_name,
        customer_phone,
        customer_document,
        form_data,
        attachments,
        time_spent_seconds
      } = req.body;
      
      // Validações
      if (!store_id || !shopify_order_id || !customer_email || !form_data) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Verificar se já existe solicitação para este pedido
      const { data: existing } = await supabase
        .from('return_requests')
        .select('id, status')
        .eq('shopify_order_id', shopify_order_id)
        .single();
      
      if (existing) {
        return res.status(409).json({ 
          error: 'Return request already exists for this order',
          existing_status: existing.status
        });
      }
      
      // Criar solicitação
      const { data, error } = await supabase
        .from('return_requests')
        .insert({
          store_id,
          shopify_order_id,
          shopify_order_number,
          order_date,
          order_total,
          order_currency,
          customer_email,
          customer_name,
          customer_phone,
          customer_document,
          form_data,
          attachments: attachments || [],
          time_spent_seconds,
          status: 'pending',
          completed_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return res.status(201).json({ 
        success: true,
        return_id: data.id,
        message: 'Return request submitted successfully'
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Returns API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
