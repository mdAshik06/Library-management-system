const multer = require('multer');
const path = require('path');
const fs = require('fs');

// কভার ছবি রাখা হয় public ফোল্ডারে (সবাই দেখতে পারবে)
const coverDir = path.join(__dirname, '..', 'public', 'uploads', 'covers');

// PDF রাখা হয় public এর বাইরে (কেউ সরাসরি লিংক দিয়ে অ্যাক্সেস করতে পারবে না,
// শুধু আমাদের নিজস্ব protected route দিয়ে ডাউনলোড করা যাবে)
const pdfDir = path.join(__dirname, '..', 'uploads', 'pdfs');

// ফোল্ডার না থাকলে নিজে থেকেই তৈরি হয়ে যাবে (আগের মতো ম্যানুয়ালি বানাতে হবে না)
[coverDir, pdfDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'pdfFile') {
      cb(null, pdfDir);
    } else {
      cb(null, coverDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'pdfFile' ? 'bookpdf' : 'book';
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  if (file.fieldname === 'pdfFile') {
    if (path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('শুধুমাত্র PDF ফাইল আপলোড করা যাবে।'));
    }
  } else {
    const allowedTypes = /jpeg|jpg|png|webp/;
    if (allowedTypes.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('শুধুমাত্র jpg, jpeg, png, webp ফরম্যাটের ছবি আপলোড করা যাবে।'));
    }
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // সর্বোচ্চ ২০MB (PDF এর জন্য একটু বড় রাখা হলো)
});

module.exports = { upload, pdfDir };
