const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// সব cart route এর জন্য লগিন করা থাকতে হবে
router.use(verifyToken);

// ---------------- কার্টের সব আইটেম দেখা (বইয়ের তথ্যসহ) ----------------
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT cart_items.id, cart_items.quantity, cart_items.book_id,
              books.title, books.author, books.price, books.stock, books.cover_image
       FROM cart_items
       JOIN books ON cart_items.book_id = books.id
       WHERE cart_items.user_id = ?
       ORDER BY cart_items.created_at DESC`,
      [req.user.id]
    );

    const items = rows.map((row) => ({
      ...row,
      subtotal: (row.price * row.quantity).toFixed(2)
    }));

    const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

    return res.json({ success: true, items, total: total.toFixed(2) });
  } catch (err) {
    console.error('Get Cart Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- কার্টে বই যোগ করা ----------------
router.post('/', async (req, res) => {
  const { bookId, quantity } = req.body;
  const qty = parseInt(quantity) || 1;

  if (!bookId) {
    return res.status(400).json({ success: false, message: 'বই সিলেক্ট করা হয়নি।' });
  }

  try {
    const [bookRows] = await db.query('SELECT * FROM books WHERE id = ?', [bookId]);
    if (bookRows.length === 0) {
      return res.status(404).json({ success: false, message: 'বই পাওয়া যায়নি।' });
    }

    const book = bookRows[0];
    if (book.stock < qty) {
      return res.status(400).json({ success: false, message: 'পর্যাপ্ত স্টক নেই।' });
    }

    // আগে থেকে কার্টে থাকলে quantity বাড়িয়ে দেওয়া হচ্ছে
    const [existing] = await db.query(
      'SELECT * FROM cart_items WHERE user_id = ? AND book_id = ?',
      [req.user.id, bookId]
    );

    if (existing.length > 0) {
      const newQty = existing[0].quantity + qty;
      if (newQty > book.stock) {
        return res.status(400).json({ success: false, message: 'স্টকের চেয়ে বেশি যোগ করা যাবে না।' });
      }
      await db.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, existing[0].id]);
    } else {
      await db.query(
        'INSERT INTO cart_items (user_id, book_id, quantity) VALUES (?, ?, ?)',
        [req.user.id, bookId, qty]
      );
    }

    return res.status(201).json({ success: true, message: 'কার্টে যোগ করা হয়েছে।' });
  } catch (err) {
    console.error('Add To Cart Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- কার্ট আইটেমের quantity পরিবর্তন করা ----------------
router.put('/:id', async (req, res) => {
  const { quantity } = req.body;
  const qty = parseInt(quantity);

  if (!qty || qty < 1) {
    return res.status(400).json({ success: false, message: 'সঠিক quantity দিতে হবে।' });
  }

  try {
    const [rows] = await db.query(
      `SELECT cart_items.*, books.stock FROM cart_items
       JOIN books ON cart_items.book_id = books.id
       WHERE cart_items.id = ? AND cart_items.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'কার্ট আইটেম পাওয়া যায়নি।' });
    }

    if (qty > rows[0].stock) {
      return res.status(400).json({ success: false, message: 'পর্যাপ্ত স্টক নেই।' });
    }

    await db.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [qty, req.params.id]);
    return res.json({ success: true, message: 'পরিমাণ আপডেট করা হয়েছে।' });
  } catch (err) {
    console.error('Update Cart Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- কার্ট থেকে একটা আইটেম মুছে ফেলা ----------------
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return res.json({ success: true, message: 'কার্ট থেকে মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('Remove Cart Item Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

module.exports = router;
