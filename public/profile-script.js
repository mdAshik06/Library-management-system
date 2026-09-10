const token = localStorage.getItem('token');

if (!token) {
  window.location.href = 'login.html';
}

function showMessage(text, type) {
  const box = document.getElementById('message');
  box.textContent = text;
  box.className = `message ${type}`;
  setTimeout(() => { box.className = 'message'; }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('token');
  window.location.href = 'login.html';
});

// Admin হলে "Admin Dashboard" লিংক দেখানো হচ্ছে
try {
  const payload = JSON.parse(atob(token.split('.')[1]));
  if (payload.isAdmin) {
    document.getElementById('adminDashboardLink').style.display = 'inline';
  }
} catch (err) {
  // টোকেন ঠিকমতো decode না হলে চুপচাপ থাকা ঠিক আছে
}

// ---------------- প্রোফাইল তথ্য লোড করা ----------------
async function loadProfile() {
  const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();

  if (!data.success) {
    window.location.href = 'login.html';
    return;
  }

  const user = data.user;
  document.getElementById('fullName').value = user.full_name || '';
  document.getElementById('email').value = user.email || '';
  document.getElementById('mobile').value = user.mobile || '';
  document.getElementById('address').value = user.address || '';
  document.getElementById('profilePic').src = user.profile_image || defaultAvatar();
}

function defaultAvatar() {
  // কোনো ছবি না থাকলে একটা সাধারণ SVG placeholder দেখানো হচ্ছে
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#e2e2ea"/>
      <circle cx="50" cy="38" r="18" fill="#a9a9c2"/>
      <ellipse cx="50" cy="88" rx="30" ry="24" fill="#a9a9c2"/>
    </svg>
  `);
}

// ---------------- প্রোফাইল আপডেট করা ----------------
document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = document.getElementById('saveProfileBtn');
  btn.disabled = true;
  btn.textContent = 'অপেক্ষা করুন...';

  const formData = new FormData();
  formData.append('fullName', document.getElementById('fullName').value.trim());
  formData.append('mobile', document.getElementById('mobile').value.trim());
  formData.append('address', document.getElementById('address').value.trim());

  const fileInput = document.getElementById('profileImage');
  if (fileInput.files[0]) {
    formData.append('profileImage', fileInput.files[0]);
  }

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    showMessage(data.message, data.success ? 'success' : 'error');

    if (data.success) {
      loadProfile();
    }
  } catch (err) {
    showMessage('প্রোফাইল আপডেট করা যায়নি, আবার চেষ্টা করুন।', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'আপডেট করুন';
  }
});

// ---------------- অর্ডার হিস্টোরি লোড করা ----------------
async function loadOrderHistory() {
  const res = await fetch('/api/orders/my', { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();

  const box = document.getElementById('orderHistory');
  const noOrders = document.getElementById('noOrders');
  box.innerHTML = '';

  if (!data.success || data.orders.length === 0) {
    noOrders.style.display = 'block';
    return;
  }

  noOrders.style.display = 'none';

  data.orders.forEach((order) => {
    const orderDate = new Date(order.created_at).toLocaleDateString('bn-BD');
    const itemsText = order.items.map((item) => `${escapeHtml(item.title)} (x${item.quantity})`).join(', ');

    // পেমেন্ট paid হলে এবং PDF থাকলে ডাউনলোড বাটন দেখানো হবে
    const pdfButtonsHtml = order.payment_status === 'paid'
      ? order.items
          .filter((item) => item.has_pdf)
          .map((item) => `
            <button class="pdf-download-btn" onclick="downloadBookPdf(${item.book_id}, '${escapeHtml(item.title).replace(/'/g, "&#39;")}')">
              ⬇ "${escapeHtml(item.title)}" এর PDF ডাউনলোড করুন
            </button>
          `).join('')
      : '';

    box.innerHTML += `
      <div class="order-card">
        <div class="order-top">
          <span>অর্ডার #${order.id}</span>
          <span>${orderDate}</span>
        </div>
        <div class="order-items">${itemsText}</div>
        <div class="order-bottom">
          <span class="status-badge status-${order.order_status}">${order.order_status}</span>
          <span>৳${order.total_amount}</span>
        </div>
        ${pdfButtonsHtml ? `<div class="pdf-buttons-wrap">${pdfButtonsHtml}</div>` : ''}
      </div>
    `;
  });
}

// ---------------- বইয়ের PDF ডাউনলোড করা ----------------
async function downloadBookPdf(bookId, title) {
  try {
    const res = await fetch(`/api/books/${bookId}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.message || 'ডাউনলোড করা যায়নি।');
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('ডাউনলোড করা যায়নি, আবার চেষ্টা করুন।');
  }
}

// ---------------- শুরু করা ----------------
loadProfile();
loadOrderHistory();
