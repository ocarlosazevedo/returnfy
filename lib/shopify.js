/**
 * Shopify API Helper
 * Busca pedidos por email em uma loja específica
 */

async function searchOrdersByEmail(store, email) {
  const { shopify_domain, shopify_token } = store;
  
  const url = `https://${shopify_domain}/admin/api/2024-01/orders.json?email=${encodeURIComponent(email)}&status=any&limit=50`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': shopify_token,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`Shopify API error for ${shopify_domain}:`, response.status);
      return [];
    }
    
    const data = await response.json();
    
    return (data.orders || []).map(order => ({
      shopify_order_id: String(order.id),
      order_number: order.name || `#${order.order_number}`,
      order_date: order.created_at,
      total: order.total_price,
      currency: order.currency,
      financial_status: order.financial_status,
      fulfillment_status: order.fulfillment_status,
      customer_name: order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : '',
      customer_email: order.email,
      line_items: (order.line_items || []).map(item => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        sku: item.sku,
        variant_title: item.variant_title,
        image: item.image?.src || null
      })),
      shipping_address: order.shipping_address ? {
        address1: order.shipping_address.address1,
        address2: order.shipping_address.address2,
        city: order.shipping_address.city,
        province: order.shipping_address.province,
        country: order.shipping_address.country,
        zip: order.shipping_address.zip
      } : null,
      store_id: store.id,
      store_name: store.name
    }));
  } catch (error) {
    console.error(`Error fetching orders from ${shopify_domain}:`, error);
    return [];
  }
}

/**
 * Busca detalhes de um pedido específico
 */
async function getOrderById(store, orderId) {
  const { shopify_domain, shopify_token } = store;
  
  const url = `https://${shopify_domain}/admin/api/2024-01/orders/${orderId}.json`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': shopify_token,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error(`Error fetching order ${orderId}:`, error);
    return null;
  }
}

module.exports = { searchOrdersByEmail, getOrderById };
