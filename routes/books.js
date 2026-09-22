const express = require('express');
const path = require('path');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { upload, pdfDir } = require('../middleware/uploadBookFiles');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// ---------------- সবার জন্য: বইয়ের তালিকা (সার্চ ও ক্যাটাগরি ফিল্টার সহ) ----------------
router.get('/', async (req, res) => {
  try {
    const { search, category, featured, hasPdf } = req.query;

    let query = `
      SELECT books.*, categories.name AS category_name,
             COALESCE((SELECT AVG(rating) FROM reviews WHERE reviews.book_id = books.id), 0) AS avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE reviews.book_id = books.id) AS review_count
      FROM books
      LEFT JOIN categories ON books.category_id = categories.id
      WHERE 1=1
    `;
    const params = [];

    if (featured === 'true') {
      query += ' AND books.is_featured = 1';
    }

    if (hasPdf === 'true') {
      query += ' AND books.pdf_file IS NOT NULL';
    }

    if (search) {
      query += ' AND (books.title LIKE ? OR books.author LIKE ? OR categories.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ' AND books.category_id = ?';
      params.push(category);
    }

    query += ' ORDER BY books.created_at DESC';

    const [rows] = await db.query(query, params);
    return res.json({ success: true, books: rows });
  } catch (err) {
    console.error('Get Books Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- সবার জন্য: একটা নির্দিষ্ট বইয়ের বিস্তারিত ----------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT books.*, categories.name AS category_name,
              COALESCE((SELECT AVG(rating) FROM reviews WHERE reviews.book_id = books.id), 0) AS avg_rating,
              (SELECT COUNT(*) FROM reviews WHERE reviews.book_id = books.id) AS review_count
       FROM books LEFT JOIN categories ON books.category_id = categories.id
       WHERE books.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'বই পাওয়া যায়নি।' });
    }
    return res.json({ success: true, book: rows[0] });
  } catch (err) {
    console.error('Get Book Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- অ্যাডমিন: নতুন বই যোগ করা (কভার ছবি সহ) ----------------
router.post(
  '/',
  verifyToken,
  isAdmin,
  upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'pdfFile', maxCount: 1 }]),
  [
    body('title').trim().notEmpty().withMessage('বইয়ের নাম দিতে হবে।'),
    body('author').trim().notEmpty().withMessage('লেখকের নাম দিতে হবে।'),
    body('price').isFloat({ min: 0 }).withMessage('সঠিক দাম দিতে হবে।'),
    body('stock').isInt({ min: 0 }).withMessage('সঠিক স্টক সংখ্যা দিতে হবে।')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { title, author, categoryId, price, stock, description, isFeatured } = req.body;
    const coverImage = req.files?.coverImage ? `/uploads/covers/${req.files.coverImage[0].filename}` : null;
    const pdfFile = req.files?.pdfFile ? req.files.pdfFile[0].filename : null;

    try {
      const [result] = await db.query(
        `INSERT INTO books (title, author, category_id, price, stock, description, cover_image, is_featured, pdf_file)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, author, categoryId || null, price, stock, description || null, coverImage, isFeatured === 'true' || isFeatured === true ? 1 : 0, pdfFile]
      );
      await logActivity(req.user.id, 'Book added', `"${title}"`);
      return res.status(201).json({ success: true, message: 'বই যোগ করা হয়েছে।', bookId: result.insertId });
    } catch (err) {
      console.error('Add Book Error:', err);
      return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
    }
  }
);

// ---------------- অ্যাডমিন: বই আপডেট করা ----------------
router.put(
  '/:id',
  verifyToken,
  isAdmin,
  upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'pdfFile', maxCount: 1 }]),
  async (req, res) => {
    const { title, author, categoryId, price, stock, description, isFeatured } = req.body;

    try {
      const [existingRows] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
      if (existingRows.length === 0) {
        return res.status(404).json({ success: false, message: 'বই পাওয়া যায়নি।' });
      }

      const existing = existingRows[0];
      const coverImage = req.files?.coverImage ? `/uploads/covers/${req.files.coverImage[0].filename}` : existing.cover_image;
      const pdfFile = req.files?.pdfFile ? req.files.pdfFile[0].filename : existing.pdf_file;
      const featuredValue = isFeatured !== undefined ? (isFeatured === 'true' || isFeatured === true ? 1 : 0) : existing.is_featured;

      await db.query(
        `UPDATE books SET title = ?, author = ?, category_id = ?, price = ?, stock = ?, description = ?, cover_image = ?, is_featured = ?, pdf_file = ?
         WHERE id = ?`,
        [
          title || existing.title,
          author || existing.author,
          categoryId || existing.category_id,
          price || existing.price,
          stock !== undefined ? stock : existing.stock,
          description || existing.description,
          coverImage,
          featuredValue,
          pdfFile,
          req.params.id
        ]
      );

      await logActivity(req.user.id, 'Book updated', `"${existing.title}"`);
      return res.json({ success: true, message: 'বই আপডেট করা হয়েছে।' });
    } catch (err) {
      console.error('Update Book Error:', err);
      return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
    }
  }
);

// ---------------- অ্যাডমিন: বই ডিলিট করা ----------------
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT title FROM books WHERE id = ?', [req.params.id]);
    await db.query('DELETE FROM books WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      await logActivity(req.user.id, 'Book deleted', `"${rows[0].title}"`);
    }
    return res.json({ success: true, message: 'বই মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('Delete Book Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- PDF ডাউনলোড করা (শুধু যে বই পেমেন্ট সম্পন্ন হয়ে কেনা হয়েছে) ----------------
router.get('/:id/download', verifyToken, async (req, res) => {
  try {
    const [bookRows] = await db.query('SELECT title, pdf_file FROM books WHERE id = ?', [req.params.id]);
    if (bookRows.length === 0 || !bookRows[0].pdf_file) {
      return res.status(404).json({ success: false, message: 'এই বইয়ের PDF ভার্সন নেই।' });
    }

    // ইউজার এই বইটা কিনেছে এবং পেমেন্ট সম্পন্ন হয়েছে কিনা যাচাই করা হচ্ছে
    const [purchaseRows] = await db.query(
      `SELECT orders.id FROM orders
       JOIN order_items ON order_items.order_id = orders.id
       WHERE orders.user_id = ? AND order_items.book_id = ? AND orders.payment_status = 'paid'
       LIMIT 1`,
      [req.user.id, req.params.id]
    );

    if (purchaseRows.length === 0) {
      return res.status(403).json({ success: false, message: 'এই বইয়ের PDF ডাউনলোড করতে হলে আগে কিনে পেমেন্ট সম্পন্ন করতে হবে।' });
    }

    const filePath = path.join(pdfDir, bookRows[0].pdf_file);
    return res.download(filePath, `${bookRows[0].title}.pdf`);
  } catch (err) {
    console.error('Download PDF Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

module.exports = router;
