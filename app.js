document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const navLinks = document.querySelectorAll('.nav-links li');
  const views = document.querySelectorAll('.view');
  const themeToggle = document.getElementById('darkModeToggle');
  const docTypeRadios = document.querySelectorAll('input[name="docType"]');
  const docTitle = document.getElementById('doc-title');
  const printHeaderTitle = document.getElementById('print-header-title');

  const searchInput = document.getElementById('product-search');
  const searchDropdown = document.getElementById('search-dropdown');
  const itemPriceInput = document.getElementById('item-price');
  const itemQtyInput = document.getElementById('item-qty');
  const addItemBtn = document.getElementById('add-item-btn');
  const itemsList = document.getElementById('items-list');
  const grandTotalEl = document.getElementById('grand-total');

  const printBtn = document.getElementById('print-btn');
  const clearBtn = document.getElementById('clear-btn');
  const docDate = document.getElementById('doc-date');

  const addProductForm = document.getElementById('add-product-form');
  const customProductsList = document.getElementById('custom-products-list');

  const toastEl = document.getElementById('toast');

  // ==========================================
  // CONFIGURATION: PASTE YOUR GOOGLE SCRIPT URL HERE
  // ==========================================
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjY5mqXjfA-UZttxiiKs3k0oyf5oMLx0zA9yt2lHD7_6ZKsxmWkGvIjhx87jqSKsNQ/exec";

  // State
  let productsData = [];
  let customProducts = JSON.parse(localStorage.getItem('smartbill_custom_products') || '[]');
  let currentBillItems = [];
  let selectedProduct = null;

  // Initialize
  init();

  async function init() {
    // Set today's date
    docDate.valueAsDate = new Date();

    // Load local storage theme
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggle.checked = true;
    }

    try {
      const response = await fetch('products.json');
      if (response.ok) {
        const data = await response.json();
        productsData = data.products || [];
      } else {
        showToast('Failed to load products.json. Check server.');
      }
    } catch (err) {
      console.warn('Could not fetch products.json, likely due to CORS if opening index.html directly without server. Please use Live Server.');
      showToast('Error loading products. Ensure you are running a local server.');
    }

    renderCustomProducts();
    setupEventListeners();
  }

  function getAllProducts() {
    return [...customProducts, ...productsData];
  }

  function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        navLinks.forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const targetId = e.currentTarget.getAttribute('data-target');
        views.forEach(v => {
          v.classList.remove('active');
          if (v.id === targetId) v.classList.add('active');
        });
      });
    });

    // Theme Toggle
    themeToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      }
    });

    // Document Type Toggle
    docTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const type = e.target.value;
        docTitle.textContent = type;
        if (printHeaderTitle) {
          printHeaderTitle.textContent = type.toUpperCase();
        }
      });
    });

    // Search functionality
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      selectedProduct = null; // reset selection

      if (!query) {
        searchDropdown.classList.add('hidden');
        return;
      }

      const allProds = getAllProducts();
      const filtered = allProds.filter(p => p.name.toLowerCase().includes(query)).slice(0, 10);

      renderDropdown(filtered);
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.classList.add('hidden');
      }
    });

    // Add Item to Bill
    addItemBtn.addEventListener('click', () => {
      const name = searchInput.value.trim();
      const price = parseFloat(itemPriceInput.value);
      const qty = parseInt(itemQtyInput.value);

      if (!name || isNaN(price) || isNaN(qty) || qty <= 0) {
        showToast('Please enter valid product, price, and quantity.');
        return;
      }

      currentBillItems.push({
        id: Date.now(),
        name,
        price,
        qty,
        total: price * qty
      });

      renderBillItems();

      // Reset inputs
      searchInput.value = '';
      itemPriceInput.value = '';
      itemQtyInput.value = '1';
      selectedProduct = null;
      searchInput.focus();
    });

    // Clear Bill
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the entire form?')) {
        currentBillItems = [];
        renderBillItems();
        document.getElementById('customer-name').value = '';
        document.getElementById('customer-address').value = '';
        document.getElementById('customer-phone').value = '';
        docDate.valueAsDate = new Date();
      }
    });

    // Print & Save to Cloud
    printBtn.addEventListener('click', async () => {
      if (currentBillItems.length === 0) {
        showToast('Please add at least one item before saving.');
        return;
      }

      const originalText = printBtn.textContent;

      // If URL is set, try to save to Google Sheets first
      if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== "YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE") {
        printBtn.textContent = 'Saving...';
        printBtn.disabled = true;

        const payload = {
          date: docDate.value,
          customer: document.getElementById('customer-name').value || "Walk-in Customer",
          docType: document.querySelector('input[name="docType"]:checked').value,
          total: currentBillItems.reduce((sum, item) => sum + item.total, 0),
          items: currentBillItems
        };

        try {
          // Google Apps script requires mode: 'no-cors' sometimes if not configured correctly, 
          // but we want to know if it succeeded. For standard web apps, a simple POST works 
          // if CORS is enabled in the Apps script (which we handled via doOptions).
          await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            }
          });
          showToast('Saved to Cloud successfully!');
        } catch (error) {
          console.error('Error saving to cloud:', error);
          showToast('Saved locally, but failed to sync to cloud.');
        } finally {
          printBtn.textContent = originalText;
          printBtn.disabled = false;
        }
      }

      window.print();
    });

    // Add Custom Product
    addProductForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('new-prod-name').value.trim();
      const category = document.getElementById('new-prod-category').value.trim();
      const price = parseFloat(document.getElementById('new-prod-price').value);

      if (!name || isNaN(price)) return;

      const newProduct = { name, category, price };
      customProducts.unshift(newProduct);
      localStorage.setItem('smartbill_custom_products', JSON.stringify(customProducts));

      renderCustomProducts();
      showToast('Product added successfully!');
      addProductForm.reset();
    });
  }

  function renderDropdown(products) {
    if (products.length === 0) {
      searchDropdown.innerHTML = '<div class="dropdown-item" style="color: var(--text-muted)">No products found</div>';
      searchDropdown.classList.remove('hidden');
      return;
    }

    searchDropdown.innerHTML = '';
    products.forEach(p => {
      const div = document.createElement('div');
      div.className = 'dropdown-item';
      div.innerHTML = `
        <span class="item-name">${p.name}</span>
        <span class="item-price">₹${p.price}</span>
      `;
      div.addEventListener('click', () => {
        searchInput.value = p.name;
        itemPriceInput.value = p.price;
        selectedProduct = p;
        searchDropdown.classList.add('hidden');
        itemQtyInput.focus();
      });
      searchDropdown.appendChild(div);
    });

    searchDropdown.classList.remove('hidden');
  }

  function renderBillItems() {
    itemsList.innerHTML = '';
    let grandTotal = 0;

    currentBillItems.forEach((item, index) => {
      grandTotal += item.total;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td>₹${item.price.toFixed(2)}</td>
        <td>${item.qty}</td>
        <td>₹${item.total.toFixed(2)}</td>
        <td class="no-print">
          <button class="icon-btn delete-item-btn" data-id="${item.id}" title="Remove Item">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      `;
      itemsList.appendChild(tr);
    });

    grandTotalEl.textContent = `₹${grandTotal.toFixed(2)}`;

    // Delete item listener
    document.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        currentBillItems = currentBillItems.filter(i => i.id !== id);
        renderBillItems();
      });
    });
  }

  function renderCustomProducts() {
    customProductsList.innerHTML = '';

    if (customProducts.length === 0) {
      customProductsList.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding: 20px;">No custom products added yet.</td></tr>';
      return;
    }

    customProducts.forEach((p, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${p.category || '-'}</td>
        <td>₹${p.price.toFixed(2)}</td>
        <td>
          <button class="icon-btn delete-product-btn" data-index="${index}" title="Delete Custom Product">
             <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      `;
      customProductsList.appendChild(tr);
    });

    // Delete custom product
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm('Delete this product?')) {
          const index = parseInt(e.currentTarget.getAttribute('data-index'));
          customProducts.splice(index, 1);
          localStorage.setItem('smartbill_custom_products', JSON.stringify(customProducts));
          renderCustomProducts();
        }
      });
    });
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    setTimeout(() => {
      toastEl.classList.add('hidden');
    }, 3000);
  }
});
