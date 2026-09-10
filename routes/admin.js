const express = require('express');
const db = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// সব রুটেই verifyToken + isAdmin লাগবে
router.use(verifyToken, isAdmin);

// ---------------- নির্দিষ্ট তারিখের মোট বিক্রি ----------------
router.get('/sales-by-date', async (req, res) => {
  const { date } = req.query; // ফরম্যাট: YYYY-MM-DD

  if (!date) {
    return res.status(400).json({ success: false, message: 'তারিখ দিতে হবে।' });
  }

  try {
    const [[result]] = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS totalSales, COUNT(*) AS orderCount
       FROM orders
       WHERE DATE(created_at) = ? AND order_status != 'cancelled'`,
      [date]
    );

    return res.json({
      success: true,
      totalSales: result.totalSales,
      orderCount: result.orderCount
    });
  } catch (err) {
    console.error('Sales By Date Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- Admin Activity Log (সাম্প্রতিক ১০০টা) ----------------
router.get('/logs', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT activity_logs.*, users.full_name AS admin_name
      FROM activity_logs
      JOIN users ON activity_logs.admin_id = users.id
      ORDER BY activity_logs.created_at DESC
      LIMIT 100
    `);
    return res.json({ success: true, logs: rows });
  } catch (err) {
    console.error('Get Logs Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- ক্যাটাগরি অনুযায়ী বইয়ের সংখ্যা ----------------
router.get('/category-counts', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT categories.id, categories.name, COUNT(books.id) AS book_count
      FROM categories
      LEFT JOIN books ON books.category_id = categories.id
      GROUP BY categories.id
      ORDER BY book_count DESC
    `);
    return res.json({ success: true, categories: rows });
  } catch (err) {
    console.error('Category Counts Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- ড্যাশবোর্ড সামারি (মোট ইউজার, মোট বই) ----------------
router.get('/summary', async (req, res) => {
  try {
    const [[userCount]] = await db.query('SELECT COUNT(*) AS total FROM users');
    const [[bookCount]] = await db.query('SELECT COUNT(*) AS total FROM books');

    // orders টেবিল Phase 5 এ ব্যবহার শুরু হবে, তাই আপাতত থাকলে count করব, না থাকলে ০
    let orderCount = { total: 0 };
    try {
      const [[oc]] = await db.query('SELECT COUNT(*) AS total FROM orders');
      orderCount = oc;
    } catch (e) {
      // orders টেবিল খালি থাকলেও সমস্যা নেই
    }

    return res.json({
      success: true,
      summary: {
        totalUsers: userCount.total,
        totalBooks: bookCount.total,
        totalOrders: orderCount.total
      }
    });
  } catch (err) {
    console.error('Admin Summary Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- সব রিভিউ (ঐচ্ছিক ক্যাটাগরি ফিল্টার সহ) ----------------
router.get('/reviews', async (req, res) => {
  const { category } = req.query;

  try {
    let query = `
      SELECT reviews.id, reviews.rating, reviews.comment, reviews.created_at,
             users.full_name AS reviewer_name, users.email AS reviewer_email,
             books.id AS book_id, books.title AS book_title,
             categories.id AS category_id, categories.name AS category_name
      FROM reviews
      JOIN users ON reviews.user_id = users.id
      JOIN books ON reviews.book_id = books.id
      LEFT JOIN categories ON books.category_id = categories.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND categories.id = ?';
      params.push(category);
    }

    query += ' ORDER BY reviews.created_at DESC';

    const [rows] = await db.query(query, params);
    return res.json({ success: true, reviews: rows });
  } catch (err) {
    console.error('Admin Reviews Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- বইভিত্তিক উইশলিস্ট সামারি (কতজন কোন বই উইশলিস্ট করেছে) ----------------
router.get('/wishlist-summary', async (req, res) => {
  const { category } = req.query;

  try {
    let query = `
      SELECT books.id AS book_id, books.title AS book_title,
             categories.id AS category_id, categories.name AS category_name,
             COUNT(wishlist_items.id) AS wishlist_count
      FROM wishlist_items
      JOIN books ON wishlist_items.book_id = books.id
      LEFT JOIN categories ON books.category_id = categories.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND categories.id = ?';
      params.push(category);
    }

    query += ' GROUP BY books.id ORDER BY wishlist_count DESC';

    const [rows] = await db.query(query, params);
    return res.json({ success: true, items: rows });
  } catch (err) {
    console.error('Admin Wishlist Summary Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- Best-Selling বই (সবচেয়ে বেশি বিক্রি) ----------------
router.get('/analytics/best-selling', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT books.id, books.title, books.cover_image,
             SUM(order_items.quantity) AS total_sold,
             SUM(order_items.quantity * order_items.price) AS total_revenue
      FROM order_items
      JOIN orders ON order_items.order_id = orders.id
      JOIN books ON order_items.book_id = books.id
      WHERE orders.order_status != 'cancelled'
      GROUP BY books.id
      ORDER BY total_sold DESC
      LIMIT 5
    `);
    return res.json({ success: true, books: rows });
  } catch (err) {
    console.error('Best Selling Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- Low Stock Alert (স্টক কম আছে এমন বই) ----------------
router.get('/analytics/low-stock', async (req, res) => {
  const threshold = parseInt(req.query.threshold) || 5;

  try {
    const [rows] = await db.query(
      `SELECT id, title, stock FROM books WHERE stock <= ? ORDER BY stock ASC`,
      [threshold]
    );
    return res.json({ success: true, books: rows, threshold });
  } catch (err) {
    console.error('Low Stock Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- বিক্রির ট্রেন্ড (গত ৭ অথবা ৩০ দিন) ----------------
router.get('/analytics/sales-trend', async (req, res) => {
  const days = req.query.period === 'monthly' ? 30 : 7;

  try {
    const [rows] = await db.query(
      `SELECT DATE(created_at) AS date, SUM(total_amount) AS total
       FROM orders
       WHERE order_status != 'cancelled' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );
    return res.json({ success: true, trend: rows });
  } catch (err) {
    console.error('Sales Trend Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- Top Rated বই ----------------
router.get('/analytics/top-rated', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT books.id, books.title, books.cover_image,
             AVG(reviews.rating) AS avg_rating,
             COUNT(reviews.id) AS review_count
      FROM reviews
      JOIN books ON reviews.book_id = books.id
      GROUP BY books.id
      ORDER BY avg_rating DESC, review_count DESC
      LIMIT 5
    `);
    return res.json({ success: true, books: rows });
  } catch (err) {
    console.error('Top Rated Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- ⚠️ সব ক্যাটাগরি একসাথে ডিলিট করা ----------------
router.delete('/bulk/categories', async (req, res) => {
  try {
    const [[countRow]] = await db.query('SELECT COUNT(*) AS total FROM categories');
    await db.query('DELETE FROM categories');
    await logActivity(req.user.id, 'Bulk delete: all categories', `${countRow.total}টা ক্যাটাগরি মোছা হয়েছে`);
    return res.json({ success: true, message: `${countRow.total}টা ক্যাটাগরি মুছে ফেলা হয়েছে।` });
  } catch (err) {
    console.error('Bulk Delete Categories Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- ⚠️ সব বই একসাথে ডিলিট করা ----------------
router.delete('/bulk/books', async (req, res) => {
  try {
    const [[countRow]] = await db.query('SELECT COUNT(*) AS total FROM books');
    await db.query('DELETE FROM books');
    await logActivity(req.user.id, 'Bulk delete: all books', `${countRow.total}টা বই মোছা হয়েছে`);
    return res.json({ success: true, message: `${countRow.total}টা বই মুছে ফেলা হয়েছে।` });
  } catch (err) {
    console.error('Bulk Delete Books Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- ⚠️ সব (non-admin) ইউজার একসাথে ডিলিট করা ----------------
// নিরাপত্তার জন্য কোনো admin একাউন্ট এখানে ডিলিট হবে না
router.delete('/bulk/users', async (req, res) => {
  try {
    const [[countRow]] = await db.query('SELECT COUNT(*) AS total FROM users WHERE is_admin = 0');
    await db.query('DELETE FROM users WHERE is_admin = 0');
    await logActivity(req.user.id, 'Bulk delete: all customers', `${countRow.total}টা ইউজার মোছা হয়েছে (admin বাদে)`);
    return res.json({ success: true, message: `${countRow.total}টা ইউজার মুছে ফেলা হয়েছে (admin একাউন্ট বাদে)।` });
  } catch (err) {
    console.error('Bulk Delete Users Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- সব ইউজারের তালিকা ----------------
router.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, is_admin, is_blocked, created_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ success: true, users: rows });
  } catch (err) {
    console.error('Admin Users Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- ইউজার Block/Unblock করা ----------------
router.put('/users/:id/block', async (req, res) => {
  const { isBlocked } = req.body;

  try {
    const [rows] = await db.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ইউজার পাওয়া যায়নি।' });
    }

    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'নিজেকে ব্লক করা যাবে না।' });
    }

    await db.query('UPDATE users SET is_blocked = ? WHERE id = ?', [isBlocked ? 1 : 0, req.params.id]);
    await logActivity(req.user.id, isBlocked ? 'User blocked' : 'User unblocked', `User ID: ${req.params.id}`);
    return res.json({ success: true, message: isBlocked ? 'ইউজার ব্লক করা হয়েছে।' : 'ইউজার আনব্লক করা হয়েছে।' });
  } catch (err) {
    console.error('Block User Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- ইউজারকে Admin বানানো/সরানো ----------------
router.put('/users/:id/admin', async (req, res) => {
  const { isAdmin } = req.body;

  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'নিজের admin status পরিবর্তন করা যাবে না।' });
    }

    await db.query('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin ? 1 : 0, req.params.id]);
    await logActivity(req.user.id, isAdmin ? 'Made user admin' : 'Removed admin access', `User ID: ${req.params.id}`);
    return res.json({ success: true, message: isAdmin ? 'ইউজারকে Admin বানানো হয়েছে।' : 'ইউজারের Admin অনুমতি সরানো হয়েছে।' });
  } catch (err) {
    console.error('Make Admin Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- নির্দিষ্ট ইউজারের সব অর্ডার হিস্টোরি ----------------
router.get('/users/:id/orders', async (req, res) => {
  try {
    const [user] = await db.query('SELECT full_name, email FROM users WHERE id = ?', [req.params.id]);
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'ইউজার পাওয়া যায়নি।' });
    }

    const [orders] = await db.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    for (const order of orders) {
      const [items] = await db.query(
        `SELECT order_items.quantity, order_items.price, books.title
         FROM order_items JOIN books ON order_items.book_id = books.id
         WHERE order_items.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return res.json({ success: true, user: user[0], orders });
  } catch (err) {
    console.error('User Orders Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- একটা নির্দিষ্ট অর্ডারের সম্পূর্ণ বিস্তারিত ----------------
router.get('/orders/:id', async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT orders.*, users.full_name, users.email
       FROM orders JOIN users ON orders.user_id = users.id
       WHERE orders.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'অর্ডার পাওয়া যায়নি।' });
    }

    const order = orders[0];
    const [items] = await db.query(
      `SELECT order_items.quantity, order_items.price, books.title, books.author
       FROM order_items JOIN books ON order_items.book_id = books.id
       WHERE order_items.order_id = ?`,
      [order.id]
    );
    order.items = items;

    return res.json({ success: true, order });
  } catch (err) {
    console.error('Get Order Detail Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- একসাথে একাধিক অর্ডারের status পরিবর্তন করা (Bulk Update) ----------------
router.put('/orders/bulk-status', async (req, res) => {
  const { orderIds, orderStatus } = req.body;
  const validStatuses = ['pending', 'accepted', 'shipped', 'delivered', 'cancelled'];

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ success: false, message: 'কোনো অর্ডার সিলেক্ট করা হয়নি।' });
  }

  if (!validStatuses.includes(orderStatus)) {
    return res.status(400).json({ success: false, message: 'সঠিক status দিতে হবে।' });
  }

  try {
    await db.query(
      `UPDATE orders SET order_status = ? WHERE id IN (${orderIds.map(() => '?').join(',')})`,
      [orderStatus, ...orderIds]
    );
    await logActivity(req.user.id, 'Bulk order status update', `${orderIds.length} orders → ${orderStatus}`);
    return res.json({ success: true, message: `${orderIds.length}টা অর্ডারের status আপডেট হয়েছে।` });
  } catch (err) {
    console.error('Bulk Update Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- সব অর্ডারের তালিকা (কাস্টমার তথ্য ও বইয়ের বিস্তারিত সহ) ----------------
router.get('/orders', async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT orders.*, users.full_name, users.email
       FROM orders
       JOIN users ON orders.user_id = users.id
       ORDER BY orders.created_at DESC`
    );

    for (const order of orders) {
      const [items] = await db.query(
        `SELECT order_items.quantity, order_items.price, books.title
         FROM order_items JOIN books ON order_items.book_id = books.id
         WHERE order_items.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return res.json({ success: true, orders });
  } catch (err) {
    console.error('Admin Orders Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- অর্ডারের status পরিবর্তন করা (Pending/Accepted/Shipped/Delivered/Cancelled) ----------------
router.put('/orders/:id/status', async (req, res) => {
  const { orderStatus } = req.body;
  const validStatuses = ['pending', 'accepted', 'shipped', 'delivered', 'cancelled'];

  if (!validStatuses.includes(orderStatus)) {
    return res.status(400).json({ success: false, message: 'সঠিক status দিতে হবে।' });
  }

  try {
    await db.query('UPDATE orders SET order_status = ? WHERE id = ?', [orderStatus, req.params.id]);
    await logActivity(req.user.id, 'Order status updated', `Order #${req.params.id} → ${orderStatus}`);
    return res.json({ success: true, message: 'অর্ডারের status আপডেট হয়েছে।' });
  } catch (err) {
    console.error('Update Order Status Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

// ---------------- পেমেন্ট status পরিবর্তন করা (Pending/Paid/Failed) ----------------
router.put('/orders/:id/payment', async (req, res) => {
  const { paymentStatus } = req.body;
  const validStatuses = ['pending', 'paid', 'failed'];

  if (!validStatuses.includes(paymentStatus)) {
    return res.status(400).json({ success: false, message: 'সঠিক payment status দিতে হবে।' });
  }

  try {
    await db.query('UPDATE orders SET payment_status = ? WHERE id = ?', [paymentStatus, req.params.id]);
    await logActivity(req.user.id, 'Payment status updated', `Order #${req.params.id} → ${paymentStatus}`);
    return res.json({ success: true, message: 'পেমেন্ট status আপডেট হয়েছে।' });
  } catch (err) {
    console.error('Update Payment Status Error:', err);
    return res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
});

module.exports = router;
