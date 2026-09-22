const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// ---------------- কার্ট থেকে অর্ডার তৈরি করা (Checkout) ----------------
router.post('/', async (req, res) => {
  const { shippingAddress, contactMobile, paymentMethod, transactionId, couponCode } = req.body;

  if (!shippingAddress || !contactMobile || !paymentMethod) {
    return res.status(400).json({ success: false, message: 'ঠিকানা, মোবাইল নাম্বার ও পেমেন্ট মেথড দিতে হবে।' });
  }

  // bKash/Nagad এর জন্য Transaction ID বাধ্যতামূলক (dummy payment হলেও)
  if ((paymentMethod === 'bKash' || paymentMethod === 'Nagad') && !transactionId) {
    return res.status(400).json({ success: false, message: 'bKash/Nagad পেমেন্টের জন্য Transaction ID দিতে হবে।' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // ইউজারের কার্টের সব আইটেম (বইয়ের তথ্যসহ) আনা হচ্ছে
    const [cartItems] = await connection.query(
      `SELECT cart_items.book_id, cart_items.quantity, books.price, books.stock, books.title
       FROM cart_items
       JOIN books ON cart_items.book_id = books.id
       WHERE cart_items.user_id = ?`,
      [req.user.id]
    );

    if (cartItems.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'আপনার কার্ট খালি।' });
    }

    // স্টক পর্যাপ্ত আছে কিনা যাচাই করা হচ্ছে
    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `"${item.title}" এর পর্যাপ্ত স্টক নেই।`
        });
      }
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // কুপন কোড থাকলে যাচাই করে ছাড় হিসাব করা হচ্ছে
    let discountAmount = 0;
    let appliedCouponCode = null;

    if (couponCode) {
      const [couponRows] = await connection.query(
        'SELECT * FROM coupons WHERE code = ? AND is_active = 1',
        [couponCode.trim().toUpperCase()]
      );

      if (couponRows.length > 0) {
        const coupon = couponRows[0];
        const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
        if (!isExpired) {
          discountAmount = (subtotal * parseFloat(coupon.discount_percent)) / 100;
          appliedCouponCode = coupon.code;
        }
      }
    }

    const totalAmount = subtotal - discountAmount;

    // পেমেন্ট মেথড অনুযায়ী payment_status ঠিক করা হচ্ছে
    // Cash on Delivery হলে pending, bKash/Nagad হলে admin verify করার আগ পর্যন্ত pending
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, total_amount, payment_method, payment_status, order_status, shipping_address, contact_mobile, transaction_id, coupon_code, discount_amount)
       VALUES (?, ?, ?, 'pending', 'pending', ?, ?, ?, ?, ?)`,
      [req.user.id, totalAmount, paymentMethod, shippingAddress, contactMobile, transactionId || null, appliedCouponCode, discountAmount]
    );

    const orderId = orderResult.insertId;

    // প্রতিটা বইয়ের জন্য order_items এ এন্ট্রি এবং স্টক কমানো হচ্ছে
    for (const item of cartItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, book_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.book_id, item.quantity, item.price]
      );
      await connection.query(
        'UPDATE books SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.book_id]
      );
    }

    // কার্ট খালি করা হচ্ছে
    await connection.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);

    await connection.commit();
    connection.release();

    return res.status(201).json({ success: true, message: 'অর্ডার সফলভাবে সম্পন্ন হয়েছে!', orderId });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Create Order Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- ইউজারের নিজের অর্ডার তালিকা ----------------
router.get('/my', async (req, res) => {
  try {
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    for (const order of orders) {
      const [items] = await db.query(
        `SELECT order_items.quantity, order_items.price, books.id AS book_id, books.title,
                (books.pdf_file IS NOT NULL) AS has_pdf
         FROM order_items JOIN books ON order_items.book_id = books.id
         WHERE order_items.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return res.json({ success: true, orders });
  } catch (err) {
    console.error('Get My Orders Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

module.exports = router;
