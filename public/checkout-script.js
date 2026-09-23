const token = localStorage.getItem('token');

if (!token) {
  window.location.href = 'login.html';
}

function showMessage(text, type) {
  const box = document.getElementById('message');
  box.textContent = text;
  box.className = `message ${type}`;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
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

let appliedCoupon = null; // { code, discountPercent }
let currentSubtotal = 0;

// ---------------- অর্ডার সামারি লোড করা ----------------
async function loadOrderSummary() {
  const res = await fetch('/api/cart', { headers: authHeaders() });
  const data = await res.json();

  const box = document.getElementById('orderSummary');

  if (!data.success || data.items.length === 0) {
    box.innerHTML = '<p>আপনার কার্ট খালি।</p>';
    document.getElementById('placeOrderBtn').disabled = true;
    return;
  }

  box.innerHTML = data.items.map((item) => `
    <div class="summary-item">
      <div>
        <div class="name">${item.title}</div>
        <div class="qty">${item.quantity} x ৳${item.price}</div>
      </div>
      <div>৳${item.subtotal}</div>
    </div>
  `).join('');

  currentSubtotal = parseFloat(data.total);
  updateTotalDisplay();
}

function updateTotalDisplay() {
  let discountAmount = 0;

  if (appliedCoupon) {
    discountAmount = (currentSubtotal * appliedCoupon.discountPercent) / 100;
    document.getElementById('subtotalRow').style.display = 'flex';
    document.getElementById('discountRow').style.display = 'flex';
    document.getElementById('checkoutSubtotal').textContent = `৳${currentSubtotal.toFixed(2)}`;
    document.getElementById('checkoutDiscount').textContent = `−৳${discountAmount.toFixed(2)}`;
  } else {
    document.getElementById('subtotalRow').style.display = 'none';
    document.getElementById('discountRow').style.display = 'none';
  }

  const finalTotal = currentSubtotal - discountAmount;
  document.getElementById('checkoutTotal').textContent = `৳${finalTotal.toFixed(2)}`;
}

// ---------------- কুপন কোড প্রয়োগ করা ----------------
document.getElementById('applyCouponBtn').addEventListener('click', async () => {
  const code = document.getElementById('couponInput').value.trim();
  const msgBox = document.getElementById('couponMessage');

  if (!code) {
    msgBox.textContent = 'কুপন কোড লিখুন।';
    msgBox.className = 'coupon-message error';
    return;
  }

  try {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ code })
    });
    const data = await res.json();

    if (data.success) {
      appliedCoupon = { code: data.code, discountPercent: data.discountPercent };
      msgBox.textContent = `✅ "${data.code}" কুপন প্রয়োগ হয়েছে — ${data.discountPercent}% ছাড়!`;
      msgBox.className = 'coupon-message success';
      updateTotalDisplay();
    } else {
      appliedCoupon = null;
      msgBox.textContent = data.message;
      msgBox.className = 'coupon-message error';
      updateTotalDisplay();
    }
  } catch (err) {
    msgBox.textContent = 'কুপন যাচাই করা যায়নি, আবার চেষ্টা করুন।';
    msgBox.className = 'coupon-message error';
  }
});

// ---------------- পেমেন্ট মেথড অনুযায়ী Transaction ID ফিল্ড দেখানো ----------------
document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    const group = document.getElementById('transactionIdGroup');
    const trxInput = document.getElementById('transactionId');
    if (e.target.value === 'bKash' || e.target.value === 'Nagad') {
      group.style.display = 'block';
      trxInput.required = true;
    } else {
      group.style.display = 'none';
      trxInput.required = false;
    }
  });
});

// ---------------- অর্ডার সাবমিট করা ----------------
document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.textContent = 'অপেক্ষা করুন...';

  const shippingAddress = document.getElementById('shippingAddress').value.trim();
  const contactMobile = document.getElementById('contactMobile').value.trim();
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
  const transactionId = document.getElementById('transactionId').value.trim();

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        shippingAddress,
        contactMobile,
        paymentMethod,
        transactionId,
        couponCode: appliedCoupon ? appliedCoupon.code : null
      })
    });
    const data = await res.json();

    if (data.success) {
      showMessage('অর্ডার সফল হয়েছে! আপনাকে প্রোফাইল পেইজে নিয়ে যাওয়া হচ্ছে...', 'success');
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 1500);
    } else {
      showMessage(data.message, 'error');
      btn.disabled = false;
      btn.textContent = 'অর্ডার কনফার্ম করুন';
    }
  } catch (err) {
    showMessage('অর্ডার সম্পন্ন করা যায়নি, আবার চেষ্টা করুন।', 'error');
    btn.disabled = false;
    btn.textContent = 'অর্ডার কনফার্ম করুন';
  }
});

// ---------------- শুরু করা ----------------
loadOrderSummary();
