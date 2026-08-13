const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// সব রুটেই verifyToken + isAdmin লাগবে
router.use(verifyToken);

router.get('/sales-by-date', async (req, res) => {
  const { date } = req.query;
 }
);









module.exports = router;
