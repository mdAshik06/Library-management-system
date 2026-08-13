const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// সব রুটেই verifyToken + isAdmin লাগবে
router.use(verifyToken);

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









module.exports = router;
