function showMessage(text, type) {
  const box = document.getElementById('message');
  if (!box) return;
  box.textContent = text;
  box.className = `message ${type}`;
  setTimeout(() => { box.className = 'message'; }, 3000);
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  };
}

// ---------------- কার্টের আইটেম লোড করা ----------------
async function loadCartItems() {
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return;
  }

  const res = await fetch('/api/cart', { headers: authHeaders() });
  const data = await res.json();

  const wrap = document.getElementById('cartItemsWrap');
  const emptyBox = document.getElementById('emptyCart');
  const summaryBox = document.getElementById('cartSummary');
  wrap.innerHTML = '';

  if (!data.success || data.items.length === 0) {
    emptyBox.style.display = 'block';
    summaryBox.style.display = 'none';
    return;
  }

  emptyBox.style.display = 'none';
  summaryBox.style.display = 'block';

  data.items.forEach((item) => {
    const thumbHtml = item.cover_image
      ? `<img src="${item.cover_image}" class="thumb" />`
      : `<div class="thumb"></div>`;

    wrap.innerHTML += `
      <div class="cart-item" data-id="${item.id}">
        ${thumbHtml}
        <div class="details">
          <div class="title">${item.title}</div>
          <div class="author">${item.author}</div>
          <div class="price">৳${item.price} প্রতিটি</div>
          <button class="remove-btn" onclick="removeItem(${item.id})">🗑 সরিয়ে ফেলুন</button>
        </div>
        <div class="qty-control">
          <button onclick="changeQty(${item.id}, ${item.quantity - 1})">−</button>
          <span>${item.quantity}</span>
          <button onclick="changeQty(${item.id}, ${item.quantity + 1})">+</button>
        </div>
        <div class="subtotal">৳${item.subtotal}</div>
      </div>
    `;
  });

  document.getElementById('cartTotal').textContent = `৳${data.total}`;
}

// ---------------- quantity পরিবর্তন করা ----------------
async function changeQty(itemId, newQty) {
  if (newQty < 1) {
    removeItem(itemId);
    return;
  }

  const res = await fetch(`/api/cart/${itemId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ quantity: newQty })
  });
  const data = await res.json();

  if (!data.success) {
    showMessage(data.message, 'error');
  }
  loadCartItems();
  loadCartCount(); // store-script.js এ থাকা ফাংশন, হেডারের কাউন্ট আপডেট করবে
}

// ---------------- কার্ট থেকে সরানো ----------------
async function removeItem(itemId) {
  const res = await fetch(`/api/cart/${itemId}`, { method: 'DELETE', headers: authHeaders() });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');
  loadCartItems();
  loadCartCount();
}

// ---------------- চেকআউট পেইজে যাওয়া ----------------
document.getElementById('checkoutBtn').addEventListener('click', () => {
  window.location.href = 'checkout.html';
});

// ---------------- শুরু করা ----------------
loadCartItems();
