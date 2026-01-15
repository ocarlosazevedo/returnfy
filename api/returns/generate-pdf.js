const { getSupabase } = require('../lib/supabase.js');

/**
 * Generate PDF receipt for return request
 * Simple implementation that returns formatted text/HTML that can be printed as PDF
 * For production, consider using puppeteer or pdfkit for better formatting
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabase();

  try {
    // Support both GET and POST methods
    let return_id, customer_email;

    if (req.method === 'GET') {
      return_id = req.query.return_id;
      customer_email = req.query.customer_email;
    } else {
      return_id = req.body.return_id;
      customer_email = req.body.customer_email;
    }

    if (!return_id || !customer_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch return request data
    const { data: returnRequest, error } = await supabase
      .from('return_requests')
      .select(`
        *,
        stores (id, name, shopify_domain)
      `)
      .eq('id', return_id)
      .eq('customer_email', customer_email)
      .single();

    if (error || !returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    const formData = returnRequest.form_data || {};
    const store = returnRequest.stores || {};
    const refNumber = return_id.substring(0, 8).toUpperCase();
    const submitDate = new Date(returnRequest.created_at).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Generate HTML document
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Return Request Receipt - ${refNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      background: white;
      color: #1a1a2e;
      line-height: 1.6;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #6C63FF;
    }
    .logo {
      font-size: 32px;
      font-weight: 700;
      color: #6C63FF;
      margin-bottom: 10px;
    }
    .ref-number {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .ref-number strong { font-size: 20px; color: #6C63FF; }
    .section {
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .section h2 {
      color: #6C63FF;
      margin-bottom: 15px;
      font-size: 18px;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
    }
    .info-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label {
      font-weight: 600;
      color: #666;
      width: 180px;
      flex-shrink: 0;
    }
    .info-value { color: #1a1a2e; flex: 1; }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      background: #ffc107;
      color: #000;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">RETURNFY</div>
      <div style="color: #666; font-size: 14px;">Return & Refund Portal</div>
    </div>

    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 10px;">Return Request Receipt</h1>
      <p style="color: #666;">This document confirms your return request submission</p>
    </div>

    <div class="ref-number">
      <div style="color: #666; font-size: 12px; margin-bottom: 5px;">Reference Number</div>
      <strong>${refNumber}</strong>
    </div>

    <div class="section">
      <h2>Request Information</h2>
      <div class="info-row">
        <div class="info-label">Submission Date:</div>
        <div class="info-value">${submitDate}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Status:</div>
        <div class="info-value"><span class="status-badge">${returnRequest.status}</span></div>
      </div>
      <div class="info-row">
        <div class="info-label">Store:</div>
        <div class="info-value">${store.name || 'N/A'}</div>
      </div>
    </div>

    <div class="section">
      <h2>Order Details</h2>
      <div class="info-row">
        <div class="info-label">Order Number:</div>
        <div class="info-value"><strong>#${returnRequest.shopify_order_number}</strong></div>
      </div>
      <div class="info-row">
        <div class="info-label">Order Total:</div>
        <div class="info-value">${returnRequest.order_currency} ${returnRequest.order_total}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Order Date:</div>
        <div class="info-value">${returnRequest.order_date ? new Date(returnRequest.order_date).toLocaleDateString() : 'N/A'}</div>
      </div>
    </div>

    <div class="section">
      <h2>Customer Information</h2>
      <div class="info-row">
        <div class="info-label">Name:</div>
        <div class="info-value">${formData.full_name || returnRequest.customer_name || 'N/A'}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Email:</div>
        <div class="info-value">${returnRequest.customer_email}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Phone:</div>
        <div class="info-value">${formData.phone || returnRequest.customer_phone || 'N/A'}</div>
      </div>
      <div class="info-row">
        <div class="info-label">ID Document:</div>
        <div class="info-value">${formData.document || returnRequest.customer_document || 'N/A'}</div>
      </div>
    </div>

    <div class="section">
      <h2>Return Details</h2>
      <div class="info-row">
        <div class="info-label">Reason:</div>
        <div class="info-value">${formData.reason || 'N/A'}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Description:</div>
        <div class="info-value">${formData.description || 'N/A'}</div>
      </div>
      <div class="info-row">
        <div class="info-label">When Noticed:</div>
        <div class="info-value">${formData.when_noticed || 'N/A'}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Product Used:</div>
        <div class="info-value">${formData.product_used || 'N/A'}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Preferred Resolution:</div>
        <div class="info-value">${formData.resolution_type || 'N/A'}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Order Received Date:</div>
        <div class="info-value">${formData.receive_date || 'N/A'}</div>
      </div>
    </div>

    ${formData.address ? `
    <div class="section">
      <h2>Shipping Address</h2>
      <div class="info-value">
        ${formData.address.line1}<br>
        ${formData.address.line2 ? formData.address.line2 + '<br>' : ''}
        ${formData.address.city}, ${formData.address.state} ${formData.address.zip}<br>
        ${formData.address.country}
      </div>
    </div>
    ` : ''}

    ${returnRequest.attachments && returnRequest.attachments.length > 0 ? `
    <div class="section">
      <h2>Supporting Documents</h2>
      <div class="info-row">
        <div class="info-label">Photos Submitted:</div>
        <div class="info-value">${returnRequest.attachments.length} file(s)</div>
      </div>
    </div>
    ` : ''}

    <div class="section" style="background: #fff3cd; border-left: 4px solid #ffc107;">
      <h2 style="color: #856404; border-bottom-color: #ffc107;">Important Information</h2>
      <p style="color: #856404; margin-top: 10px;">
        • Keep this receipt for your records<br>
        • Your request will be reviewed within 3-5 business days<br>
        • You will receive an email notification once a decision is made<br>
        • For questions, reference your request number: <strong>${refNumber}</strong>
      </p>
    </div>

    <div class="footer">
      <p>Generated on ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      <p style="margin-top: 10px;">This is an automated receipt. Please do not reply to this document.</p>
      <p style="margin-top: 10px; color: #6C63FF; font-weight: 600;">Returnfy - Return & Refund Management</p>
    </div>
  </div>
</body>
</html>`;

    // Set headers for PDF download (browser will handle print-to-PDF)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Return_Request_${refNumber}.html"`);

    return res.status(200).send(html);

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
};
