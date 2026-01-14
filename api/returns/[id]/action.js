const { getSupabase } = require('../../../lib/supabase.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Auth check
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { id } = req.query;
  const { action, notes } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Missing return request id' });
  }
  
  const validActions = ['approve_refund', 'approve_resend', 'deny', 'reviewing'];
  if (!action || !validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
  }
  
  const statusMap = {
    'approve_refund': 'approved_refund',
    'approve_resend': 'approved_resend',
    'deny': 'denied',
    'reviewing': 'reviewing'
  };
  
  try {
    const supabase = getSupabase();
    
    // Buscar solicitação atual
    const { data: current, error: fetchError } = await supabase
      .from('return_requests')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !current) {
      return res.status(404).json({ error: 'Return request not found' });
    }
    
    // Atualizar status
    const updates = {
      status: statusMap[action],
      admin_notes: notes || current.admin_notes,
      updated_at: new Date().toISOString()
    };
    
    if (action !== 'reviewing') {
      updates.resolution_date = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('return_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Registrar ação no histórico
    await supabase
      .from('admin_actions')
      .insert({
        return_request_id: id,
        action: action,
        notes: notes || null
      });
    
    return res.status(200).json({ 
      success: true,
      return_request: data
    });
    
  } catch (error) {
    console.error('Action API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
