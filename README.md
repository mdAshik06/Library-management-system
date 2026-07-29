# Online Bookstore প্রজেক্ট

Node.js + Express.js + MySQL দিয়ে বানানো একটা পূর্ণাঙ্গ অনলাইন বইয়ের দোকান।

## প্রজেক্ট পরিকল্পনা (Phases)

- [x] Phase 1: Database Design + Login/Register
- [x] **Phase 2: Admin Panel + Book CRUD** ← আমরা এখন এখানে আছি
- [ ] Phase 3: Book Catalog (User Side) — Category filter, Search
- [ ] Phase 4: Cart System
- [ ] Phase 5: Checkout + Payment Gateway (bKash/Nagad/SSLCommerz)
- [ ] Phase 6: User Profile + Order History

## ফোল্ডার স্ট্রাকচার
```
bookstore-app/
├── config/
│   └── db.js              # MySQL কানেকশন
├── middleware/
│   └── auth.js            # JWT verify + isAdmin middleware
├── routes/
│   └── auth.js            # register/login/logout/me API
├── public/                 # ফ্রন্টএন্ড
│   ├── register.html
│   ├── login.html
│   ├── profile.html
│   ├── style.css
│   └── script.js
├── server.js
├── database.sql            # পুরো প্রজেক্টের সব টেবিল (সব phase এর জন্য)
├── package.json
└── .env.example
```

## Phase 1 সেটআপ ধাপ

### ১. Dependencies ইনস্টল করুন
```bash
npm install
```

### ২. MySQL ডাটাবেজ তৈরি করুন
MySQL Workbench এ `database.sql` ফাইলের কনটেন্ট রান করুন। এতে পুরো প্রজেক্টের সব টেবিল (users, categories, books, cart_items, orders, order_items) তৈরি হয়ে যাবে — যদিও আমরা এখন শুধু `users` টেবিল ব্যবহার করব, বাকিগুলো পরের ধাপে কাজে লাগবে।

### ৩. `.env` ফাইল তৈরি করুন
`.env.example` কপি করে `.env` বানান, তারপর MySQL password ও একটা random `JWT_SECRET` দিন।

### ৪. সার্ভার চালু করুন
```bash
npm start
```

### ৫. টেস্ট করুন
```
http://localhost:3000/register.html
http://localhost:3000/login.html
```
লগিন করলে `profile.html` এ নিয়ে যাবে, যেখানে JWT টোকেন দিয়ে আপনার তথ্য দেখানো হবে।

## Phase 1 এ যা নতুন (আগের auth-app থেকে)
- Session এর বদলে **JWT Token** ব্যবহার করা হয়েছে (`jsonwebtoken` প্যাকেজ)
- Token browser এর `localStorage` এ সংরক্ষিত থাকে এবং প্রতিটা protected request এ `Authorization: Bearer <token>` header দিয়ে পাঠানো হয়
- `users` টেবিলে নতুন কলাম: `profile_image`, `address`, `is_admin` (পরের ফেজগুলোর জন্য প্রস্তুত)
- Database এ book, cart, order সম্পর্কিত সব টেবিল আগে থেকেই বানানো আছে যাতে পরের ফেজে শুধু কোড লিখলেই হয়

## Phase 2: Admin Panel + Book CRUD

### নতুন কী যোগ হলো
- `routes/books.js` — বই তালিকা (public), বই যোগ/এডিট/ডিলিট (admin only, কভার ছবি আপলোড সহ)
- `routes/categories.js` — ক্যাটাগরি তালিকা (public), ক্যাটাগরি যোগ/ডিলিট (admin only)
- `routes/admin.js` — ড্যাশবোর্ড সামারি (মোট ইউজার/বই/অর্ডার), ইউজার তালিকা
- `middleware/upload.js` — Multer দিয়ে বইয়ের কভার ছবি আপলোড (jpg/png/webp, সর্বোচ্চ 5MB)
- `public/admin.html` — Admin Panel এর UI (ক্যাটাগরি + বই ম্যানেজমেন্ট)
- আপলোড করা ছবি সেভ হয় `public/uploads/covers/` ফোল্ডারে

### নতুন dependency ইনস্টল করতে হবে
Phase 2 এ `multer` প্যাকেজ যোগ হয়েছে, তাই আবার ইনস্টল করে নিন:
```bash
npm install
```

### একজন ইউজারকে Admin বানাবেন কীভাবে
নতুন কোনো ইউজার ডিফল্টভাবে admin না (`is_admin = 0`)। নিজেকে বা কাউকে admin বানাতে MySQL Workbench এ Query ট্যাবে গিয়ে লিখুন:
```sql
UPDATE bookstore.users SET is_admin = 1 WHERE email = 'আপনার_email@example.com';
```
এরপর ⚡ চালান। তারপর ওই email দিয়ে **আবার নতুন করে লগিন করুন** (পুরনো টোকেনে admin তথ্য থাকবে না, নতুন লগিনে নতুন টোকেন পাবেন)।

### টেস্ট করুন
```
http://localhost:3000/admin.html
```
Admin না হলে "আপনার অ্যাডমিন অনুমতি নেই" দেখাবে। Admin হলে ড্যাশবোর্ড, ক্যাটাগরি ও বই ম্যানেজমেন্ট দেখতে পাবেন — এখান থেকে ক্যাটাগরি ও বই যোগ/এডিট/ডিলিট করা যাবে, কভার ছবি সহ।
