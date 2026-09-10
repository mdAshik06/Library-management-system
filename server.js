require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const categoryRoutes = require('./routes/categories');
const adminRoutes = require('./routes/admin');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static ফাইল (HTML, CSS, JS, uploaded ছবি) সার্ভ করা হচ্ছে
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);


// ফাইল আপলোড বা অন্যান্য error হ্যান্ডেল করার জন্য
app.use((err, req, res, next) => {
  if (err) {
    console.error('Server Error:', err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Server চলছে: http://localhost:${PORT}`);
});
