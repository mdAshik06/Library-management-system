function showMessage(text, type) {
  const box = document.getElementById('message');
  box.textContent = text;
  box.className = `message ${type}`;
}

function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

const token = getTokenFromUrl();

if (!token) {
  showMessage('অবৈধ reset link। আবার "পাসওয়ার্ড ভুলে গেছেন?" থেকে চেষ্টা করুন।', 'error');
  document.getElementById('resetForm').style.display = 'none';
}

document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    showMessage('দুটো পাসওয়ার্ড মিলছে না।', 'error');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'অপেক্ষা করুন...';

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    const data = await res.json();

    if (data.success) {
      showMessage(data.message, 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } else {
      showMessage(data.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'পাসওয়ার্ড পরিবর্তন করুন';
    }
  } catch (err) {
    showMessage('সার্ভারের সাথে সংযোগ করা যায়নি।', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'পাসওয়ার্ড পরিবর্তন করুন';
  }
});
