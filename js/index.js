// =============================================
//  EduRank — index.js
//  Login & Authentication
// =============================================

let currentTab = 'login';

// ── Once page loads ──
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('active');
  }
  
  // Auto-focus input
  const loginInput = document.getElementById('loginInput');
  if (loginInput) {
    loginInput.focus();
  }
});

// ── Switch between login and signup tabs ──
function switchTab(tab) {
  currentTab = tab;
  
  // Update tab visibility
  document.getElementById('loginTab').classList.remove('active');
  document.getElementById('signupTab').classList.remove('active');
  document.getElementById(tab + 'Tab').classList.add('active');
  
  // Clear errors
  document.getElementById('loginError').textContent = '';
  document.getElementById('signupError').textContent = '';
  
  // Focus input
  const input = document.getElementById(tab + 'Input');
  if (input) {
    input.focus();
  }
}

// ── Handle login ──
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
    // Capitalize name
    const displayName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    
    // Call API
    const student = await loginStudent(displayName);
    
    if (!student) {
      errorEl.textContent = '❌ Failed to login. Please try again.';
      btn.disabled = false;
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
      return;
    }
    
    // Success - redirect
    errorEl.textContent = '';
    window.location.href = 'dashboard.html';
    
  } catch (error) {
    console.error('Login error:', error);
    errorEl.textContent = '❌ Connection error. Is the backend running?';
    btn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
  }
}

// ── Handle signup ──
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
    // Capitalize name
    const displayName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    
    // Call API (loginStudent auto-creates)
    const student = await loginStudent(displayName);
    
    if (!student) {
      errorEl.textContent = '❌ Failed to create account. Please try again.';
      btn.disabled = false;
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
      return;
    }
    
    // Success - redirect
    errorEl.textContent = '';
    window.location.href = 'dashboard.html';
    
  } catch (error) {
    console.error('Signup error:', error);
    errorEl.textContent = '❌ Connection error. Is the backend running?';
    btn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
  }
}

// ── Close auth modal ──
function closeAuthModal(event) {
  // Only close if clicking the overlay background
  if (event && event.target.id !== 'authModal') {
    return;
  }
  
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// ── Open auth modal ──
function openAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('active');
  }
}
