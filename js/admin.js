/**
 * Returnfy - Admin Dashboard
 */

// ===========================================
// State
// ===========================================

let adminToken = localStorage.getItem('returnfy_admin_token') || '';
let stores = [];
let returns = [];
let currentReturn = null;

// ===========================================
// Auth
// ===========================================

function login() {
  const password = document.getElementById('adminPassword').value;
  
  if (!password) {
    alert('Please enter the password');
    return;
  }
  
  adminToken = password;
  localStorage.setItem('returnfy_admin_token', password);
  
  // Test auth by loading stores
  loadStores().then(success => {
    if (success) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('dashboard').style.display = 'block';
      loadReturns();
    } else {
      alert('Invalid password');
      localStorage.removeItem('returnfy_admin_token');
      adminToken = '';
    }
  });
}

function logout() {
  localStorage.removeItem('returnfy_admin_token');
  adminToken = '';
  location.reload();
}

function checkAuth() {
  if (adminToken) {
    loadStores().then(success => {
      if (success) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadReturns();
      }
    });
  }
}

// ===========================================
// API Helpers
// ===========================================

async function apiGet(endpoint) {
  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  return response;
}

async function apiPost(endpoint, data) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response;
}

// ===========================================
// Stores
// ===========================================

async function loadStores() {
  try {
    const response = await apiGet('/api/stores');
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    stores = data.stores || [];
    
    renderStoresTable();
    updateStoreFilter();
    
    return true;
  } catch (error) {
    console.error('Load stores error:', error);
    return false;
  }
}

function renderStoresTable() {
  const tbody = document.getElementById('storesTableBody');
  
  if (stores.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 40px; color: #999;">
          No stores connected. Click "Add Store" to connect your first Shopify store.
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = stores.map(store => `
    <tr>
      <td><strong>${store.name}</strong></td>
      <td>${store.shopify_domain}</td>
      <td>
        <span class="order-status-badge ${store.is_active ? 'badge-approved' : 'badge-denied'}">
          ${store.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <button class="action-btn view" onclick="toggleStoreStatus('${store.id}', ${!store.is_active})">
          ${store.is_active ? 'Disable' : 'Enable'}
        </button>
        <button class="action-btn deny" onclick="deleteStore('${store.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function updateStoreFilter() {
  const select = document.getElementById('filterStore');
  select.innerHTML = '<option value="">All Stores</option>' +
    stores.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

function openAddStoreModal() {
  openModal('storeModal');
}

async function addStore() {
  const name = document.getElementById('newStoreName').value.trim();
  const domain = document.getElementById('newStoreDomain').value.trim();
  const token = document.getElementById('newStoreToken').value.trim();
  
  if (!name || !domain || !token) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    const response = await apiPost('/api/stores', {
      name,
      shopify_domain: domain,
      shopify_token: token
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      alert(data.error || 'Failed to add store');
      return;
    }
    
    closeModal('storeModal');
    loadStores();
    alert('Store added successfully!');
    
  } catch (error) {
    console.error('Add store error:', error);
    alert('Failed to add store');
  }
}

async function toggleStoreStatus(storeId, newStatus) {
  try {
    const response = await fetch('/api/stores', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: storeId, is_active: newStatus })
    });
    
    if (response.ok) {
      loadStores();
    }
  } catch (error) {
    console.error('Toggle store error:', error);
  }
}

async function deleteStore(storeId) {
  if (!confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch('/api/stores', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: storeId })
    });
    
    if (response.ok) {
      loadStores();
    }
  } catch (error) {
    console.error('Delete store error:', error);
  }
}

// ===========================================
// Returns
// ===========================================

async function loadReturns() {
  const status = document.getElementById('filterStatus').value;
  const storeId = document.getElementById('filterStore').value;
  
  let url = `/api/returns?status=${status}`;
  if (storeId) url += `&store_id=${storeId}`;
  
  try {
    const response = await apiGet(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error);
    }
    
    returns = data.returns || [];
    
    // Update stats
    if (data.counts) {
      document.getElementById('statPending').textContent = data.counts.pending || 0;
      document.getElementById('statReviewing').textContent = data.counts.reviewing || 0;
      document.getElementById('statApproved').textContent = 
        (data.counts.approved_refund || 0) + (data.counts.approved_resend || 0);
      document.getElementById('statDenied').textContent = data.counts.denied || 0;
    }
    
    renderReturnsTable();
    
  } catch (error) {
    console.error('Load returns error:', error);
  }
}

function renderReturnsTable() {
  const tbody = document.getElementById('returnsTableBody');
  
  if (returns.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #999;">
          No return requests found.
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = returns.map(ret => {
    const date = new Date(ret.created_at).toLocaleDateString();
    const statusClass = ret.status === 'pending' ? 'badge-pending' :
                       ret.status === 'reviewing' ? 'badge-reviewing' :
                       ret.status.includes('approved') ? 'badge-approved' : 'badge-denied';
    
    return `
      <tr>
        <td><strong>${ret.shopify_order_number}</strong></td>
        <td>
          ${ret.customer_name || 'N/A'}<br>
          <small style="color: #999;">${ret.customer_email}</small>
        </td>
        <td>${ret.stores?.name || 'Unknown'}</td>
        <td>${ret.form_data?.reason || 'N/A'}</td>
        <td>
          <span class="order-status-badge ${statusClass}">
            ${ret.status.replace('_', ' ')}
          </span>
        </td>
        <td>${date}</td>
        <td>
          <button class="action-btn view" onclick="viewReturn('${ret.id}')">View</button>
        </td>
      </tr>
    `;
  }).join('');
}

function viewReturn(returnId) {
  currentReturn = returns.find(r => r.id === returnId);
  if (!currentReturn) return;
  
  const form = currentReturn.form_data || {};
  const date = new Date(currentReturn.created_at).toLocaleString();
  const timeSpent = currentReturn.time_spent_seconds 
    ? `${Math.floor(currentReturn.time_spent_seconds / 60)}m ${currentReturn.time_spent_seconds % 60}s`
    : 'N/A';
  
  document.getElementById('returnModalBody').innerHTML = `
    <div style="display: grid; gap: 20px;">
      <!-- Order Info -->
      <div>
        <h4 style="margin-bottom: 12px; color: #1a1a2e;">Order Information</h4>
        <table style="width: 100%; font-size: 14px;">
          <tr><td style="color: #666; padding: 4px 0;">Order Number:</td><td><strong>${currentReturn.shopify_order_number}</strong></td></tr>
          <tr><td style="color: #666; padding: 4px 0;">Order Total:</td><td>${currentReturn.order_currency} ${currentReturn.order_total}</td></tr>
          <tr><td style="color: #666; padding: 4px 0;">Store:</td><td>${currentReturn.stores?.name || 'Unknown'}</td></tr>
          <tr><td style="color: #666; padding: 4px 0;">Request Date:</td><td>${date}</td></tr>
          <tr><td style="color: #666; padding: 4px 0;">Time to Complete:</td><td>${timeSpent}</td></tr>
        </table>
      </div>
      
      <!-- Customer Info -->
      <div>
        <h4 style="margin-bottom: 12px; color: #1a1a2e;">Customer Information</h4>
        <table style="width: 100%; font-size: 14px;">
          <tr><td style="color: #666; padding: 4px 0;">Name:</td><td>${form.full_name || currentReturn.customer_name || 'N/A'}</td></tr>
          <tr><td style="color: #666; padding: 4px 0;">Email:</td><td>${currentReturn.customer_email}</td></tr>
          <tr><td style="color: #666; padding: 4px 0;">Phone:</td><td>${form.phone || currentReturn.customer_phone || 'N/A'}</td></tr>
          <tr><td style="color: #666; padding: 4px 0;">Document:</td><td>${form.document || currentReturn.customer_document || 'N/A'}</td></tr>
        </table>
      </div>
      
      <!-- Return Details -->
      <div>
        <h4 style="margin-bottom: 12px; color: #1a1a2e;">Return Details</h4>
        <table style="width: 100%; font-size: 14px;">
          <tr><td style="color: #666; padding: 4px 0;">Reason:</td><td>${form.reason || 'N/A'}</td></tr>
          <tr><td style="color: #666; padding: 4px 0; vertical-align: top;">Description:</td><td>${form.description || 'N/A'}</td></tr>
          <tr><td style="color: #666; padding: 4px 0;">When Noticed:</td><td>${form.when_noticed || 'N/A'}</td></tr>
          <tr><td style="color: #666; padding: 4px 0;">Product Used:</td><td>${form.product_used || 'N/A'}</td></tr>
          <tr><td style="color: #666; padding: 4px 0;">Resolution:</td><td>${form.resolution_type || 'N/A'}</td></tr>
        </table>
      </div>
      
      <!-- Verification Documents -->
      <div>
        <h4 style="margin-bottom: 12px; color: #1a1a2e;">Verification Documents</h4>
        <div style="display: grid; gap: 16px;">
          ${(() => {
            const idDocUrl = currentReturn.attachments?.find(url => url.includes('id_document'));
            const proofAddressUrl = currentReturn.attachments?.find(url => url.includes('proof_of_address'));

            let html = '';

            if (idDocUrl) {
              const isPDF = idDocUrl.toLowerCase().endsWith('.pdf');
              html += `
                <div>
                  <div style="font-weight: 600; margin-bottom: 8px; color: #666;">ID Document</div>
                  ${isPDF ? `
                    <a href="${idDocUrl}" target="_blank" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f0f0f0; border-radius: 8px; text-decoration: none; color: #1a1a2e;">
                      <div style="font-size: 32px;">📄</div>
                      <div>
                        <div style="font-weight: 600; font-size: 14px;">View PDF Document</div>
                        <div style="font-size: 12px; color: #666;">Click to open in new tab</div>
                      </div>
                    </a>
                  ` : `
                    <a href="${idDocUrl}" target="_blank">
                      <img src="${idDocUrl}" style="width: 100%; max-width: 300px; border-radius: 8px; border: 2px solid #e0e0e0;">
                    </a>
                  `}
                </div>
              `;
            }

            if (proofAddressUrl) {
              const isPDF = proofAddressUrl.toLowerCase().endsWith('.pdf');
              html += `
                <div>
                  <div style="font-weight: 600; margin-bottom: 8px; color: #666;">Proof of Address</div>
                  ${isPDF ? `
                    <a href="${proofAddressUrl}" target="_blank" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f0f0f0; border-radius: 8px; text-decoration: none; color: #1a1a2e;">
                      <div style="font-size: 32px;">📄</div>
                      <div>
                        <div style="font-weight: 600; font-size: 14px;">View PDF Document</div>
                        <div style="font-size: 12px; color: #666;">Click to open in new tab</div>
                      </div>
                    </a>
                  ` : `
                    <a href="${proofAddressUrl}" target="_blank">
                      <img src="${proofAddressUrl}" style="width: 100%; max-width: 300px; border-radius: 8px; border: 2px solid #e0e0e0;">
                    </a>
                  `}
                </div>
              `;
            }

            if (!html) {
              html = '<div style="color: #999;">No verification documents uploaded</div>';
            }

            return html;
          })()}
        </div>
      </div>

      <!-- Product Photos -->
      ${(() => {
        const productPhotos = currentReturn.attachments?.filter(url =>
          !url.includes('id_document') && !url.includes('proof_of_address')
        ) || [];

        if (productPhotos.length > 0) {
          return `
            <div>
              <h4 style="margin-bottom: 12px; color: #1a1a2e;">Product Photos</h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px;">
                ${productPhotos.map(url => `
                  <a href="${url}" target="_blank">
                    <img src="${url}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px;">
                  </a>
                `).join('')}
              </div>
            </div>
          `;
        }
        return '';
      })()}
      
      <!-- Shipping Address -->
      ${form.address ? `
        <div>
          <h4 style="margin-bottom: 12px; color: #1a1a2e;">Shipping Address</h4>
          <p style="font-size: 14px; line-height: 1.6;">
            ${form.address.line1}<br>
            ${form.address.line2 ? form.address.line2 + '<br>' : ''}
            ${form.address.city}, ${form.address.state} ${form.address.zip}<br>
            ${form.address.country}
          </p>
        </div>
      ` : ''}
      
      
      <!-- Admin Notes -->
      <div>
        <h4 style="margin-bottom: 12px; color: #1a1a2e;">Admin Notes</h4>
        <textarea class="form-textarea" id="adminNotes" placeholder="Add notes about this request...">${currentReturn.admin_notes || ''}</textarea>
      </div>
    </div>
  `;
  
  openModal('returnModal');
}

async function takeAction(action) {
  if (!currentReturn) return;
  
  const notes = document.getElementById('adminNotes').value;
  
  const actionLabels = {
    'approve_refund': 'approve refund for',
    'approve_resend': 'approve resend for',
    'deny': 'deny'
  };
  
  if (!confirm(`Are you sure you want to ${actionLabels[action]} this return request?`)) {
    return;
  }
  
  try {
    const response = await apiPost(`/api/returns/${currentReturn.id}/action`, {
      action,
      notes
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      alert(data.error || 'Action failed');
      return;
    }
    
    closeModal('returnModal');
    loadReturns();
    alert('Action completed successfully!');
    
  } catch (error) {
    console.error('Action error:', error);
    alert('Failed to complete action');
  }
}

// ===========================================
// UI Helpers
// ===========================================

function showSection(section) {
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  event.target.classList.add('active');
  
  document.getElementById('returnsSection').style.display = section === 'returns' ? 'block' : 'none';
  document.getElementById('storesSection').style.display = section === 'stores' ? 'block' : 'none';
  
  if (section === 'stores') {
    loadStores();
  }
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// ===========================================
// Initialize
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  
  // Check for store connection success
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('store_connected') === 'true') {
    setTimeout(() => {
      alert('Store connected successfully via OAuth!');
      // Clean URL
      window.history.replaceState({}, document.title, '/admin');
      // Refresh stores list
      showSection('stores');
    }, 500);
  }
  
  if (urlParams.get('setup_error')) {
    setTimeout(() => {
      alert('Error connecting store: ' + decodeURIComponent(urlParams.get('setup_error')));
      window.history.replaceState({}, document.title, '/admin');
    }, 500);
  }
  
  // Enter key on password field
  document.getElementById('adminPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
  });
});
