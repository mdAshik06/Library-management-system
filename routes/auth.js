const express = require('express');


const router = express.Router();
function generateToken(user) {
  return jwt.sign(
    { id: user.id, isAdmin: !!user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = router;
