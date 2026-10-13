/**
 * Oliesmeernippel — Multi-Article Quote & Bestelformulier Handler
 * GitHub Pages + FormSubmit AJAX Integration
 * De Meester Industries
 */

(function () {
  'use strict';

  const form = document.getElementById('quoteForm');
  const articlesList = document.getElementById('articlesList');
  const btnAddArticle = document.getElementById('btnAddArticle');
  const submitBtn = document.getElementById('quoteSubmitBtn');
  const statusOverlay = document.getElementById('formStatusOverlay');
  const summaryBox = document.getElementById('liveConfigText');

  if (!form || !articlesList) return;

  let articleCounter = 0;

  // HTML template generator for a single article row
  function createArticleHTML(idNum) {
    return `
      <div class="article-item" id="articleRow_${idNum}" data-article-id="${idNum}">
        <div class="article-item-header">
          <span class="article-badge" id="badge_${idNum}">Artikel ${idNum}</span>
          <button type="button" class="btn-remove-article" data-remove-id="${idNum}" title="Verwijder dit artikel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Verwijder
          </button>
        </div>

        <label for="orderType_${idNum}">Wat wilt u bestellen?</label>
        <select id="orderType_${idNum}" class="item-order-type" name="Artikel_${idNum}_Type">
          <option value="nippel">Oliesmeernippel (inclusief afsluitdop)</option>
          <option value="caps">Losse afsluitdoppen (nabestelling)</option>
        </select>

        <!-- Nipple Fields -->
        <div id="nippelFields_${idNum}" class="item-nippel-fields">
          <div class="form-row">
            <div>
              <label for="qty_${idNum}">Gewenste verpakking</label>
              <select id="qty_${idNum}" class="item-qty" name="Artikel_${idNum}_Verpakking">
                <option value="10 stuks">10 stuks</option>
                <option value="50 stuks" selected>50 stuks</option>
                <option value="100 stuks">100 stuks</option>
                <option value="500 stuks">500 stuks</option>
                <option value="1000 stuks">1000 stuks</option>
              </select>
            </div>

            <div>
              <label for="thread_${idNum}">Draadmaat</label>
              <select id="thread_${idNum}" class="item-thread" name="Artikel_${idNum}_Draadmaat">
                <option value="M5 x 0,8">M5 x 0,8</option>
                <option value="M6 x 1" selected>M6 x 1</option>
                <option value="M8 x 1">M8 x 1</option>
                <option value="M8 x 1,25">M8 x 1,25</option>
                <option value="M10 x 1,5">M10 x 1,5</option>
                <option value="Anders / onbekend">Anders / onbekend</option>
              </select>
            </div>
          </div>

          <!-- Conditional custom thread remarks for nipple -->
          <div id="threadRemarksField_${idNum}" class="item-thread-remarks-field" style="display:none;">
            <label for="threadRemarks_${idNum}">Gewenste speciale maat of specificatie</label>
            <textarea id="threadRemarks_${idNum}" class="item-thread-remarks" name="Artikel_${idNum}_Opmerking_Draad" rows="2" placeholder="Geef hier de gewenste maat, spoed of machine-type door…"></textarea>
          </div>

          <label for="material_${idNum}">Materiaaluitvoering</label>
          <select id="material_${idNum}" class="item-material" name="Artikel_${idNum}_Materiaal">
            <option value="RVS304" selected>RVS304 (Standaard industrieel roestvast staal)</option>
            <option value="RVS316">RVS316 (Cleanroom, chemisch & maritiem)</option>
          </select>
        </div>

        <!-- Cap Only Fields -->
        <div id="capFields_${idNum}" class="item-cap-fields" style="display:none;">
          <div class="form-row">
            <div>
              <label for="capQty_${idNum}">Aantal losse afsluitdoppen</label>
              <select id="capQty_${idNum}" class="item-cap-qty" name="Artikel_${idNum}_Aantal_Doppen">
                <option value="50 stuks" selected>50 stuks</option>
                <option value="100 stuks">100 stuks</option>
                <option value="150 stuks">150 stuks</option>
                <option value="200 stuks">200 stuks</option>
                <option value="500 stuks">500 stuks</option>
              </select>
            </div>

            <div>
              <label for="capThread_${idNum}">Voor welke maat oliesmeernippel?</label>
              <select id="capThread_${idNum}" class="item-cap-thread" name="Artikel_${idNum}_Dop_Maat_Nippel">
                <option value="M5 x 0,8">M5 x 0,8</option>
                <option value="M6 x 1" selected>M6 x 1</option>
                <option value="M8 x 1">M8 x 1</option>
                <option value="M8 x 1,25">M8 x 1,25</option>
                <option value="M10 x 1,5">M10 x 1,5</option>
                <option value="Anders / onbekend">Anders / onbekend</option>
              </select>
            </div>
          </div>

          <!-- Conditional custom thread remarks for caps -->
          <div id="capThreadRemarksField_${idNum}" class="item-cap-thread-remarks-field" style="display:none;">
            <label for="capThreadRemarks_${idNum}">Gewenste afwijkende maat of specificatie van de nippel</label>
            <textarea id="capThreadRemarks_${idNum}" class="item-cap-thread-remarks" name="Artikel_${idNum}_Opmerking_Dop_Maat" rows="2" placeholder="Geef hier de gewenste maat of toepassing van de nippel door…"></textarea>
          </div>
        </div>
      </div>
    `;
  }

  // Add a new article to the list
  function addArticle() {
    articleCounter++;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = createArticleHTML(articleCounter).trim();
    const newRow = tempDiv.firstChild;
    articlesList.appendChild(newRow);

    // Setup event listeners on this row
    setupRowListeners(newRow, articleCounter);

    // Update numbering & removal visibility
    updateArticlesIndices();
    updateSummary();
  }

  // Setup listeners for dropdowns within a row
  function setupRowListeners(row, idNum) {
    const orderTypeSelect = row.querySelector('.item-order-type');
    const nippelFields = row.querySelector('.item-nippel-fields');
    const capFields = row.querySelector('.item-cap-fields');
    const threadSelect = row.querySelector('.item-thread');
    const threadRemarksField = row.querySelector('.item-thread-remarks-field');
    const threadRemarksInput = row.querySelector('.item-thread-remarks');
    const capThreadSelect = row.querySelector('.item-cap-thread');
    const capThreadRemarksField = row.querySelector('.item-cap-thread-remarks-field');
    const capThreadRemarksInput = row.querySelector('.item-cap-thread-remarks');
    const removeBtn = row.querySelector('.btn-remove-article');

    // Toggle Order Type
    orderTypeSelect.addEventListener('change', function () {
      if (this.value === 'caps') {
        nippelFields.style.display = 'none';
        capFields.style.display = 'block';
      } else {
        nippelFields.style.display = 'block';
        capFields.style.display = 'none';
      }
      updateSummary();
    });

    // Toggle Nipple Thread Remarks
    threadSelect.addEventListener('change', function () {
      const isOther = (this.value === 'Anders / onbekend');
      threadRemarksField.style.display = isOther ? 'block' : 'none';
      threadRemarksInput.required = isOther;
      if (!isOther) threadRemarksInput.value = '';
      updateSummary();
    });

    // Toggle Cap Thread Remarks
    capThreadSelect.addEventListener('change', function () {
      const isOther = (this.value === 'Anders / onbekend');
      capThreadRemarksField.style.display = isOther ? 'block' : 'none';
      capThreadRemarksInput.required = isOther;
      if (!isOther) capThreadRemarksInput.value = '';
      updateSummary();
    });

    // General change updates summary
    row.querySelectorAll('select, textarea').forEach(el => {
      el.addEventListener('change', updateSummary);
    });

    // Remove article
    removeBtn.addEventListener('click', function () {
      row.remove();
      updateArticlesIndices();
      updateSummary();
    });
  }

  // Re-index remaining articles when adding or removing
  function updateArticlesIndices() {
    const rows = articlesList.querySelectorAll('.article-item');
    rows.forEach((row, idx) => {
      const num = idx + 1;
      const badge = row.querySelector('.article-badge');
      if (badge) badge.textContent = `Artikel ${num}`;

      // Only show remove button if more than 1 article exists
      const removeBtn = row.querySelector('.btn-remove-article');
      if (removeBtn) {
        removeBtn.style.display = (rows.length > 1) ? 'inline-flex' : 'none';
      }
    });
  }

  // Update live configuration overview box
  function updateSummary() {
    if (!summaryBox) return;

    const rows = articlesList.querySelectorAll('.article-item');
    if (rows.length === 0) {
      summaryBox.innerHTML = '<em>Nog geen artikelen geselecteerd.</em>';
      return;
    }

    let listHTML = '<ul class="live-config-list">';

    rows.forEach((row, idx) => {
      const num = idx + 1;
      const orderType = row.querySelector('.item-order-type').value;

      if (orderType === 'caps') {
        const capQty = row.querySelector('.item-cap-qty').value;
        const capThread = row.querySelector('.item-cap-thread').value;
        listHTML += `
          <li>
            <span class="item-bullet">${num}.</span>
            <span><strong>${capQty}</strong> losse afsluitdoppen voor oliesmeernippel maat <strong>${capThread}</strong> (metaaldetecteerbaar polyamide)</span>
          </li>
        `;
      } else {
        const qty = row.querySelector('.item-qty').value;
        const thread = row.querySelector('.item-thread').value;
        const material = row.querySelector('.item-material').value;
        listHTML += `
          <li>
            <span class="item-bullet">${num}.</span>
            <span><strong>${qty}</strong> Oliesmeernippels — Maat: <strong>${thread}</strong>, Materiaal: <strong>${material}</strong> (incl. dop)</span>
          </li>
        `;
      }
    });

    listHTML += '</ul>';
    summaryBox.innerHTML = listHTML;
  }

  // Event listener for "+ Extra artikel toevoegen"
  if (btnAddArticle) {
    btnAddArticle.addEventListener('click', function () {
      addArticle();
    });
  }

  // Initialize with 1 default article
  addArticle();

  // Form Submission via AJAX (FormSubmit JSON API)
  form.addEventListener('submit', function (event) {
    event.preventDefault();

    // Check honeypot
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

    // Build comprehensive structured payload
    const dataObj = {};
    const rows = articlesList.querySelectorAll('.article-item');
    dataObj['Aantal verschillende artikelen'] = rows.length;

    let summaryText = '';

    rows.forEach((row, idx) => {
      const num = idx + 1;
      const orderType = row.querySelector('.item-order-type').value;

      if (orderType === 'caps') {
        const capQty = row.querySelector('.item-cap-qty').value;
        const capThread = row.querySelector('.item-cap-thread').value;
        const remarks = row.querySelector('.item-cap-thread-remarks')?.value || '';
        const itemLine = `${capQty} Losse afsluitdoppen - Maat nippel: ${capThread}${remarks ? ' (' + remarks + ')' : ''}`;
        
        dataObj[`Artikel ${num}`] = itemLine;
        summaryText += `${num}. ${itemLine}\n`;
      } else {
        const qty = row.querySelector('.item-qty').value;
        const thread = row.querySelector('.item-thread').value;
        const material = row.querySelector('.item-material').value;
        const remarks = row.querySelector('.item-thread-remarks')?.value || '';
        const itemLine = `${qty} Oliesmeernippel - Maat: ${thread} - Materiaal: ${material}${remarks ? ' (' + remarks + ')' : ''}`;

        dataObj[`Artikel ${num}`] = itemLine;
        summaryText += `${num}. ${itemLine}\n`;
      }
    });

    dataObj['Offerte Overzicht'] = summaryText.trim();

    // Contact info
    const company = document.getElementById('company')?.value || '';
    if (company) dataObj['Bedrijfsnaam'] = company;

    const email = document.getElementById('email')?.value || '';
    dataObj['E-mailadres aanvrager'] = email;

    const notes = document.getElementById('notes')?.value || '';
    if (notes) dataObj['Aanvullende opmerkingen'] = notes;

    dataObj['_subject'] = `Nieuwe offerteaanvraag (${rows.length} artikelen) — Oliesmeernippel`;

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
        showSuccessState(dataObj);
      })
      .catch(error => {
        console.error('AJAX submission failed, attempting native fallback:', error);
        form.removeEventListener('submit', arguments.callee);
        form.submit();
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      });
  });

  function showSuccessState(data) {
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
      articlesList.innerHTML = '';
      articleCounter = 0;
      addArticle();
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
