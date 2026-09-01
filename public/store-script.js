const token = localStorage.getItem('token');

// ---------------- লগিন স্টেট অনুযায়ী নেভিগেশন দেখানো ----------------
if (token) {
  document.getElementById('loginLink').style.display = 'none';
  document.getElementById('profileLink').style.display = 'inline';
  document.getElementById('logoutBtn').style.display = 'inline';

  // টোকেন থেকে admin কিনা চেক করে "Admin Dashboard" লিংক দেখানো হচ্ছে
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.isAdmin) {
      const adminLink = document.getElementById('adminDashboardLink');
      if (adminLink) adminLink.style.display = 'inline';
    }
  } catch (err) {
    // টোকেন ঠিকমতো decode না হলে চুপচাপ থাকা ঠিক আছে
  }
}

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('token');
  window.location.reload();
});

// ---------------- হেডারে কার্টের সংখ্যা দেখানো ----------------
async function loadCartCount() {
  if (!token) return;
  try {
    const res = await fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      const totalQty = data.items.reduce((sum, item) => sum + item.quantity, 0);
      const badge = document.getElementById('cartCount');
      if (totalQty > 0) {
        badge.textContent = totalQty;
        badge.style.display = 'inline-block';
      }
    }
  } catch (err) {
    // চুপচাপ থাকা ঠিক আছে, কার্ট কাউন্ট না দেখালেও সমস্যা নেই
  }
}

let wishlistIds = new Set();

// ---------------- উইশলিস্টে থাকা বইয়ের আইডি লোড করা ----------------
async function loadWishlistIds() {
  if (!token) return;
  try {
    const res = await fetch('/api/wishlist/ids', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      wishlistIds = new Set(data.bookIds);
    }
  } catch (err) {
    // চুপচাপ থাকা ঠিক আছে
  }
}

// ---------------- উইশলিস্টে যোগ/বাদ দেওয়া (টগল) ----------------
async function toggleWishlist(bookId, btnEl) {
  if (!token) {
    alert('উইশলিস্টে যোগ করতে হলে আগে লগিন করুন।');
    window.location.href = 'login.html';
    return;
  }

  const isInWishlist = wishlistIds.has(bookId);

  try {
    if (isInWishlist) {
      await fetch(`/api/wishlist/${bookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      wishlistIds.delete(bookId);
    } else {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bookId })
      });
      wishlistIds.add(bookId);
    }

    if (btnEl) {
      btnEl.textContent = wishlistIds.has(bookId) ? '♥' : '♡';
      btnEl.classList.toggle('active', wishlistIds.has(bookId));
    }
  } catch (err) {
    alert('উইশলিস্ট আপডেট করা যায়নি, আবার চেষ্টা করুন।');
  }
}

// ---------------- কার্টে বই যোগ করা ----------------
async function addToCart(bookId) {
  if (!token) {
    alert('কার্টে যোগ করতে হলে আগে লগিন করুন।');
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ bookId, quantity: 1 })
    });
    const data = await res.json();

    if (data.success) {
      loadCartCount();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('কার্টে যোগ করা যায়নি, আবার চেষ্টা করুন।');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function renderStars(avgRating) {
  const rating = parseFloat(avgRating) || 0;
  const fullStars = Math.round(rating);
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += i <= fullStars ? '★' : '☆';
  }
  return stars;
}

// ---------------- ক্যাটাগরি ড্রপডাউন লোড করা ----------------
async function loadCategoryFilter() {
  const res = await fetch('/api/categories');
  const data = await res.json();
  const select = document.getElementById('categoryFilter');

  if (data.success) {
    data.categories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      select.appendChild(option);
    });
  }
}

// ---------------- বই লোড করা (সার্চ + ক্যাটাগরি ফিল্টার সহ) ----------------
function renderBookCard(book) {
  const coverHtml = book.cover_image
    ? `<img src="${book.cover_image}" alt="${escapeHtml(book.title)}" />`
    : 'কভার নেই';

  const stockHtml = book.stock > 0
    ? `<div class="stock-info in-stock">স্টকে আছে (${book.stock})</div>`
    : `<div class="stock-info out-stock">স্টক শেষ</div>`;

  const cartBtnHtml = book.stock > 0
    ? `<button class="add-cart-btn" onclick="addToCart(${book.id})">কার্টে যোগ করুন</button>`
    : `<button class="add-cart-btn" disabled>স্টক নেই</button>`;

  const ratingHtml = book.review_count > 0
    ? `<div class="rating-line"><span class="stars">${renderStars(book.avg_rating)}</span> <span class="rating-count">(${book.review_count})</span></div>`
    : `<div class="rating-line no-rating">এখনো কোনো রিভিউ নেই</div>`;

  const isWishlisted = wishlistIds.has(book.id);
  const heartIcon = isWishlisted ? '♥' : '♡';
  const featuredBadge = book.is_featured ? `<span class="featured-badge">Featured</span>` : '';

  return `
    <div class="book-card">
      ${featuredBadge}
      <a href="book-detail.html?id=${book.id}" class="cover-link">
        <div class="cover">${coverHtml}</div>
      </a>
      <button class="wishlist-heart-btn ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist(${book.id}, this)">${heartIcon}</button>
      <div class="info">
        <a href="book-detail.html?id=${book.id}" class="title-link">
          <div class="title">${escapeHtml(book.title)}</div>
        </a>
        <div class="author">${escapeHtml(book.author)}</div>
        ${book.category_name ? `<span class="category-tag">${escapeHtml(book.category_name)}</span>` : ''}
        ${ratingHtml}
        ${stockHtml}
        <div class="price">৳${book.price}</div>
        ${cartBtnHtml}
      </div>
    </div>
  `;
}

// ---------------- Featured/Bestseller বই লোড করা ----------------
async function loadFeaturedBooks() {
  const featuredSection = document.getElementById('featuredSection');
  if (!featuredSection) return; // এই পেইজে featured section না থাকলে কিছু করার দরকার নেই

  const ebooksOnly = document.body.dataset.ebooksOnly === 'true';
  const url = ebooksOnly ? '/api/books?featured=true&hasPdf=true' : '/api/books?featured=true';

  const res = await fetch(url);
  const data = await res.json();

  if (data.success && data.books.length > 0) {
    featuredSection.style.display = 'block';
    document.getElementById('featuredGrid').innerHTML = data.books.map(renderBookCard).join('');
  } else {
    featuredSection.style.display = 'none';
  }
}

async function loadBooks() {
  const search = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('categoryFilter').value;
  const ebooksOnly = document.body.dataset.ebooksOnly === 'true';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (ebooksOnly) params.append('hasPdf', 'true');

  const res = await fetch(`/api/books?${params.toString()}`);
  const data = await res.json();

  const grid = document.getElementById('bookGrid');
  const noResults = document.getElementById('noResults');
  grid.innerHTML = '';

  if (data.success && data.books.length > 0) {
    noResults.style.display = 'none';
    grid.innerHTML = data.books.map(renderBookCard).join('');
  } else {
    noResults.style.display = 'block';
  }
}

// সার্চ করার সময় বার বার রিকোয়েস্ট না পাঠিয়ে একটু অপেক্ষা করা হচ্ছে (debounce)
let searchTimeout;
document.getElementById('searchInput')?.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadBooks, 400);
});

document.getElementById('categoryFilter')?.addEventListener('change', loadBooks);

// ---------------- শুরু করা ----------------
// এই পেইজে বইয়ের গ্যালারি থাকলে তবেই বই লোড করা হবে (cart.html এর মতো পেইজে দরকার নেই)
if (document.getElementById('bookGrid')) {
  loadWishlistIds().then(() => {
    loadCategoryFilter();
    loadBooks();
    loadFeaturedBooks();
  });
}
loadCartCount();

