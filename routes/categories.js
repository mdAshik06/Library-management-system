const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// ---------------- সবার জন্য: ক্যাটাগরি লিস্ট দেখা ----------------
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY name ASC');
    return res.json({ success: true, categories: rows });
  } catch (err) {
    console.error('Get Categories Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- অ্যাডমিন: নতুন ক্যাটাগরি যোগ করা ----------------
router.post(
  '/',
  verifyToken,
  isAdmin,
  [body('name').trim().notEmpty().withMessage('ক্যাটাগরির নাম দিতে হবে।')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name } = req.body;

    try {
      const [existing] = await db.query('SELECT id FROM categories WHERE name = ?', [name]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'এই নামে ক্যাটাগরি আগে থেকেই আছে।' });
      }

      const [result] = await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
      await logActivity(req.user.id, 'Category added', `"${name}"`);
      return res.status(201).json({ success: true, message: 'ক্যাটাগরি যোগ করা হয়েছে।', categoryId: result.insertId });
    } catch (err) {
      console.error('Add Category Error:', err);
      return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
    }
  }
);

// ---------------- অ্যাডমিন: ক্যাটাগরি ডিলিট করা ----------------
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT name FROM categories WHERE id = ?', [req.params.id]);
    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      await logActivity(req.user.id, 'Category deleted', `"${rows[0].name}"`);
    }
    return res.json({ success: true, message: 'ক্যাটাগরি মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('Delete Category Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

module.exports = router;
