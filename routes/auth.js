const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const uploadProfile = require('../middleware/uploadProfile');

const router = express.Router();

// টোকেন তৈরি করার helper function
function generateToken(user) {
  return jwt.sign(
    { id: user.id, isAdmin: !!user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ---------------- REGISTER ----------------
router.post(
  '/register',
  [
    body('fullName').trim().notEmpty().withMessage('Full name দিতে হবে।'),
    body('email').trim().isEmail().withMessage('সঠিক Email দিন।'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password কমপক্ষে ৬ অক্ষরের হতে হবে।')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { fullName, email, password } = req.body;

    try {
      const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'এই Email দিয়ে আগে থেকেই একাউন্ট আছে।' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await db.query(
        'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
        [fullName, email, hashedPassword]
      );

      return res.status(201).json({ success: true, message: 'রেজিস্ট্রেশন সফল হয়েছে! এখন লগিন করুন।' });
    } catch (err) {
      console.error('Register Error:', err);
      return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
    }
  }
);

// ---------------- LOGIN ----------------
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('সঠিক Email দিন।'),
    body('password').notEmpty().withMessage('Password দিতে হবে।')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    try {
      const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'ভুল Email অথবা Password।' });
      }

      const user = rows[0];

      if (user.is_blocked) {
        return res.status(403).json({ success: false, message: 'আপনার একাউন্ট সাসপেন্ড করা হয়েছে। বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।' });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'ভুল Email অথবা Password।' });
      }

      const token = generateToken(user);

      // টোকেন cookie হিসেবেও পাঠানো হচ্ছে (browser থেকে সহজে ব্যবহারের জন্য)
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // ৭ দিন
      });

      return res.status(200).json({
        success: true,
        message: 'লগিন সফল হয়েছে!',
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          isAdmin: !!user.is_admin
        }
      });
    } catch (err) {
      console.error('Login Error:', err);
      return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
    }
  }
);

// ---------------- LOGOUT ----------------
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({ success: true, message: 'লগআউট সফল হয়েছে।' });
});

// ---------------- CURRENT LOGGED-IN USER (protected) ----------------
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, profile_image, address, mobile, is_admin, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ইউজার পাওয়া যায়নি।' });
    }
    return res.status(200).json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('Me Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- প্রোফাইল আপডেট করা (নাম, ঠিকানা, মোবাইল, ছবি) ----------------
router.put('/profile', verifyToken, uploadProfile.single('profileImage'), async (req, res) => {
  const { fullName, address, mobile } = req.body;

  try {
    const [existingRows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'ইউজার পাওয়া যায়নি।' });
    }

    const existing = existingRows[0];
    const profileImage = req.file ? `/uploads/profiles/${req.file.filename}` : existing.profile_image;

    await db.query(
      'UPDATE users SET full_name = ?, address = ?, mobile = ?, profile_image = ? WHERE id = ?',
      [
        fullName || existing.full_name,
        address !== undefined ? address : existing.address,
        mobile !== undefined ? mobile : existing.mobile,
        profileImage,
        req.user.id
      ]
    );

    return res.json({ success: true, message: 'প্রোফাইল আপডেট করা হয়েছে।' });
  } catch (err) {
    console.error('Update Profile Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- Forgot Password: reset link তৈরি করা (demo মোড, সরাসরি দেখানো হয়) ----------------
router.post(
  '/forgot-password',
  [body('email').trim().isEmail().withMessage('সঠিক Email দিন।')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { email } = req.body;

    try {
      const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'এই Email দিয়ে কোনো একাউন্ট পাওয়া যায়নি।' });
      }

      // ১৫ মিনিটের জন্য বৈধ একটা reset token তৈরি করা হচ্ছে
      const resetToken = jwt.sign(
        { id: rows[0].id, purpose: 'reset' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      // বাস্তবে এই লিংক ইমেইলে পাঠানো হতো, এখানে demo হিসেবে সরাসরি রেসপন্সে দেওয়া হচ্ছে
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;

      return res.json({
        success: true,
        message: 'Reset link তৈরি হয়েছে (demo মোড, ইমেইল পাঠানো হয়নি)।',
        resetLink
      });
    } catch (err) {
      console.error('Forgot Password Error:', err);
      return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
    }
  }
);

// ---------------- Reset Password: টোকেন যাচাই করে নতুন পাসওয়ার্ড সেট করা ----------------
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token পাওয়া যায়নি।'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password কমপক্ষে ৬ অক্ষরের হতে হবে।')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { token, newPassword } = req.body;

    try {
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'লিংকের মেয়াদ শেষ হয়ে গেছে অথবা এটি অবৈধ। আবার চেষ্টা করুন।' });
      }

      if (decoded.purpose !== 'reset') {
        return res.status(400).json({ success: false, message: 'অবৈধ reset link।' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, decoded.id]);

      return res.json({ success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগিন করুন।' });
    } catch (err) {
      console.error('Reset Password Error:', err);
      return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
    }
  }
);

module.exports = router;
