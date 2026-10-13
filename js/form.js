/**
 * Oliesmeernippel — Quote & Bestelformulier Handler
 * GitHub Pages + FormSubmit AJAX Integration
 * De Meester Industries
 */

(function () {
  'use strict';

  const form = document.getElementById('quoteForm');
  const submitBtn = document.getElementById('quoteSubmitBtn');
  const statusOverlay = document.getElementById('formStatusOverlay');
  const summaryBox = document.getElementById('liveConfigText');
  const orderTypeSelect = document.getElementById('orderType');
  const threadSelect = document.getElementById('thread');
  const qtySelect = document.getElementById('qty');
  const materialSelect = document.getElementById('material');
  const capQtySelect = document.getElementById('capQty');
  const threadRemarksField = document.getElementById('threadRemarksField');
  const threadRemarksInput = document.getElementById('threadRemarks');
  const nippelFields = document.getElementById('nippelFields');
  const capFields = document.getElementById('capFields');

  if (!form) return;

  // 1. Toggle fields based on order type
  function updateOrderType(type) {
    if (type === 'caps') {
      nippelFields.style.display = 'none';
      capFields.style.display = 'block';
    } else {
      nippelFields.style.display = 'block';
      capFields.style.display = 'none';
    }
    updateSummary();
  }

  // 2. Toggle custom thread remarks
  function updateThreadRemarks(value) {
    const isOther = (value === 'Anders / onbekend');
    if (threadRemarksField) {
      threadRemarksField.style.display = isOther ? 'block' : 'none';
      if (threadRemarksInput) {
        threadRemarksInput.required = isOther;
        if (!isOther) threadRemarksInput.value = '';
      }
    }
    updateSummary();
  }

  // 3. Live configuration summary
  function updateSummary() {
    if (!summaryBox) return;

    const orderType = orderTypeSelect ? orderTypeSelect.value : 'nippel';
    let text = '';

    if (orderType === 'caps') {
      const capQty = capQtySelect ? capQtySelect.value : '50 stuks';
      text = `<strong>${capQty}</strong> losse afsluitdoppen (metaaldetecteerbaar polyamide)`;
    } else {
      const qty = qtySelect ? qtySelect.value : '50 stuks';
      const thread = threadSelect ? threadSelect.value : 'M6 x 1';
      const material = materialSelect ? materialSelect.value : 'RVS304';
      text = `<strong>${qty}</strong> Oliesmeernippels (maat: <strong>${thread}</strong>, materiaal: <strong>${material}</strong>), compleet geleverd inclusief metaaldetecteerbare dop.`;
    }

    summaryBox.innerHTML = text;
  }

  // Attach change listeners for live configuration update
  if (orderTypeSelect) {
    orderTypeSelect.addEventListener('change', (e) => updateOrderType(e.target.value));
  }
  if (threadSelect) {
    threadSelect.addEventListener('change', (e) => updateThreadRemarks(e.target.value));
  }
  if (qtySelect) qtySelect.addEventListener('change', updateSummary);
  if (materialSelect) materialSelect.addEventListener('change', updateSummary);
  if (capQtySelect) capQtySelect.addEventListener('change', updateSummary);

  // Initialize summary on load
  updateSummary();

  // 4. Form Submission via AJAX (FormSubmit JSON API)
  form.addEventListener('submit', function (event) {
    event.preventDefault();

    // Check honeypot spam field
    const honey = form.querySelector('input[name="_honey"]');
    if (honey && honey.value.trim() !== '') {
      console.warn('Bot detected via honeypot.');
      return;
    }

    // Set loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      Bezig met versturen…
    `;

    // Collect form data
    const formData = new FormData(form);
    const dataObj = {};
    formData.forEach((value, key) => {
      // Don't send empty optional fields
      if (value !== '') {
        dataObj[key] = value;
      }
    });

    // FormSubmit AJAX endpoint
    const endpoint = 'https://formsubmit.co/ajax/demeestersolutions@gmail.com';

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(dataObj)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Netwerkfout: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Success feedback
        showSuccessState(dataObj);
      })
      .catch(error => {
        console.error('AJAX submission failed, attempting native fallback:', error);
        // Fallback: If fetch is blocked by strict CSP or extension, submit standard form
        form.removeEventListener('submit', arguments.callee);
        form.submit();
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      });
  });

  function showSuccessState(data) {
    // Hide form, show confirmation overlay
    form.style.display = 'none';
    if (statusOverlay) {
      statusOverlay.classList.add('active');
      const emailElem = document.getElementById('confirmedEmail');
      if (emailElem && data['E-mailadres aanvrager']) {
        emailElem.textContent = data['E-mailadres aanvrager'];
      }
    }
  }

  // Reset form button to allow sending another quote
  const resetBtn = document.getElementById('btnNewQuote');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      updateOrderType('nippel');
      updateThreadRemarks('M6 x 1');
      if (statusOverlay) statusOverlay.classList.remove('active');
      form.style.display = 'block';
    });
  }

  // Inline CSS for the loading spinner
  const style = document.createElement('style');
  style.textContent = `
    .spin-icon {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

})();
