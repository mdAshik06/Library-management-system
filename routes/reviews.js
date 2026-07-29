const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ---------------- একটা বইয়ের সব রিভিউ দেখা (সবার জন্য) ----------------
router.get('/:bookId', async (req, res) => {
  try {
    const [reviews] = await db.query(
      `SELECT reviews.id, reviews.rating, reviews.comment, reviews.created_at, reviews.user_id, users.full_name
       FROM reviews
       JOIN users ON reviews.user_id = users.id
       WHERE reviews.book_id = ?
       ORDER BY reviews.created_at DESC`,
      [req.params.bookId]
    );

    const [[stats]] = await db.query(
      `SELECT COALESCE(AVG(rating), 0) AS avgRating, COUNT(*) AS reviewCount
       FROM reviews WHERE book_id = ?`,
      [req.params.bookId]
    );

    return res.json({
      success: true,
      reviews,
      avgRating: parseFloat(stats.avgRating).toFixed(1),
      reviewCount: stats.reviewCount
    });
  } catch (err) {
    console.error('Get Reviews Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- রিভিউ যোগ/আপডেট করা (প্রতি ইউজার প্রতি বইয়ে একটাই রিভিউ) ----------------
router.post(
  '/',
  verifyToken,
  [
    body('bookId').notEmpty().withMessage('বই সিলেক্ট করা হয়নি।'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('রেটিং ১ থেকে ৫ এর মধ্যে হতে হবে।')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { bookId, rating, comment } = req.body;

    try {
      const [existing] = await db.query(
        'SELECT id FROM reviews WHERE user_id = ? AND book_id = ?',
        [req.user.id, bookId]
      );

      if (existing.length > 0) {
        await db.query(
          'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
          [rating, comment || null, existing[0].id]
        );
        return res.json({ success: true, message: 'আপনার রিভিউ আপডেট করা হয়েছে।' });
      } else {
        await db.query(
          'INSERT INTO reviews (user_id, book_id, rating, comment) VALUES (?, ?, ?, ?)',
          [req.user.id, bookId, rating, comment || null]
        );
        return res.status(201).json({ success: true, message: 'রিভিউ যোগ করা হয়েছে।' });
      }
    } catch (err) {
      console.error('Add Review Error:', err);
      return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
    }
  }
);

// ---------------- রিভিউ ডিলিট করা (নিজের রিভিউ অথবা admin) ----------------
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM reviews WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'রিভিউ পাওয়া যায়নি।' });
    }

    if (rows[0].user_id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'শুধু নিজের রিভিউ মুছে ফেলা যাবে।' });
    }

    await db.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'রিভিউ মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('Delete Review Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

module.exports = router;
