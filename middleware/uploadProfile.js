const multer = require('multer');
const path = require('path');

// প্রোফাইল ছবি কোথায় এবং কী নামে সেভ হবে তা ঠিক করা হচ্ছে
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads', 'profiles'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error('শুধুমাত্র jpg, jpeg, png, webp ফরম্যাটের ছবি আপলোড করা যাবে।'));
  }
}

const uploadProfile = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 } // সর্বোচ্চ ৩MB
});

module.exports = uploadProfile;
