const token = localStorage.getItem('token');

function showMessage(text, type) {
  const box = document.getElementById('message');
  if (!box) return;
  box.textContent = text;
  box.className = `message ${type}`;
  setTimeout(() => { box.className = 'message'; }, 3000);
}

function authHeaders(isFormData = false) {
  const headers = { Authorization: `Bearer ${token}` };
  if (!isFormData) headers['Content-Type'] = 'application/json';
  return headers;
}

// ---------------- অ্যাডমিন কিনা যাচাই করা ----------------
async function checkAdminAccess() {
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }

  try {
    const res = await fetch('/api/auth/me', { headers: authHeaders() });
    const data = await res.json();

    if (!data.success || !data.user.is_admin) {
      document.getElementById('accessDenied').style.display = 'block';
      return false;
    }

    document.getElementById('adminContent').style.display = 'block';
    return true;
  } catch (err) {
    window.location.href = 'login.html';
    return false;
  }
}

// ---------------- তারিখ অনুযায়ী বিক্রি লোড করা ----------------
async function loadSalesByDate() {
  const date = document.getElementById('salesDate').value;
  if (!date) return;

  const res = await fetch(`/api/admin/sales-by-date?date=${date}`, { headers: authHeaders() });
  const data = await res.json();

  if (data.success) {
    document.getElementById('salesAmount').textContent = `৳${data.totalSales}`;
    document.getElementById('salesOrderCount').textContent = data.orderCount;
  }
}

document.getElementById('salesDate').addEventListener('change', loadSalesByDate);

// আজকের তারিখ ডিফল্ট হিসেবে সেট করে সেই দিনের বিক্রি দেখানো হচ্ছে
// (toISOString() UTC ব্যবহার করে বলে local timezone এ ভুল তারিখ দেখাতে পারে, তাই local date নিজে বানানো হচ্ছে)
function setTodayAsDefaultSalesDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  document.getElementById('salesDate').value = `${year}-${month}-${day}`;
  loadSalesByDate();
}

// ---------------- বইয়ের তথ্য তালিকা (নাম, ক্যাটাগরি, স্টক) ----------------
async function loadBookInfoList() {
  const res = await fetch('/api/books');
  const data = await res.json();
  const tbody = document.getElementById('bookInfoTableBody');
  tbody.innerHTML = '';

  if (data.success) {
    data.books.forEach((book) => {
      tbody.innerHTML += `
        <tr>
          <td>${escapeHtml(book.title)}</td>
          <td>${escapeHtml(book.category_name) || '—'}</td>
          <td>${book.stock}</td>
        </tr>
      `;
    });
  }
}

// ---------------- ড্যাশবোর্ড সামারি লোড করা ----------------
async function loadSummary() {
  const res = await fetch('/api/admin/summary', { headers: authHeaders() });
  const data = await res.json();
  if (data.success) {
    document.getElementById('totalUsers').textContent = data.summary.totalUsers;
    document.getElementById('totalBooks').textContent = data.summary.totalBooks;
    document.getElementById('totalOrders').textContent = data.summary.totalOrders;
  }
}

// ---------------- ক্যাটাগরি লোড করা ----------------
async function loadCategories() {
  const res = await fetch('/api/categories');
  const data = await res.json();

  const countRes = await fetch('/api/admin/category-counts', { headers: authHeaders() });
  const countData = await countRes.json();
  const countMap = {};
  if (countData.success) {
    countData.categories.forEach((c) => { countMap[c.id] = c.book_count; });
  }

  const select = document.getElementById('categoryId');
  const tbody = document.getElementById('categoryTableBody');
  select.innerHTML = '<option value="">-- ক্যাটাগরি বাছাই করুন --</option>';
  tbody.innerHTML = '';

  if (data.success) {
    data.categories.forEach((cat) => {
      select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
      tbody.innerHTML += `
        <tr>
          <td>${cat.name}</td>
          <td>${countMap[cat.id] !== undefined ? countMap[cat.id] : 0}</td>
          <td><button class="btn small danger" onclick="deleteCategory(${cat.id})">ডিলিট</button></td>
        </tr>
      `;
    });
  }
}

async function deleteCategory(id) {
  if (!confirm('আপনি কি নিশ্চিত এই ক্যাটাগরি মুছে ফেলতে চান?')) return;
  const res = await fetch(`/api/categories/${id}`, { method: 'DELETE', headers: authHeaders() });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');
  loadCategories();
}

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('categoryName').value.trim();

  const res = await fetch('/api/categories', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name })
  });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');

  if (data.success) {
    document.getElementById('categoryName').value = '';
    loadCategories();
  }
});

// ---------------- বই লোড করা ----------------
let cachedBooks = []; // এখানে বইয়ের ডাটা রাখা হচ্ছে যাতে এডিট বাটনে ক্লিক করলে খুঁজে পাওয়া যায়

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

async function loadBooks() {
  const res = await fetch('/api/books');
  const data = await res.json();
  const tbody = document.getElementById('bookTableBody');
  tbody.innerHTML = '';

  if (data.success) {
    cachedBooks = data.books; // ডাটা মনে রাখা হলো, পরে editBookById() এ ব্যবহার হবে

    data.books.forEach((book) => {
      const coverHtml = book.cover_image
        ? `<img src="${book.cover_image}" class="cover-thumb" />`
        : '—';
      tbody.innerHTML += `
        <tr>
          <td>${coverHtml}</td>
          <td>${escapeHtml(book.title)}</td>
          <td>${escapeHtml(book.author)}</td>
          <td>${escapeHtml(book.category_name) || '—'}</td>
          <td>৳${book.price}</td>
          <td>${book.stock}</td>
          <td>
            <button class="btn small" onclick="editBookById(${book.id})">এডিট</button>
            <button class="btn small danger" onclick="deleteBook(${book.id})">ডিলিট</button>
          </td>
        </tr>
      `;
    });
  }
}

// বাটনের নাম্বার (id) দিয়ে cachedBooks থেকে বইটা খুঁজে বের করে ফর্মে বসানো হচ্ছে
function editBookById(id) {
  const book = cachedBooks.find((b) => b.id === id);
  if (!book) return;
  editBook(book);
}

function editBook(book) {
  document.getElementById('bookFormTitle').textContent = 'বই এডিট করুন';
  document.getElementById('bookId').value = book.id;
  document.getElementById('title').value = book.title;
  document.getElementById('author').value = book.author;
  document.getElementById('categoryId').value = book.category_id || '';
  document.getElementById('price').value = book.price;
  document.getElementById('stock').value = book.stock;
  document.getElementById('description').value = book.description || '';
  document.getElementById('isFeatured').checked = !!book.is_featured;
  document.getElementById('currentPdfNote').textContent = book.pdf_file
    ? '✓ ইতিমধ্যে একটা PDF আপলোড করা আছে (নতুন ফাইল দিলে সেটা বদলে যাবে)'
    : 'এখনো কোনো PDF আপলোড করা হয়নি।';
  document.getElementById('bookSubmitBtn').textContent = 'আপডেট করুন';
  document.getElementById('cancelEditBtn').style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('cancelEditBtn').addEventListener('click', () => {
  resetBookForm();
});

function resetBookForm() {
  document.getElementById('bookForm').reset();
  document.getElementById('bookId').value = '';
  document.getElementById('bookFormTitle').textContent = 'নতুন বই যোগ করুন';
  document.getElementById('bookSubmitBtn').textContent = 'বই যোগ করুন';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('currentPdfNote').textContent = '';
}

async function deleteBook(id) {
  if (!confirm('আপনি কি নিশ্চিত এই বই মুছে ফেলতে চান?')) return;
  const res = await fetch(`/api/books/${id}`, { method: 'DELETE', headers: authHeaders() });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');
  loadBooks();
  loadBookInfoList();
}

document.getElementById('bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const bookId = document.getElementById('bookId').value;
  const formData = new FormData();
  formData.append('title', document.getElementById('title').value.trim());
  formData.append('author', document.getElementById('author').value.trim());
  formData.append('categoryId', document.getElementById('categoryId').value);
  formData.append('price', document.getElementById('price').value);
  formData.append('stock', document.getElementById('stock').value);
  formData.append('description', document.getElementById('description').value.trim());
  formData.append('isFeatured', document.getElementById('isFeatured').checked);

  const fileInput = document.getElementById('coverImage');
  if (fileInput.files[0]) {
    formData.append('coverImage', fileInput.files[0]);
  }

  const pdfInput = document.getElementById('pdfFile');
  if (pdfInput.files[0]) {
    formData.append('pdfFile', pdfInput.files[0]);
  }

  const url = bookId ? `/api/books/${bookId}` : '/api/books';
  const method = bookId ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` }, // FormData হলে Content-Type নিজে সেট করা যাবে না
    body: formData
  });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');

  if (data.success) {
    resetBookForm();
    loadBooks();
    loadSummary();
    loadBookInfoList();
  }
});

// ---------------- লগআউট ----------------
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('token');
  window.location.href = 'login.html';
});

// ---------------- ট্যাব সুইচ করা ----------------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ---------------- অর্ডার তালিকা লোড করা ----------------
async function loadOrders() {
  const res = await fetch('/api/admin/orders', { headers: authHeaders() });
  const data = await res.json();
  const tbody = document.getElementById('orderTableBody');
  tbody.innerHTML = '';

  if (data.success) {
    data.orders.forEach((order) => {
      const itemsHtml = order.items
        .map((item) => `${escapeHtml(item.title)} (x${item.quantity})`)
        .join(', ');

      const paymentBadge = order.payment_status === 'paid'
        ? '<span class="status-badge status-delivered">Paid</span>'
        : order.payment_status === 'failed'
          ? '<span class="status-badge status-cancelled">Failed</span>'
          : '<span class="status-badge status-pending">Pending</span>';

      tbody.innerHTML += `
        <tr>
          <td><input type="checkbox" class="order-checkbox" value="${order.id}" onchange="updateBulkSelectedCount()" /></td>
          <td><span class="order-id-link" onclick="viewOrderDetail(${order.id})">#${order.id}</span></td>
          <td>${escapeHtml(order.full_name)}<br><small>${escapeHtml(order.email)}</small></td>
          <td>${escapeHtml(order.contact_mobile || '—')}</td>
          <td>${escapeHtml(order.shipping_address || '—')}</td>
          <td class="order-items-list">${itemsHtml}</td>
          <td>৳${order.total_amount}</td>
          <td>
            ${escapeHtml(order.payment_method)}<br>
            ${paymentBadge}
            <br>
            <select class="status-select" onchange="updatePaymentStatus(${order.id}, this.value)">
              <option value="pending" ${order.payment_status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="paid" ${order.payment_status === 'paid' ? 'selected' : ''}>Paid</option>
              <option value="failed" ${order.payment_status === 'failed' ? 'selected' : ''}>Failed</option>
            </select>
          </td>
          <td>
            <span class="status-badge status-${order.order_status}">${order.order_status}</span>
            <br>
            <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)">
              <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="accepted" ${order.order_status === 'accepted' ? 'selected' : ''}>Accepted</option>
              <option value="shipped" ${order.order_status === 'shipped' ? 'selected' : ''}>Shipped</option>
              <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Delivered</option>
              <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
        </tr>
      `;
    });
  }

  updateBulkSelectedCount();
}

async function updateOrderStatus(orderId, orderStatus) {
  const res = await fetch(`/api/admin/orders/${orderId}/status`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ orderStatus })
  });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');
  loadOrders();
}

async function updatePaymentStatus(orderId, paymentStatus) {
  const res = await fetch(`/api/admin/orders/${orderId}/payment`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ paymentStatus })
  });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');
  loadOrders();
}

// ---------------- Bulk সিলেকশন ও Bulk Status Update ----------------
document.getElementById('selectAllOrders').addEventListener('change', (e) => {
  document.querySelectorAll('.order-checkbox').forEach((cb) => { cb.checked = e.target.checked; });
  updateBulkSelectedCount();
});

function updateBulkSelectedCount() {
  const count = document.querySelectorAll('.order-checkbox:checked').length;
  document.getElementById('bulkSelectedCount').textContent = `${count}টা সিলেক্ট করা আছে`;
}

document.getElementById('applyBulkStatusBtn').addEventListener('click', async () => {
  const selectedIds = Array.from(document.querySelectorAll('.order-checkbox:checked')).map((cb) => parseInt(cb.value));
  const orderStatus = document.getElementById('bulkStatusSelect').value;

  if (selectedIds.length === 0) {
    showMessage('অনুগ্রহ করে অন্তত একটা অর্ডার সিলেক্ট করুন।', 'error');
    return;
  }

  const res = await fetch('/api/admin/orders/bulk-status', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ orderIds: selectedIds, orderStatus })
  });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');
  document.getElementById('selectAllOrders').checked = false;
  loadOrders();
});

// ---------------- Order Detail Modal ----------------
let currentOrderDetail = null;

async function viewOrderDetail(orderId) {
  const res = await fetch(`/api/admin/orders/${orderId}`, { headers: authHeaders() });
  const data = await res.json();

  if (!data.success) {
    showMessage(data.message, 'error');
    return;
  }

  currentOrderDetail = data.order;
  const order = data.order;
  const date = new Date(order.created_at).toLocaleString('bn-BD');

  document.getElementById('orderDetailModalTitle').textContent = `অর্ডার #${order.id} এর বিস্তারিত`;
  document.getElementById('orderDetailModalBody').innerHTML = `
    <p><strong>কাস্টমার:</strong> ${escapeHtml(order.full_name)} (${escapeHtml(order.email)})</p>
    <p><strong>মোবাইল:</strong> ${escapeHtml(order.contact_mobile || '—')}</p>
    <p><strong>ঠিকানা:</strong> ${escapeHtml(order.shipping_address || '—')}</p>
    <p><strong>অর্ডারের তারিখ:</strong> ${date}</p>
    <hr style="margin: 12px 0; border: none; border-top: 1px solid #eee;" />
    <table>
      <thead><tr><th>বই</th><th>লেখক</th><th>পরিমাণ</th><th>দাম</th></tr></thead>
      <tbody>
        ${order.items.map((item) => `
          <tr>
            <td>${escapeHtml(item.title)}</td>
            <td>${escapeHtml(item.author)}</td>
            <td>${item.quantity}</td>
            <td>৳${item.price}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <hr style="margin: 12px 0; border: none; border-top: 1px solid #eee;" />
    <p><strong>মোট:</strong> ৳${order.total_amount}</p>
    <p><strong>পেমেন্ট:</strong> ${escapeHtml(order.payment_method)} (${order.payment_status})</p>
    ${order.transaction_id ? `<p><strong>Transaction ID:</strong> ${escapeHtml(order.transaction_id)}</p>` : ''}
    <p><strong>অর্ডার Status:</strong> <span class="status-badge status-${order.order_status}">${order.order_status}</span></p>
  `;

  document.getElementById('orderDetailModal').style.display = 'flex';
}

document.getElementById('closeOrderDetailModal').addEventListener('click', () => {
  document.getElementById('orderDetailModal').style.display = 'none';
});

document.getElementById('orderDetailModal').addEventListener('click', (e) => {
  if (e.target.id === 'orderDetailModal') {
    document.getElementById('orderDetailModal').style.display = 'none';
  }
});

// ---------------- Invoice প্রিন্ট করা ----------------
document.getElementById('printInvoiceBtn').addEventListener('click', () => {
  if (!currentOrderDetail) return;
  const order = currentOrderDetail;
  const date = new Date(order.created_at).toLocaleString('bn-BD');

  const invoiceHtml = `
    <html>
    <head>
      <title>Invoice #${order.id}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #222; }
        h1 { color: #764ba2; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f4f4f8; }
        .total-row { font-weight: bold; font-size: 15px; }
      </style>
    </head>
    <body>
      <h1>📚 Bookstore — Invoice</h1>
      <p><strong>Order ID:</strong> #${order.id}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Customer:</strong> ${order.full_name} (${order.email})</p>
      <p><strong>Mobile:</strong> ${order.contact_mobile || '—'}</p>
      <p><strong>Address:</strong> ${order.shipping_address || '—'}</p>
      <table>
        <thead><tr><th>Book</th><th>Author</th><th>Qty</th><th>Price</th></tr></thead>
        <tbody>
          ${order.items.map((item) => `
            <tr><td>${item.title}</td><td>${item.author}</td><td>${item.quantity}</td><td>৳${item.price}</td></tr>
          `).join('')}
        </tbody>
      </table>
      <p class="total-row" style="margin-top:14px;">Total: ৳${order.total_amount}</p>
      <p>Payment Method: ${order.payment_method} (${order.payment_status})</p>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(invoiceHtml);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
});

// ---------------- রিভিউ তালিকা লোড করা (ক্যাটাগরি ফিল্টার সহ) ----------------
function renderStarsAdmin(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) stars += i <= rating ? '★' : '☆';
  return stars;
}

async function loadReviewCategoryFilter() {
  const res = await fetch('/api/categories');
  const data = await res.json();
  const select = document.getElementById('reviewCategoryFilter');

  if (data.success) {
    data.categories.forEach((cat) => {
      select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
  }
}

async function loadAdminReviews() {
  const category = document.getElementById('reviewCategoryFilter').value;
  const params = category ? `?category=${category}` : '';

  const res = await fetch(`/api/admin/reviews${params}`, { headers: authHeaders() });
  const data = await res.json();

  const tbody = document.getElementById('reviewTableBody');
  const noReviewsMsg = document.getElementById('noReviewsMsg');
  tbody.innerHTML = '';

  if (data.success && data.reviews.length > 0) {
    noReviewsMsg.style.display = 'none';
    data.reviews.forEach((review) => {
      const date = new Date(review.created_at).toLocaleDateString('bn-BD');
      tbody.innerHTML += `
        <tr>
          <td>${escapeHtml(review.book_title)}</td>
          <td>${escapeHtml(review.category_name) || '—'}</td>
          <td>${escapeHtml(review.reviewer_name)}<br><small>${escapeHtml(review.reviewer_email)}</small></td>
          <td class="review-rating">${renderStarsAdmin(review.rating)}</td>
          <td>${escapeHtml(review.comment) || '—'}</td>
          <td>${date}</td>
        </tr>
      `;
    });
  } else {
    noReviewsMsg.style.display = 'block';
  }
}

document.getElementById('reviewCategoryFilter').addEventListener('change', loadAdminReviews);

// ---------------- উইশলিস্ট সামারি লোড করা ----------------
async function loadWishlistCategoryFilter() {
  const res = await fetch('/api/categories');
  const data = await res.json();
  const select = document.getElementById('wishlistCategoryFilter');

  if (data.success) {
    data.categories.forEach((cat) => {
      select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
  }
}

async function loadWishlistSummary() {
  const category = document.getElementById('wishlistCategoryFilter').value;
  const params = category ? `?category=${category}` : '';

  const res = await fetch(`/api/admin/wishlist-summary${params}`, { headers: authHeaders() });
  const data = await res.json();

  const tbody = document.getElementById('wishlistTableBody');
  const noWishlistMsg = document.getElementById('noWishlistMsg');
  tbody.innerHTML = '';

  if (data.success && data.items.length > 0) {
    noWishlistMsg.style.display = 'none';
    data.items.forEach((item) => {
      tbody.innerHTML += `
        <tr>
          <td>${escapeHtml(item.book_title)}</td>
          <td>${escapeHtml(item.category_name) || '—'}</td>
          <td>${item.wishlist_count}</td>
        </tr>
      `;
    });
  } else {
    noWishlistMsg.style.display = 'block';
  }
}

document.getElementById('wishlistCategoryFilter').addEventListener('change', loadWishlistSummary);

// ---------------- Best-Selling বই ----------------
async function loadBestSelling() {
  const res = await fetch('/api/admin/analytics/best-selling', { headers: authHeaders() });
  const data = await res.json();
  const tbody = document.getElementById('bestSellingBody');
  tbody.innerHTML = '';

  if (data.success && data.books.length > 0) {
    data.books.forEach((book) => {
      tbody.innerHTML += `
        <tr>
          <td>${escapeHtml(book.title)}</td>
          <td>${book.total_sold}</td>
          <td>৳${book.total_revenue}</td>
        </tr>
      `;
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#999;">এখনো কোনো বিক্রি হয়নি।</td></tr>';
  }
}

// ---------------- Low Stock Alert ----------------
async function loadLowStock() {
  const res = await fetch('/api/admin/analytics/low-stock', { headers: authHeaders() });
  const data = await res.json();
  const tbody = document.getElementById('lowStockBody');
  tbody.innerHTML = '';

  if (data.success && data.books.length > 0) {
    data.books.forEach((book) => {
      tbody.innerHTML += `
        <tr class="low-stock-row">
          <td>${escapeHtml(book.title)}</td>
          <td>${book.stock}</td>
        </tr>
      `;
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#999;">সব বইয়ের স্টক পর্যাপ্ত আছে।</td></tr>';
  }
}

// ---------------- Top Rated বই ----------------
async function loadTopRated() {
  const res = await fetch('/api/admin/analytics/top-rated', { headers: authHeaders() });
  const data = await res.json();
  const tbody = document.getElementById('topRatedBody');
  tbody.innerHTML = '';

  if (data.success && data.books.length > 0) {
    data.books.forEach((book) => {
      tbody.innerHTML += `
        <tr>
          <td>${escapeHtml(book.title)}</td>
          <td class="review-rating">${'★'.repeat(Math.round(book.avg_rating))}${'☆'.repeat(5 - Math.round(book.avg_rating))} (${parseFloat(book.avg_rating).toFixed(1)})</td>
          <td>${book.review_count}</td>
        </tr>
      `;
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#999;">এখনো কোনো রিভিউ নেই।</td></tr>';
  }
}

// ---------------- বিক্রির ট্রেন্ড চার্ট ----------------
let salesChart = null;

async function loadSalesTrendChart(period = 'weekly') {
  const res = await fetch(`/api/admin/analytics/sales-trend?period=${period}`, { headers: authHeaders() });
  const data = await res.json();
  if (!data.success) return;

  const labels = data.trend.map((row) => {
    const d = new Date(row.date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
  const totals = data.trend.map((row) => parseFloat(row.total));

  const ctx = document.getElementById('salesTrendChart').getContext('2d');

  if (salesChart) {
    salesChart.destroy();
  }

  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'বিক্রি (৳)',
        data: totals,
        backgroundColor: '#764ba2'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

document.querySelectorAll('.chart-period-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chart-period-btn').forEach((b) => {
      b.classList.remove('active');
      b.style.background = '#999';
    });
    btn.classList.add('active');
    btn.style.background = '#764ba2';
    loadSalesTrendChart(btn.dataset.period);
  });
});

// ---------------- কুপন তালিকা লোড করা ----------------
async function loadCoupons() {
  const res = await fetch('/api/coupons', { headers: authHeaders() });
  const data = await res.json();
  const tbody = document.getElementById('couponTableBody');
  tbody.innerHTML = '';

  if (data.success && data.coupons.length > 0) {
    data.coupons.forEach((coupon) => {
      const expiryText = coupon.expiry_date
        ? new Date(coupon.expiry_date).toLocaleDateString('bn-BD')
        : 'কোনো মেয়াদ নেই';
      const statusBadge = coupon.is_active
        ? '<span class="status-badge status-delivered">Active</span>'
        : '<span class="status-badge status-cancelled">Inactive</span>';

      tbody.innerHTML += `
        <tr>
          <td><strong>${escapeHtml(coupon.code)}</strong></td>
          <td>${coupon.discount_percent}%</td>
          <td>${expiryText}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="action-btn" onclick="toggleCoupon(${coupon.id})">${coupon.is_active ? 'Inactive করুন' : 'Active করুন'}</button>
            <button class="action-btn block" onclick="deleteCoupon(${coupon.id})">ডিলিট</button>
          </td>
        </tr>
      `;
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999;">কোনো কুপন তৈরি করা হয়নি।</td></tr>';
  }
}

document.getElementById('couponForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const code = document.getElementById('couponCode').value.trim();
  const discountPercent = document.getElementById('couponDiscount').value;
  const expiryDate = document.getElementById('couponExpiry').value;

  const res = await fetch('/api/coupons', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code, discountPercent, expiryDate: expiryDate || null })
  });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');

  if (data.success) {
    document.getElementById('couponForm').reset();
    loadCoupons();
  }
});

async function toggleCoupon(id) {
  const res = await fetch(`/api/coupons/${id}/toggle`, { method: 'PUT', headers: authHeaders() });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');
  loadCoupons();
}

async function deleteCoupon(id) {
  if (!confirm('আপনি কি নিশ্চিত এই কুপন মুছে ফেলতে চান?')) return;
  const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE', headers: authHeaders() });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');
  loadCoupons();
}

// ---------------- Activity Log লোড করা ----------------
async function loadLogs() {
  const res = await fetch('/api/admin/logs', { headers: authHeaders() });
  const data = await res.json();
  const tbody = document.getElementById('logsTableBody');
  tbody.innerHTML = '';

  if (data.success && data.logs.length > 0) {
    data.logs.forEach((log) => {
      const dateTime = new Date(log.created_at).toLocaleString('bn-BD');
      tbody.innerHTML += `
        <tr>
          <td>${escapeHtml(log.admin_name)}</td>
          <td>${escapeHtml(log.action)}</td>
          <td>${escapeHtml(log.details) || '—'}</td>
          <td>${dateTime}</td>
        </tr>
      `;
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999;">এখনো কোনো activity log নেই।</td></tr>';
  }
}

document.getElementById('refreshLogsBtn').addEventListener('click', loadLogs);

// ---------------- Data Management (ঝুঁকিপূর্ণ) ----------------
async function loadDangerCounts() {
  const [catRes, bookRes, userRes] = await Promise.all([
    fetch('/api/categories'),
    fetch('/api/books'),
    fetch('/api/admin/users', { headers: authHeaders() })
  ]);
  const catData = await catRes.json();
  const bookData = await bookRes.json();
  const userData = await userRes.json();

  if (catData.success) document.getElementById('categoryDangerCount').textContent = catData.categories.length;
  if (bookData.success) document.getElementById('bookDangerCount').textContent = bookData.books.length;
  if (userData.success) {
    const nonAdminCount = userData.users.filter((u) => !u.is_admin).length;
    document.getElementById('userDangerCount').textContent = nonAdminCount;
  }
}

// "DELETE" টাইপ না করলে বাটন সক্রিয় হবে না
document.querySelectorAll('.danger-confirm-input').forEach((input) => {
  input.addEventListener('input', () => {
    const target = input.dataset.target;
    const btn = document.getElementById(
      target === 'categories' ? 'deleteAllCategoriesBtn' :
      target === 'books' ? 'deleteAllBooksBtn' : 'deleteAllUsersBtn'
    );
    btn.disabled = input.value.trim() !== 'DELETE';
  });
});

async function bulkDelete(endpoint, confirmMessage, reloadFn) {
  if (!confirm(confirmMessage)) return;

  const res = await fetch(`/api/admin/bulk/${endpoint}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');

  // ইনপুট ও বাটন রিসেট করা হচ্ছে
  document.querySelectorAll('.danger-confirm-input').forEach((i) => { i.value = ''; });
  document.querySelectorAll('.danger-btn').forEach((b) => { b.disabled = true; });

  reloadFn();
  loadDangerCounts();
  loadSummary();
}

document.getElementById('deleteAllCategoriesBtn').addEventListener('click', () => {
  bulkDelete(
    'categories',
    'আপনি কি একদম নিশ্চিত? সব ক্যাটাগরি স্থায়ীভাবে মুছে যাবে, এটা ফিরিয়ে আনা যাবে না।',
    () => { loadCategories(); loadBookInfoList(); }
  );
});

document.getElementById('deleteAllBooksBtn').addEventListener('click', () => {
  bulkDelete(
    'books',
    'আপনি কি একদম নিশ্চিত? সব বই স্থায়ীভাবে মুছে যাবে, এটা ফিরিয়ে আনা যাবে না।',
    () => { loadBooks(); loadBookInfoList(); loadCategories(); }
  );
});

document.getElementById('deleteAllUsersBtn').addEventListener('click', () => {
  bulkDelete(
    'users',
    'আপনি কি একদম নিশ্চিত? সব (non-admin) ইউজার স্থায়ীভাবে মুছে যাবে, এটা ফিরিয়ে আনা যাবে না।',
    () => { loadUsers(); }
  );
});

// ---------------- ইউজার তালিকা লোড করা ----------------
let cachedUsers = [];

async function loadUsers() {
  const res = await fetch('/api/admin/users', { headers: authHeaders() });
  const data = await res.json();
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '';

  if (data.success) {
    cachedUsers = data.users;

    data.users.forEach((user) => {
      const joinDate = new Date(user.created_at).toLocaleDateString('bn-BD');
      const statusBadge = user.is_blocked
        ? '<span class="status-badge status-cancelled">Blocked</span>'
        : '<span class="status-badge status-delivered">Active</span>';

      tbody.innerHTML += `
        <tr>
          <td>${escapeHtml(user.full_name)}</td>
          <td>${escapeHtml(user.email)}</td>
          <td>${user.is_admin ? 'Admin' : 'Customer'}</td>
          <td>${statusBadge}</td>
          <td>${joinDate}</td>
          <td>
            <button class="action-btn" onclick="viewUserOrders(${user.id})">অর্ডার দেখুন</button><br>
            <button class="action-btn ${user.is_blocked ? 'unblock' : 'block'}" onclick="toggleBlockUser(${user.id}, ${!user.is_blocked})">
              ${user.is_blocked ? 'আনব্লক করুন' : 'ব্লক করুন'}
            </button>
            <button class="action-btn admin" onclick="toggleAdminUser(${user.id}, ${!user.is_admin})">
              ${user.is_admin ? 'Admin সরান' : 'Admin বানান'}
            </button>
          </td>
        </tr>
      `;
    });
  }
}

// ---------------- Block/Unblock করা ----------------
async function toggleBlockUser(userId, isBlocked) {
  const res = await fetch(`/api/admin/users/${userId}/block`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ isBlocked })
  });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');
  loadUsers();
}

// ---------------- Admin বানানো/সরানো ----------------
async function toggleAdminUser(userId, isAdmin) {
  const res = await fetch(`/api/admin/users/${userId}/admin`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ isAdmin })
  });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');
  loadUsers();
}

// ---------------- একজন ইউজারের অর্ডার হিস্টোরি দেখা (Modal) ----------------
async function viewUserOrders(userId) {
  const user = cachedUsers.find((u) => u.id === userId);
  const userName = user ? user.full_name : '';

  const res = await fetch(`/api/admin/users/${userId}/orders`, { headers: authHeaders() });
  const data = await res.json();

  const modal = document.getElementById('userOrdersModal');
  const modalBody = document.getElementById('userOrdersModalBody');
  document.getElementById('userOrdersModalTitle').textContent = `${userName} এর অর্ডার হিস্টোরি`;

  if (data.success && data.orders.length > 0) {
    modalBody.innerHTML = data.orders.map((order) => {
      const date = new Date(order.created_at).toLocaleDateString('bn-BD');
      const itemsText = order.items.map((i) => `${escapeHtml(i.title)} (x${i.quantity})`).join(', ');
      return `
        <div class="user-order-card">
          <div class="uo-top">
            <span>অর্ডার #${order.id}</span>
            <span>${date}</span>
          </div>
          <div>${itemsText}</div>
          <div style="margin-top:6px; display:flex; justify-content:space-between;">
            <span class="status-badge status-${order.order_status}">${order.order_status}</span>
            <strong>৳${order.total_amount}</strong>
          </div>
        </div>
      `;
    }).join('');
  } else {
    modalBody.innerHTML = '<p style="text-align:center; color:#999;">এই ইউজার এখনো কোনো অর্ডার করেননি।</p>';
  }

  modal.style.display = 'flex';
}

document.getElementById('closeUserOrdersModal').addEventListener('click', () => {
  document.getElementById('userOrdersModal').style.display = 'none';
});

document.getElementById('userOrdersModal').addEventListener('click', (e) => {
  if (e.target.id === 'userOrdersModal') {
    document.getElementById('userOrdersModal').style.display = 'none';
  }
});

// ---------------- শুরু করা ----------------
(async function init() {
  const ok = await checkAdminAccess();
  if (ok) {
    loadSummary();
    loadCategories();
    loadBooks();
    loadOrders();
    loadUsers();
    loadBookInfoList();
    setTodayAsDefaultSalesDate();
    loadReviewCategoryFilter();
    loadAdminReviews();
    loadWishlistCategoryFilter();
    loadWishlistSummary();
    loadBestSelling();
    loadLowStock();
    loadTopRated();
    loadSalesTrendChart('weekly');
    loadCoupons();
    loadLogs();
    loadDangerCounts();
  }
})();
