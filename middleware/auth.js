const jwt = require('jsonwebtoken');

// টোকেন যাচাই করার middleware - লগিন করা আছে কিনা চেক করে
function verifyToken(req, res, next) {
  // টোকেন হয় Authorization header থেকে, নাহলে cookie থেকে নেওয়া হচ্ছে
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;
  const token = tokenFromHeader || req.cookies?.token;

}


module.exports = { verifyToken };
