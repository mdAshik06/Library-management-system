const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// ---------------- অ্যাডমিন: সব কুপন দেখা ----------------
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
    return res.json({ success: true, coupons: rows });
  } catch (err) {
    console.error('Get Coupons Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- অ্যাডমিন: নতুন কুপন তৈরি করা ----------------
router.post(
  '/',
  verifyToken,
  isAdmin,
  [
    body('code').trim().notEmpty().withMessage('কুপন কোড দিতে হবে।'),
    body('discountPercent').isFloat({ min: 1, max: 100 }).withMessage('ছাড়ের হার ১ থেকে ১০০ এর মধ্যে হতে হবে।')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { code, discountPercent, expiryDate } = req.body;
    const upperCode = code.trim().toUpperCase();

    try {
      const [existing] = await db.query('SELECT id FROM coupons WHERE code = ?', [upperCode]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'এই কোড আগে থেকেই আছে।' });
      }

      await db.query(
        'INSERT INTO coupons (code, discount_percent, expiry_date) VALUES (?, ?, ?)',
        [upperCode, discountPercent, expiryDate || null]
      );

      await logActivity(req.user.id, 'Coupon created', `"${upperCode}" (${discountPercent}%)`);
      return res.status(201).json({ success: true, message: 'কুপন তৈরি করা হয়েছে।' });
    } catch (err) {
      console.error('Create Coupon Error:', err);
      return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
    }
  }
);

// ---------------- অ্যাডমিন: কুপন Active/Inactive টগল করা ----------------
router.put('/:id/toggle', verifyToken, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT is_active FROM coupons WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'কুপন পাওয়া যায়নি।' });
    }

    const newStatus = !rows[0].is_active;
    await db.query('UPDATE coupons SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
    return res.json({ success: true, message: newStatus ? 'কুপন Active করা হয়েছে।' : 'কুপন Inactive করা হয়েছে।' });
  } catch (err) {
    console.error('Toggle Coupon Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- অ্যাডমিন: কুপন ডিলিট করা ----------------
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM coupons WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'কুপন মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('Delete Coupon Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- ইউজার: কুপন কোড যাচাই করা (checkout এর সময়) ----------------
router.post('/validate', verifyToken, async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: 'কুপন কোড দিন।' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM coupons WHERE code = ? AND is_active = 1',
      [code.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'অবৈধ অথবা নিষ্ক্রিয় কুপন কোড।' });
    }

    const coupon = rows[0];

    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      return res.status(400).json({ success: false, message: 'কুপনের মেয়াদ শেষ হয়ে গেছে।' });
    }

    return res.json({
      success: true,
      code: coupon.code,
      discountPercent: parseFloat(coupon.discount_percent)
    });
  } catch (err) {
    console.error('Validate Coupon Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

module.exports = router;
