// =============================================
//  EduRank — index.js
//  Login & Authentication (unified)
// =============================================

// ── Once page loads ──
document.addEventListener('DOMContentLoaded', function() {
  // If already logged in, go straight to dashboard
  const existing = localStorage.getItem("edurank_current");
  if (existing) {
    window.location.href = "dashboard.html";
    return;
  }

  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('active');
  }

  // Auto-focus input
  const loginInput = document.getElementById('loginInput');
  if (loginInput) {
    loginInput.focus();
  }

  // Nav scroll effect
  const nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', function() {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    });
  }
});

// ── Handle login (unified — creates account if new) ──
async function handleLogin() {
  const input = document.getElementById('loginInput');
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  const btnText = document.getElementById('loginBtnText');
  const spinner = document.getElementById('loginSpinner');

  const name = input.value.trim();

  if (!name) {
    errorEl.textContent = '❌ Please enter your name';
    input.focus();
    return;
  }

  if (name.length < 2) {
    errorEl.textContent = '❌ Name must be at least 2 characters';
    input.focus();
    return;
  }

  // Show loading state
  btn.disabled = true;
  btnText.style.display = 'none';
  spinner.style.display = 'inline';
  errorEl.textContent = '';

  try {
    // Title-case name (each word capitalized)
    const displayName = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    // Call unified login API
    const student = await loginStudent(displayName);

    if (!student || student._error) {
      errorEl.textContent = `❌ ${student ? student._error : 'Failed to login. Please try again.'}`;
      btn.disabled = false;
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
      return;
    }

    // Success — redirect to dashboard
    errorEl.textContent = '';
    
    // Explicitly sync new login
    if (typeof syncUser === 'function') {
      await syncUser();
    }
    
    window.location.href = 'dashboard.html';

  } catch (error) {
    console.error('Login error:', error);
    errorEl.textContent = '❌ Connection error. Is the backend running?';
    btn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
  }
}

// ── Handle signup (same as login — unified endpoint) ──
async function handleSignup() {
  const input = document.getElementById('signupInput');
  const errorEl = document.getElementById('signupError');
  const btn = document.getElementById('signupBtn');
  const btnText = document.getElementById('signupBtnText');
  const spinner = document.getElementById('signupSpinner');

  const name = input.value.trim();

  if (!name) {
    errorEl.textContent = '❌ Please enter your name';
    input.focus();
    return;
  }

  if (name.length < 2) {
    errorEl.textContent = '❌ Name must be at least 2 characters';
    input.focus();
    return;
  }

  // Show loading state
  btn.disabled = true;
  btnText.style.display = 'none';
  spinner.style.display = 'inline';
  errorEl.textContent = '';

  try {
    // Title-case name (each word capitalized)
    const displayName = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    // Call the SAME unified login API (creates if new)
    const student = await loginStudent(displayName);

    if (!student || student._error) {
      errorEl.textContent = `❌ ${student ? student._error : 'Failed to create account. Please try again.'}`;
      btn.disabled = false;
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
      return;
    }

    // Success — redirect to dashboard
    errorEl.textContent = '';
    
    // Explicitly sync new login
    if (typeof syncUser === 'function') {
      await syncUser();
    }
    
    window.location.href = 'dashboard.html';

  } catch (error) {
    console.error('Signup error:', error);
    errorEl.textContent = '❌ Connection error. Is the backend running?';
    btn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
  }
}

// ── Switch between login and signup tabs ──
function switchTab(tab) {
  document.getElementById('loginTab').classList.remove('active');
  document.getElementById('signupTab').classList.remove('active');
  document.getElementById(tab + 'Tab').classList.add('active');

  // Clear errors
  document.getElementById('loginError').textContent = '';
  document.getElementById('signupError').textContent = '';

  // Focus input
  const input = document.getElementById(tab + 'Input');
  if (input) input.focus();
}

// ── Close auth modal ──
function closeAuthModal(event) {
  if (event && event.target.id !== 'authModal') return;
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
}

// ── Open auth modal ──
function openAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.add('active');
}
