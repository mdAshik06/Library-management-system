// ---------- Toast ----------
const toastEl = document.getElementById('toast');
const toastBody = document.getElementById('toastBody');
const bsToast = new bootstrap.Toast(toastEl, { delay: 1800 });

function showToast(msg) {
  toastBody.textContent = msg;
  bsToast.show();
}

// ---------- Quantity stepper ----------
const qtyInput = document.getElementById('qtyInput');
const maxStock = 24;

document.getElementById('qtyMinus').addEventListener('click', () => {
  let v = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
  qtyInput.value = v;
});

document.getElementById('qtyPlus').addEventListener('click', () => {
  let v = Math.min(maxStock, (parseInt(qtyInput.value, 10) || 1) + 1);
  qtyInput.value = v;
});

qtyInput.addEventListener('change', () => {
  let v = parseInt(qtyInput.value, 10);
  if (isNaN(v) || v < 1) v = 1;
  if (v > maxStock) v = maxStock;
  qtyInput.value = v;
});

// ---------- Add to cart ----------
const cartBadge = document.getElementById('cartBadge');

document.getElementById('addToCart').addEventListener('click', () => {
  const qty = parseInt(qtyInput.value, 10) || 1;
  const current = parseInt(cartBadge.textContent, 10) || 0;
  cartBadge.textContent = current + qty;
  showToast(qty + ' The book add to cart');
});

// ---------- Wishlist toggle ----------
const wishlistBtn = document.getElementById('wishlistBtn');
const wishlistLabel = document.getElementById('wishlistLabel');
const heartIcon = wishlistBtn.querySelector('.heart');

wishlistBtn.addEventListener('click', () => {
  const active = wishlistBtn.classList.toggle('active');
  heartIcon.textContent = active ? '♥' : '♡';
  wishlistLabel.textContent = active ? 'Remove from wish list' : 'Add to wishlist';
  showToast(active ? 'Added to wishlist' : 'Removed from wishlist');
});
