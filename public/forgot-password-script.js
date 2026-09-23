function showMessage(text, type) {
  const box = document.getElementById('message');
  box.textContent = text;
  box.className = `message ${type}`;
}

document.getElementById('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'অপেক্ষা করুন...';

  const email = document.getElementById('email').value.trim();
  document.getElementById('resetLinkBox').style.display = 'none';

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (data.success) {
      showMessage(data.message, 'success');
      const anchor = document.getElementById('resetLinkAnchor');
      anchor.href = data.resetLink;
      anchor.textContent = data.resetLink;
      document.getElementById('resetLinkBox').style.display = 'block';
    } else {
      showMessage(data.message, 'error');
    }
  } catch (err) {
    showMessage('সার্ভারের সাথে সংযোগ করা যায়নি।', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Reset Link পান';
  }
});
