const { getSupabase } = require('../../lib/supabase.js');
const { searchOrdersByEmail } = require('../../lib/shopify.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  // Validação básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  try {
    const supabase = getSupabase();
    
    // Buscar todas as lojas ativas
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, shopify_domain, shopify_token')
      .eq('is_active', true);
    
    if (error) throw error;
    
    if (!stores || stores.length === 0) {
      return res.status(200).json({ orders: [], message: 'No stores configured' });
    }
    
    // Buscar pedidos em todas as lojas em paralelo
    const orderPromises = stores.map(store => searchOrdersByEmail(store, email));
    const ordersArrays = await Promise.all(orderPromises);
    
    // Flatten e ordenar por data
    const allOrders = ordersArrays
      .flat()
      .sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
    
    // Verificar se já existe solicitação de devolução para algum pedido
    if (allOrders.length > 0) {
      const orderIds = allOrders.map(o => o.shopify_order_id);
      
      const { data: existingReturns } = await supabase
        .from('return_requests')
        .select('shopify_order_id, status')
        .in('shopify_order_id', orderIds);
      
      const returnsMap = new Map(
        (existingReturns || []).map(r => [r.shopify_order_id, r.status])
      );
      
      // Marcar pedidos que já têm solicitação
      allOrders.forEach(order => {
        order.existing_return_status = returnsMap.get(order.shopify_order_id) || null;
      });
    }
    
    return res.status(200).json({ 
      orders: allOrders,
      total: allOrders.length
    });
    
  } catch (error) {
    console.error('Order search error:', error);
    return res.status(500).json({ error: 'Failed to search orders' });
  }
};
