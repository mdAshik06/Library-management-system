const jwt = require('jsonwebtoken');

// টোকেন যাচাই করার middleware - লগিন করা আছে কিনা চেক করে
function verifyToken(req, res, next) {
  // টোকেন হয় Authorization header থেকে, নাহলে cookie থেকে নেওয়া হচ্ছে
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;
  const token = tokenFromHeader || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'অনুগ্রহ করে প্রথমে লগিন করুন।' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, isAdmin }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'টোকেনের মেয়াদ শেষ অথবা অবৈধ।' });
  }
}

// অ্যাডমিন কিনা যাচাই করার middleware - verifyToken এর পরে ব্যবহার করতে হবে
function isAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'শুধুমাত্র অ্যাডমিনরা এই কাজ করতে পারবেন।' });
}

module.exports = { verifyToken, isAdmin };
