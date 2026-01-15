/**
 * Returnfy - Customer Form Application
 * Multi-step return request form
 */

// ===========================================
// State
// ===========================================

const state = {
  currentStep: 0,
  customerEmail: '',
  orders: [],
  selectedOrder: null,
  uploads: {
    product_front: null,
    product_back: null,
    defect: null,
    packaging: null,
    label: null,
    id_document: null,
    proof_of_address: null
  },
  signature: null,
  startTime: Date.now(),
  returnId: null
};

// ===========================================
// Translations (i18n)
// ===========================================

const translations = {
  en: {
    header_subtitle: 'Return & Refund Portal',
    step0_title: 'Find Your Order',
    step0_desc: 'Enter the email address used in your purchase to locate your order.',
    email_label: 'Email Address',
    email_hint: 'Use the same email from your order confirmation',
    search_orders: 'Search Orders',
    back: 'Back',
    continue: 'Continue',
    processing: 'Processing your request...',
    please_wait: 'This may take a moment. Please do not close this page.',
    success_title: 'Request Submitted!',
    success_message: 'Your return request has been received. We will review your submission and contact you within 3-5 business days.'
  },
  pt: {
    header_subtitle: 'Portal de Devoluções',
    step0_title: 'Encontre seu Pedido',
    step0_desc: 'Digite o email usado na compra para localizar seu pedido.',
    email_label: 'Endereço de Email',
    email_hint: 'Use o mesmo email da confirmação do pedido',
    search_orders: 'Buscar Pedidos',
    back: 'Voltar',
    continue: 'Continuar',
    processing: 'Processando sua solicitação...',
    please_wait: 'Isso pode levar um momento. Por favor, não feche esta página.',
    success_title: 'Solicitação Enviada!',
    success_message: 'Sua solicitação de devolução foi recebida. Analisaremos e entraremos em contato em 3-5 dias úteis.'
  },
  es: {
    header_subtitle: 'Portal de Devoluciones',
    step0_title: 'Encuentra tu Pedido',
    step0_desc: 'Ingresa el email utilizado en tu compra para localizar tu pedido.',
    email_label: 'Correo Electrónico',
    email_hint: 'Usa el mismo email de la confirmación del pedido',
    search_orders: 'Buscar Pedidos',
    back: 'Volver',
    continue: 'Continuar',
    processing: 'Procesando tu solicitud...',
    please_wait: 'Esto puede tardar un momento. Por favor, no cierres esta página.',
    success_title: '¡Solicitud Enviada!',
    success_message: 'Tu solicitud de devolución ha sido recibida. La revisaremos y te contactaremos en 3-5 días hábiles.'
  },
  it: {
    header_subtitle: 'Portale Resi',
    step0_title: 'Trova il tuo Ordine',
    step0_desc: 'Inserisci l\'email utilizzata per l\'acquisto per trovare il tuo ordine.',
    email_label: 'Indirizzo Email',
    email_hint: 'Usa la stessa email della conferma ordine',
    search_orders: 'Cerca Ordini',
    back: 'Indietro',
    continue: 'Continua',
    processing: 'Elaborazione della richiesta...',
    please_wait: 'Potrebbe richiedere un momento. Non chiudere questa pagina.',
    success_title: 'Richiesta Inviata!',
    success_message: 'La tua richiesta di reso è stata ricevuta. La esamineremo e ti contatteremo entro 3-5 giorni lavorativi.'
  }
};

// Detect language
const userLang = navigator.language.split('-')[0];
const lang = translations[userLang] ? userLang : 'en';

// ===========================================
// Navigation
// ===========================================

function goToStep(step) {
  // Hide all steps
  document.querySelectorAll('.step').forEach(el => el.style.display = 'none');
  
  // Show target step
  const targetStep = document.getElementById(`step-${step}`);
  if (targetStep) {
    targetStep.style.display = 'block';
    state.currentStep = step;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Re-initialize signature pad when step 9 is shown
    if (step === 9) {
      setTimeout(() => initSignaturePad(), 100);
    }
  }
}

function validateAndNext(currentStep) {
  if (!validateStep(currentStep)) return;
  goToStep(currentStep + 1);
}

function validateStep(step) {
  switch(step) {
    case 2: // Identity
      const fullName = document.getElementById('fullName').value.trim();
      const document_ = document.getElementById('customerDocument').value.trim();
      const phone = document.getElementById('customerPhone').value.trim();

      if (!fullName || !document_ || !phone) {
        alert('Please fill in all required fields.');
        return false;
      }

      if (!state.uploads.id_document) {
        alert('Please upload your ID document.');
        return false;
      }

      // Verify phone matches Shopify order
      const orderPhone = state.selectedOrder.customer_phone;
      if (orderPhone && phone !== orderPhone) {
        alert('The phone number you entered does not match the phone number on your order. Please use the exact phone number from your order.');
        return false;
      }

      return true;
      
    case 3: // Order confirmation
      const receiveDate = document.getElementById('receiveDate').value;
      const confirmOrder = document.getElementById('confirmOrder').checked;

      if (!receiveDate || !confirmOrder) {
        alert('Please confirm the order details.');
        return false;
      }

      // Check if received date is within 14 days
      const receivedDate = new Date(receiveDate);
      const today = new Date();
      const daysDifference = Math.floor((today - receivedDate) / (1000 * 60 * 60 * 24));

      if (daysDifference > 14) {
        // Show out of period screen
        goToStep('out-of-period');
        return false;
      }

      return true;
      
    case 4: // Return reason
      const reason = document.getElementById('returnReason').value;
      const description = document.getElementById('returnDescription').value.trim();
      
      if (!reason) {
        alert('Please select a return reason.');
        return false;
      }
      if (description.length < 100) {
        alert('Please provide a detailed description (minimum 100 characters).');
        return false;
      }
      return true;
      
    case 5: // Problem details
      const whenNoticed = document.getElementById('whenNoticed').value;
      const triedResolve = document.getElementById('triedResolve').value;
      const productUsed = document.getElementById('productUsed').value;
      
      if (!whenNoticed || !triedResolve || !productUsed) {
        alert('Please answer all required questions.');
        return false;
      }
      return true;
      
    case 6: // Photos
      const requiredUploads = ['product_front', 'product_back', 'defect', 'packaging', 'label'];
      const missingUploads = requiredUploads.filter(key => !state.uploads[key]);
      
      if (missingUploads.length > 0) {
        alert('Please upload all required photos.');
        return false;
      }
      return true;
      
    case 7: // Address confirmation
      const address = document.getElementById('addressLine1').value.trim();
      const city = document.getElementById('city').value.trim();
      const stateVal = document.getElementById('state').value.trim();
      const zip = document.getElementById('zipCode').value.trim();
      const country = document.getElementById('country').value.trim();
      const confirmAddress = document.getElementById('confirmAddress').checked;

      if (!address || !city || !stateVal || !zip || !country) {
        alert('Please fill in all address fields.');
        return false;
      }

      if (!state.uploads.proof_of_address) {
        alert('Please upload your proof of address document.');
        return false;
      }

      if (!confirmAddress) {
        alert('Please confirm that your address information is accurate.');
        return false;
      }

      return true;
      
    case 8: // Resolution
      const resolutionType = document.getElementById('resolutionType').value;

      if (!resolutionType) {
        alert('Please select your preferred resolution.');
        return false;
      }

      // No bank details needed anymore - refunds go to original payment method
      return true;
      
    default:
      return true;
  }
}

// ===========================================
// Order Search
// ===========================================

async function searchOrders() {
  const email = document.getElementById('customerEmail').value.trim();
  
  if (!email) {
    alert('Please enter your email address.');
    return;
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  
  state.customerEmail = email;
  
  // Show loading
  const mainCard = document.getElementById('mainCard');
  mainCard.classList.add('loading');
  
  try {
    // Fake delay for UX (friction)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await fetch(`/api/orders/search?email=${encodeURIComponent(email)}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to search orders');
    }
    
    state.orders = data.orders || [];
    
    if (state.orders.length === 0) {
      alert('No orders found for this email address. Please check and try again.');
      mainCard.classList.remove('loading');
      return;
    }
    
    renderOrderList();
    goToStep(1);
    
  } catch (error) {
    console.error('Search error:', error);
    alert('An error occurred while searching. Please try again.');
  } finally {
    mainCard.classList.remove('loading');
  }
}

function renderOrderList() {
  const container = document.getElementById('orderList');
  container.innerHTML = '';
  
  state.orders.forEach((order, index) => {
    const hasExistingReturn = order.existing_return_status !== null;
    const orderDate = new Date(order.order_date).toLocaleDateString();
    
    const card = document.createElement('div');
    card.className = `order-card ${hasExistingReturn ? 'disabled' : ''}`;
    card.dataset.index = index;
    
    if (!hasExistingReturn) {
      card.onclick = () => selectOrder(index);
    }
    
    card.innerHTML = `
      <div class="order-header">
        <span class="order-number">${order.order_number}</span>
        <span class="order-date">${orderDate}</span>
      </div>
      <div class="order-details">
        ${order.line_items.slice(0, 2).map(item => item.title).join(', ')}
        ${order.line_items.length > 2 ? ` +${order.line_items.length - 2} more` : ''}
      </div>
      <div class="order-total">${order.currency} ${parseFloat(order.total).toFixed(2)}</div>
      ${hasExistingReturn ? `
        <div style="margin-top: 8px;">
          <span class="order-status-badge badge-${order.existing_return_status === 'pending' ? 'pending' : 
            order.existing_return_status === 'reviewing' ? 'reviewing' :
            order.existing_return_status.includes('approved') ? 'approved' : 'denied'}">
            Return ${order.existing_return_status.replace('_', ' ')}
          </span>
        </div>
      ` : ''}
      <div style="font-size: 12px; color: #999; margin-top: 4px;">from ${order.store_name}</div>
    `;
    
    container.appendChild(card);
  });
}

function selectOrder(index) {
  const order = state.orders[index];
  if (order.existing_return_status) return;
  
  state.selectedOrder = order;
  
  // Update UI
  document.querySelectorAll('.order-card').forEach(card => {
    card.classList.remove('selected');
  });
  document.querySelector(`.order-card[data-index="${index}"]`).classList.add('selected');
  
  document.getElementById('selectOrderBtn').disabled = false;
  
  // Pre-fill order details in step 3
  renderSelectedOrderDetails();
}

function renderSelectedOrderDetails() {
  const order = state.selectedOrder;
  if (!order) return;
  
  const container = document.getElementById('selectedOrderDetails');
  const orderDate = new Date(order.order_date).toLocaleDateString();
  
  container.innerHTML = `
    <div class="order-header">
      <span class="order-number">${order.order_number}</span>
      <span class="order-date">${orderDate}</span>
    </div>
    <div style="margin-top: 12px;">
      ${order.line_items.map(item => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #eee;">
          ${item.image ? `<img src="${item.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : ''}
          <div>
            <div style="font-weight: 500;">${item.title}</div>
            <div style="font-size: 13px; color: #666;">Qty: ${item.quantity} - ${order.currency} ${item.price}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="order-total" style="margin-top: 12px;">Total: ${order.currency} ${parseFloat(order.total).toFixed(2)}</div>
  `;
  
  // Pre-fill customer name if available
  if (order.customer_name) {
    document.getElementById('fullName').value = order.customer_name;
  }
  
  // Pre-fill address if available
  if (order.shipping_address) {
    document.getElementById('addressLine1').value = order.shipping_address.address1 || '';
    document.getElementById('addressLine2').value = order.shipping_address.address2 || '';
    document.getElementById('city').value = order.shipping_address.city || '';
    document.getElementById('state').value = order.shipping_address.province || '';
    document.getElementById('zipCode').value = order.shipping_address.zip || '';
    document.getElementById('country').value = order.shipping_address.country || '';
  }
}

// ===========================================
// File Upload
// ===========================================

function initUploadZones() {
  document.querySelectorAll('.upload-zone').forEach(zone => {
    const uploadKey = zone.dataset.upload;

    // Create hidden input
    const input = document.createElement('input');
    input.type = 'file';

    // Allow PDF for document uploads (ID and proof of address)
    if (uploadKey === 'id_document' || uploadKey === 'proof_of_address') {
      input.accept = 'image/*,application/pdf';
    } else {
      input.accept = 'image/*';
    }

    input.style.display = 'none';
    input.onchange = (e) => handleFileSelect(e, uploadKey);
    zone.appendChild(input);

    // Click to upload
    zone.onclick = () => input.click();

    // Drag and drop
    zone.ondragover = (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    };

    zone.ondragleave = () => {
      zone.classList.remove('dragover');
    };

    zone.ondrop = (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file, uploadKey);
    };
  });
}

function handleFileSelect(event, uploadKey) {
  const file = event.target.files[0];
  if (file) handleFile(file, uploadKey);
}

async function handleFile(file, uploadKey) {
  console.log('handleFile called:', uploadKey, file.name, file.type);

  // Validate file type
  const isDocument = uploadKey === 'id_document' || uploadKey === 'proof_of_address';
  const isValidImage = file.type.startsWith('image/');
  const isValidPDF = file.type === 'application/pdf';

  console.log('File validation:', { isDocument, isValidImage, isValidPDF });

  if (isDocument) {
    if (!isValidImage && !isValidPDF) {
      alert('Por favor, envie uma imagem ou arquivo PDF.');
      return;
    }
  } else {
    if (!isValidImage) {
      alert('Por favor, envie uma imagem.');
      return;
    }
  }

  // Validate file size (10MB max for PDFs, 5MB for images)
  const maxSize = isValidPDF ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    alert(`Arquivo muito grande. Tamanho máximo: ${isValidPDF ? '10MB' : '5MB'}.`);
    return;
  }
  
  // Show preview immediately
  const previewContainer = document.getElementById(`preview_${uploadKey}`);
  const reader = new FileReader();

  reader.onload = (e) => {
    if (isValidPDF) {
      // Show PDF icon for PDF files
      previewContainer.innerHTML = `
        <div class="upload-preview-item">
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f0f0f0; border-radius: 8px;">
            <div style="font-size: 32px;">📄</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 14px; color: #1a1a2e;">${file.name}</div>
              <div style="font-size: 12px; color: #666;">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button class="remove-btn" onclick="removeUpload('${uploadKey}')">&times;</button>
          </div>
        </div>
      `;
    } else {
      // Show image preview for images
      previewContainer.innerHTML = `
        <div class="upload-preview-item">
          <img src="${e.target.result}">
          <button class="remove-btn" onclick="removeUpload('${uploadKey}')">&times;</button>
        </div>
      `;
    }
  };
  reader.readAsDataURL(file);
  
  // Upload to server
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        'x-filename': file.name
      },
      body: file
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    
    state.uploads[uploadKey] = data.url;
    
  } catch (error) {
    console.error('Upload error:', error);
    alert('Failed to upload image. Please try again.');
    previewContainer.innerHTML = '';
    state.uploads[uploadKey] = null;
  }
}

function removeUpload(uploadKey) {
  state.uploads[uploadKey] = null;
  document.getElementById(`preview_${uploadKey}`).innerHTML = '';
}

// ===========================================
// Document Info Tooltip
// ===========================================

function showDocumentInfo() {
  alert(`Accepted ID Documents:

For European Union residents:
• National ID Card
• Passport
• Driver's License (EU format)

For United States residents:
• Passport
• State-issued ID Card
• Driver's License
• Military ID

For United Kingdom residents:
• Passport
• Driving Licence (photocard)
• National Identity Card

Important: The document must be valid (not expired) and show your full name and photo clearly. Please upload a high-quality photo or scan of your document.`);
}

// ===========================================
// Character Counter
// ===========================================

function initCharCounter() {
  const textarea = document.getElementById('returnDescription');
  const counter = document.getElementById('descCharCount');
  
  textarea.addEventListener('input', () => {
    const count = textarea.value.length;
    counter.textContent = count;
    
    const counterParent = counter.parentElement;
    if (count < 100) {
      counterParent.className = 'char-counter error';
    } else {
      counterParent.className = 'char-counter';
    }
  });
}

// ===========================================
// Signature Pad
// ===========================================

let signaturePadContext = null;
let isDrawing = false;

function initSignaturePad() {
  const canvas = document.getElementById('signaturePad');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Set canvas size based on parent container
  const parent = canvas.parentElement;
  const parentWidth = parent.offsetWidth;

  canvas.width = parentWidth > 0 ? parentWidth : 600; // Fallback width
  canvas.height = 200;

  // Style
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  signaturePadContext = ctx;

  // Clear any existing event listeners by cloning the canvas
  // (not needed for first init, but good practice)

  // Events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  // Touch events
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(e.touches[0]);
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e.touches[0]);
  });
  canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
  isDrawing = true;
  const canvas = document.getElementById('signaturePad');
  const rect = canvas.getBoundingClientRect();
  signaturePadContext.beginPath();
  signaturePadContext.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
  if (!isDrawing) return;
  const canvas = document.getElementById('signaturePad');
  const rect = canvas.getBoundingClientRect();
  signaturePadContext.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  signaturePadContext.stroke();
}

function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    state.signature = document.getElementById('signaturePad').toDataURL();
  }
}

function clearSignature() {
  const canvas = document.getElementById('signaturePad');
  signaturePadContext.clearRect(0, 0, canvas.width, canvas.height);
  state.signature = null;
}

// ===========================================
// Submit Return Request
// ===========================================

async function submitReturn() {
  // Validate final step
  const terms1 = document.getElementById('acceptTerms1').checked;
  const terms2 = document.getElementById('acceptTerms2').checked;
  const terms3 = document.getElementById('acceptTerms3').checked;

  if (!terms1 || !terms2 || !terms3) {
    alert('Please accept all terms and conditions.');
    return;
  }

  if (!state.signature) {
    alert('Please provide your digital signature.');
    return;
  }

  // Collect all form data
  const formData = {
    // Identity
    full_name: document.getElementById('fullName').value.trim(),
    document: document.getElementById('customerDocument').value.trim(),
    phone: document.getElementById('customerPhone').value.trim(),

    // Order confirmation
    receive_date: document.getElementById('receiveDate').value,

    // Return reason
    reason: document.getElementById('returnReason').value,
    description: document.getElementById('returnDescription').value.trim(),

    // Problem details
    when_noticed: document.getElementById('whenNoticed').value,
    tried_resolve: document.getElementById('triedResolve').value,
    resolution_attempts: document.getElementById('resolutionAttempts').value.trim(),
    product_used: document.getElementById('productUsed').value,

    // Shipping
    address: {
      line1: document.getElementById('addressLine1').value.trim(),
      line2: document.getElementById('addressLine2').value.trim(),
      city: document.getElementById('city').value.trim(),
      state: document.getElementById('state').value.trim(),
      zip: document.getElementById('zipCode').value.trim(),
      country: document.getElementById('country').value.trim()
    },

    // Resolution
    resolution_type: document.getElementById('resolutionType').value,
    additional_comments: document.getElementById('additionalComments').value.trim(),

    // Signature
    signature: state.signature
  };

  // Show loading
  goToStep('loading');

  // Fake processing delay (more friction)
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    const order = state.selectedOrder;
    const timeSpent = Math.floor((Date.now() - state.startTime) / 1000);

    const response = await fetch('/api/returns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        store_id: order.store_id,
        shopify_order_id: order.shopify_order_id,
        shopify_order_number: order.order_number,
        order_date: order.order_date,
        order_total: order.total,
        order_currency: order.currency,
        customer_email: state.customerEmail,
        customer_name: formData.full_name,
        customer_phone: formData.phone,
        customer_document: formData.document,
        form_data: formData,
        attachments: Object.values(state.uploads).filter(Boolean),
        time_spent_seconds: timeSpent
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit return request');
    }

    // Store return ID for PDF generation
    state.returnId = data.return_id;

    // Show success
    document.getElementById('referenceNumber').textContent = data.return_id.substring(0, 8).toUpperCase();
    goToStep('success');

  } catch (error) {
    console.error('Submit error:', error);
    alert('An error occurred. Please try again.');
    goToStep(9);
  }
}

// ===========================================
// PDF Generation
// ===========================================

async function downloadPDF() {
  try {
    const button = document.getElementById('downloadPdfBtn');
    button.disabled = true;
    button.textContent = 'Gerando recibo...';

    const refNumber = state.returnId.substring(0, 8).toUpperCase();

    // Open the PDF generation URL in a new window
    const pdfUrl = `/api/returns/generate-pdf?return_id=${state.returnId}&customer_email=${encodeURIComponent(state.customerEmail)}`;
    const printWindow = window.open(pdfUrl, '_blank');

    if (!printWindow) {
      alert('Por favor, permita pop-ups para baixar o recibo. Depois clique no botão novamente.');
    } else {
      // Show instructions
      setTimeout(() => {
        alert('Recibo gerado com sucesso!\n\nUma nova aba foi aberta. Para salvar como PDF:\n\n• Windows/Linux: Pressione Ctrl+P\n• Mac: Pressione Cmd+P\n• Ou use o menu: Arquivo > Imprimir\n\nNa janela de impressão, selecione "Salvar como PDF" como destino.');
      }, 500);
    }

    button.disabled = false;
    button.textContent = 'Download Proof of Request (PDF)';

  } catch (error) {
    console.error('PDF generation error:', error);
    alert('Falha ao gerar o recibo. Entre em contato com o suporte informando seu número de referência.');
    const button = document.getElementById('downloadPdfBtn');
    button.disabled = false;
    button.textContent = 'Download Proof of Request (PDF)';
  }
}

// ===========================================
// Terms Scroll Check
// ===========================================

function initTermsScroll() {
  const termsBox = document.getElementById('termsBox');
  const checkboxes = document.querySelectorAll('#step-9 input[type="checkbox"]');
  
  // Initially disable checkboxes
  checkboxes.forEach(cb => cb.disabled = true);
  
  termsBox.addEventListener('scroll', () => {
    const isAtBottom = termsBox.scrollHeight - termsBox.scrollTop <= termsBox.clientHeight + 20;
    if (isAtBottom) {
      checkboxes.forEach(cb => cb.disabled = false);
    }
  });
}

// ===========================================
// Initialize
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
  initUploadZones();
  initCharCounter();
  initSignaturePad();
  initTermsScroll();
  
  // Set initial step
  goToStep(0);
});
