const multer = require('multer');
const path = require('path');

// কভার ছবি কোথায় এবং কী নামে সেভ হবে তা ঠিক করা হচ্ছে
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads', 'covers'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `book-${uniqueSuffix}${ext}`);
  }
});

// শুধু ছবি ফাইল (jpg, jpeg, png, webp) আপলোড করার অনুমতি দেওয়া হচ্ছে
function fileFilter(req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error('শুধুমাত্র jpg, jpeg, png, webp ফরম্যাটের ছবি আপলোড করা যাবে।'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // সর্বোচ্চ ৫MB
});

module.exports = upload;
