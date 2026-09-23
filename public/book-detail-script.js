let selectedQty = 1;
let currentBook = null;

function getBookIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function escapeHtmlLocal(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// ---------------- বইয়ের বিস্তারিত লোড করা ----------------
async function loadBookDetail() {
  const bookId = getBookIdFromUrl();

  if (!bookId) {
    document.getElementById('notFound').style.display = 'block';
    return;
  }

  try {
    const res = await fetch(`/api/books/${bookId}`);
    const data = await res.json();

    if (!data.success) {
      document.getElementById('notFound').style.display = 'block';
      return;
    }

    currentBook = data.book;
    renderBookDetail(currentBook);
  } catch (err) {
    document.getElementById('notFound').style.display = 'block';
  }
}

function renderBookDetail(book) {
  document.title = `${book.title} | Bookstore`;

  const coverHtml = book.cover_image
    ? `<img src="${book.cover_image}" alt="${escapeHtmlLocal(book.title)}" />`
    : 'কভার নেই';

  const stockHtml = book.stock > 0
    ? `<div class="stock-info in-stock">স্টকে আছে (${book.stock})</div>`
    : `<div class="stock-info out-stock">স্টক শেষ</div>`;

  const isWishlisted = typeof wishlistIds !== 'undefined' && wishlistIds.has(book.id);
  const heartIcon = isWishlisted ? '♥ উইশলিস্টে আছে' : '♡ উইশলিস্টে যোগ করুন';

  const wrap = document.getElementById('bookDetailWrap');
  wrap.innerHTML = `
    <div class="book-detail">
      <div class="cover-large">${coverHtml}</div>
      <div>
        <div class="detail-title">${escapeHtmlLocal(book.title)}</div>
        <div class="detail-author">লেখক: ${escapeHtmlLocal(book.author)}</div>
        ${book.category_name ? `<span class="category-tag">${escapeHtmlLocal(book.category_name)}</span>` : ''}
        <div class="detail-price">৳${book.price}</div>
        ${stockHtml}
        <div class="detail-description">${escapeHtmlLocal(book.description) || 'কোনো বর্ণনা দেওয়া হয়নি।'}</div>

        ${book.stock > 0 ? `
          <div class="detail-qty-row">
            <div class="qty-control">
              <button onclick="changeDetailQty(-1)">−</button>
              <span id="detailQty">1</span>
              <button onclick="changeDetailQty(1)">+</button>
            </div>
            <button class="detail-add-cart-btn" id="detailAddCartBtn" onclick="addToCartFromDetail()">কার্টে যোগ করুন</button>
          </div>
        ` : `
          <button class="detail-add-cart-btn" disabled>স্টক নেই</button>
        `}

        <button class="wishlist-detail-btn ${isWishlisted ? 'active' : ''}" id="detailWishlistBtn" onclick="toggleWishlistFromDetail()">${heartIcon}</button>
      </div>
    </div>
  `;
}

function changeDetailQty(delta) {
  const newQty = selectedQty + delta;
  if (newQty < 1 || newQty > currentBook.stock) return;
  selectedQty = newQty;
  document.getElementById('detailQty').textContent = selectedQty;
}

async function addToCartFromDetail() {
  if (!localStorage.getItem('token')) {
    alert('কার্টে যোগ করতে হলে আগে লগিন করুন।');
    window.location.href = 'login.html';
    return;
  }

  const btn = document.getElementById('detailAddCartBtn');
  btn.disabled = true;
  btn.textContent = 'যোগ করা হচ্ছে...';

  try {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ bookId: currentBook.id, quantity: selectedQty })
    });
    const data = await res.json();

    if (data.success) {
      showMessage('কার্টে যোগ করা হয়েছে!', 'success');
      loadCartCount();
    } else {
      showMessage(data.message, 'error');
    }
  } catch (err) {
    showMessage('কার্টে যোগ করা যায়নি, আবার চেষ্টা করুন।', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'কার্টে যোগ করুন';
  }
}

function showMessage(text, type) {
  const box = document.getElementById('message');
  box.textContent = text;
  box.className = `message ${type}`;
  setTimeout(() => { box.className = 'message'; }, 3000);
}

let selectedRating = 0;

function escapeHtmlLocal2(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// ---------------- স্টার ইনপুট হ্যান্ডেল করা ----------------
document.getElementById('starInput')?.addEventListener('click', (e) => {
  if (e.target.tagName !== 'SPAN') return;
  selectedRating = parseInt(e.target.dataset.value);
  updateStarInputDisplay();
});

function updateStarInputDisplay() {
  document.querySelectorAll('#starInput span').forEach((span) => {
    const val = parseInt(span.dataset.value);
    span.textContent = val <= selectedRating ? '★' : '☆';
    span.classList.toggle('active', val <= selectedRating);
  });
}

// ---------------- রিভিউ লোড করা ----------------
async function loadReviews(bookId) {
  const res = await fetch(`/api/reviews/${bookId}`);
  const data = await res.json();

  if (!data.success) return;

  document.getElementById('reviewPanel').style.display = 'block';

  const summaryBox = document.getElementById('reviewSummary');
  if (data.reviewCount > 0) {
    summaryBox.innerHTML = `
      <span class="big-stars">${renderStarsLocal(data.avgRating)}</span>
      <span class="avg-number">${data.avgRating}</span>
      <span>(${data.reviewCount}টা রিভিউ)</span>
    `;
  } else {
    summaryBox.innerHTML = `<span>এখনো কোনো রিভিউ নেই — প্রথম রিভিউ আপনিই দিন!</span>`;
  }

  const currentUserId = getCurrentUserIdFromToken();
  const listBox = document.getElementById('reviewList');
  listBox.innerHTML = data.reviews.map((review) => {
    const date = new Date(review.created_at).toLocaleDateString('bn-BD');
    const canDelete = currentUserId && currentUserId === review.user_id;
    return `
      <div class="review-item">
        <div class="review-top">
          <span class="reviewer-name">${escapeHtmlLocal2(review.full_name)}</span>
          <span class="review-date">${date}</span>
        </div>
        <div class="review-stars">${renderStarsLocal(review.rating)}</div>
        ${review.comment ? `<div class="review-comment">${escapeHtmlLocal2(review.comment)}</div>` : ''}
        ${canDelete ? `<button class="delete-review-btn" onclick="deleteReview(${review.id})">🗑 নিজের রিভিউ মুছে ফেলুন</button>` : ''}
      </div>
    `;
  }).join('') || '';
}

function renderStarsLocal(rating) {
  const r = Math.round(parseFloat(rating));
  let stars = '';
  for (let i = 1; i <= 5; i++) stars += i <= r ? '★' : '☆';
  return stars;
}

function getCurrentUserIdFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id;
  } catch (err) {
    return null;
  }
}

// ---------------- রিভিউ সাবমিট করা ----------------
document.getElementById('reviewForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!localStorage.getItem('token')) {
    alert('রিভিউ দিতে হলে আগে লগিন করুন।');
    window.location.href = 'login.html';
    return;
  }

  if (selectedRating === 0) {
    showMessage('অনুগ্রহ করে একটা রেটিং (স্টার) বাছাই করুন।', 'error');
    return;
  }

  const comment = document.getElementById('reviewComment').value.trim();

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ bookId: currentBook.id, rating: selectedRating, comment })
    });
    const data = await res.json();
    showMessage(data.message, data.success ? 'success' : 'error');

    if (data.success) {
      document.getElementById('reviewComment').value = '';
      selectedRating = 0;
      updateStarInputDisplay();
      loadReviews(currentBook.id);
    }
  } catch (err) {
    showMessage('রিভিউ জমা দেওয়া যায়নি, আবার চেষ্টা করুন।', 'error');
  }
});

async function deleteReview(reviewId) {
  if (!confirm('আপনি কি নিশ্চিত এই রিভিউ মুছে ফেলতে চান?')) return;

  const res = await fetch(`/api/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  const data = await res.json();
  showMessage(data.message, data.success ? 'success' : 'error');
  loadReviews(currentBook.id);
}

async function toggleWishlistFromDetail() {
  await toggleWishlist(currentBook.id, null);
  renderBookDetail(currentBook); // হার্ট আইকনের লেখা/স্টাইল রিফ্রেশ করার জন্য পুরো ডিটেইল আবার আঁকা হচ্ছে
}

// ---------------- শুরু করা ----------------
Promise.resolve(typeof loadWishlistIds === 'function' ? loadWishlistIds() : null).then(() => {
  loadBookDetail().then(() => {
    if (currentBook) {
      loadReviews(currentBook.id);
    }
  });
});
