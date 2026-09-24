const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// ---------------- উইশলিস্টের সব আইটেম দেখা ----------------
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT wishlist_items.id AS wishlist_id, books.*, categories.name AS category_name
       FROM wishlist_items
       JOIN books ON wishlist_items.book_id = books.id
       LEFT JOIN categories ON books.category_id = categories.id
       WHERE wishlist_items.user_id = ?
       ORDER BY wishlist_items.created_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, items: rows });
  } catch (err) {
    console.error('Get Wishlist Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- আইডি সেট দেখা (কার্ডে হার্ট আইকন ঠিক দেখানোর জন্য, শুধু book_id গুলো) ----------------
router.get('/ids', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT book_id FROM wishlist_items WHERE user_id = ?', [req.user.id]);
    return res.json({ success: true, bookIds: rows.map((r) => r.book_id) });
  } catch (err) {
    console.error('Get Wishlist Ids Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- উইশলিস্টে বই যোগ করা ----------------
router.post('/', async (req, res) => {
  const { bookId } = req.body;

  if (!bookId) {
    return res.status(400).json({ success: false, message: 'বই সিলেক্ট করা হয়নি।' });
  }

  try {
    const [existing] = await db.query(
      'SELECT id FROM wishlist_items WHERE user_id = ? AND book_id = ?',
      [req.user.id, bookId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'বইটা আগে থেকেই উইশলিস্টে আছে।' });
    }

    await db.query('INSERT INTO wishlist_items (user_id, book_id) VALUES (?, ?)', [req.user.id, bookId]);
    return res.status(201).json({ success: true, message: 'উইশলিস্টে যোগ করা হয়েছে।' });
  } catch (err) {
    console.error('Add Wishlist Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- উইশলিস্ট থেকে বই সরানো (bookId দিয়ে) ----------------
router.delete('/:bookId', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM wishlist_items WHERE user_id = ? AND book_id = ?',
      [req.user.id, req.params.bookId]
    );
    return res.json({ success: true, message: 'উইশলিস্ট থেকে সরানো হয়েছে।' });
  } catch (err) {
    console.error('Remove Wishlist Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

module.exports = router;
