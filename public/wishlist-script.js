function escapeHtmlWishlist(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// ---------------- উইশলিস্ট লোড করা ----------------
async function loadWishlistPage() {
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return;
  }

  const res = await fetch('/api/wishlist', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  const data = await res.json();

  const grid = document.getElementById('wishlistGrid');
  const emptyBox = document.getElementById('emptyWishlist');
  grid.innerHTML = '';

  if (!data.success || data.items.length === 0) {
    emptyBox.style.display = 'block';
    return;
  }

  emptyBox.style.display = 'none';

  data.items.forEach((book) => {
    const coverHtml = book.cover_image
      ? `<img src="${book.cover_image}" alt="${escapeHtmlWishlist(book.title)}" />`
      : 'কভার নেই';

    const stockHtml = book.stock > 0
      ? `<div class="stock-info in-stock">স্টকে আছে (${book.stock})</div>`
      : `<div class="stock-info out-stock">স্টক শেষ</div>`;

    const cartBtnHtml = book.stock > 0
      ? `<button class="add-cart-btn" onclick="addToCart(${book.id})">কার্টে যোগ করুন</button>`
      : `<button class="add-cart-btn" disabled>স্টক নেই</button>`;

    grid.innerHTML += `
      <div class="book-card">
        <a href="book-detail.html?id=${book.id}" class="cover-link">
          <div class="cover">${coverHtml}</div>
        </a>
        <button class="wishlist-heart-btn active" onclick="removeFromWishlist(${book.id})">♥</button>
        <div class="info">
          <a href="book-detail.html?id=${book.id}" class="title-link">
            <div class="title">${escapeHtmlWishlist(book.title)}</div>
          </a>
          <div class="author">${escapeHtmlWishlist(book.author)}</div>
          ${book.category_name ? `<span class="category-tag">${escapeHtmlWishlist(book.category_name)}</span>` : ''}
          ${stockHtml}
          <div class="price">৳${book.price}</div>
          ${cartBtnHtml}
        </div>
      </div>
    `;
  });
}

// ---------------- উইশলিস্ট থেকে সরানো ----------------
async function removeFromWishlist(bookId) {
  await fetch(`/api/wishlist/${bookId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  loadWishlistPage();
}

// ---------------- শুরু করা ----------------
loadWishlistPage();
