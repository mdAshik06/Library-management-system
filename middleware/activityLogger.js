const db = require('../config/db');

// Admin কোনো গুরুত্বপূর্ণ কাজ করলে তার একটা লগ এন্ট্রি রাখা হয়
async function logActivity(adminId, action, details = null) {
  try {
    await db.query(
      'INSERT INTO activity_logs (admin_id, action, details) VALUES (?, ?, ?)',
      [adminId, action, details]
    );
  } catch (err) {
    // লগ লেখা ব্যর্থ হলেও মূল কাজ যেন আটকে না যায়, তাই এখানে শুধু console এ দেখানো হচ্ছে
    console.error('Activity Log Error:', err.message);
  }
}

module.exports = { logActivity };
