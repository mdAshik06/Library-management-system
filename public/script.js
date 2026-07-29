// এই ফাইলটি register এবং login উভয় পেইজে ব্যবহৃত হয়

function showMessage(text, type) {
  const box = document.getElementById('message');
  box.textContent = text;
  box.className = `message ${type}`;
}

// ---------------- REGISTER FORM ----------------
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'অপেক্ষা করুন...';

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });

      const data = await res.json();

      if (data.success) {
        showMessage(data.message, 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1200);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (err) {
      showMessage('সার্ভারের সাথে সংযোগ করা যায়নি।', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'রেজিস্ট্রেশন করুন';
    }
  });
}

// ---------------- LOGIN FORM ----------------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'অপেক্ষা করুন...';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success) {
        // JWT টোকেন browser এর localStorage এ সংরক্ষণ করা হচ্ছে
        localStorage.setItem('token', data.token);
        showMessage(data.message, 'success');
        // Admin হলে সরাসরি Admin Dashboard এ, সাধারণ ইউজার হলে প্রোফাইল পেইজে
        const redirectTo = data.user && data.user.isAdmin ? 'admin.html' : 'profile.html';
        setTimeout(() => {
          window.location.href = redirectTo;
        }, 800);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (err) {
      showMessage('সার্ভারের সাথে সংযোগ করা যায়নি।', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'লগিন করুন';
    }
  });
}
