const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// সব রুটেই verifyToken + isAdmin লাগবে
router.use(verifyToken);











module.exports = router;
