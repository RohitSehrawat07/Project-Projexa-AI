// =============================================
//  EduRank — auth.js
//  Signup, login, session management
//  Phase 1 SaaS auth
// =============================================

const API = window.location.origin + "/api";

let selectedRole = null;

// ── Role selection ──
function selectRole(role) {
  selectedRole = role;

  // Show registration form, hide role selector
  document.getElementById('roleSelector').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';

  // Update form appearance for the selected role
  const badge = document.getElementById('selectedRoleBadge');
  const formTitle = document.getElementById('formTitle');
  const formSubtitle = document.getElementById('formSubtitle');

  if (role === 'teacher') {
    badge.textContent = '🧑‍🏫 Teacher / Institution';
    badge.className = 'selected-role-badge teacher';
    formTitle.textContent = 'Create Teacher Account';
    formSubtitle.textContent = 'You\'ll be able to create classes and manage students';
    document.getElementById('institutionGroup').style.display = 'block';
    document.getElementById('joinCodeGroup').style.display = 'none';
    document.getElementById('submitText').textContent = 'Create Teacher Account';
  } else {
    badge.textContent = '🎓 Student';
    badge.className = 'selected-role-badge student';
    formTitle.textContent = 'Create Student Account';
    formSubtitle.textContent = 'Join your class and start competing with classmates';
    document.getElementById('institutionGroup').style.display = 'none';
    document.getElementById('joinCodeGroup').style.display = 'block';
    document.getElementById('submitText').textContent = 'Create Student Account';
  }

  // Highlight selected role card
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('role' + role.charAt(0).toUpperCase() + role.slice(1))?.classList.add('selected');
}

// ── Go back to role selector ──
function goBackToRoles() {
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('roleSelector').style.display = 'block';
  clearErrors();
}

// ── Toggle password visibility ──
function togglePasswordVisibility() {
  const input = document.getElementById('regPassword');
  const eye = document.getElementById('pwEye');
  if (input.type === 'password') {
    input.type = 'text';
    eye.textContent = '🙈';
  } else {
    input.type = 'password';
    eye.textContent = '👁️';
  }
}

// ── Clear all errors ──
function clearErrors() {
  ['nameError', 'emailError', 'passwordError', 'formError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  });
  ['regName', 'regEmail', 'regPassword'].forEach(id => {
    document.getElementById(id)?.classList.remove('error');
  });
}

// ── Field validation ──
function validateForm() {
  let valid = true;
  clearErrors();

  const name = document.getElementById('regName')?.value.trim();
  const email = document.getElementById('regEmail')?.value.trim();
  const password = document.getElementById('regPassword')?.value;

  if (!name || name.length < 2) {
    showFieldError('nameError', 'regName', 'Name must be at least 2 characters');
    valid = false;
  }
  if (!email || !email.includes('@') || !email.includes('.')) {
    showFieldError('emailError', 'regEmail', 'Please enter a valid email address');
    valid = false;
  }
  if (!password || password.length < 6) {
    showFieldError('passwordError', 'regPassword', 'Password must be at least 6 characters');
    valid = false;
  }
  return valid;
}

function showFieldError(errorId, fieldId, message) {
  const errorEl = document.getElementById(errorId);
  if (errorEl) { errorEl.textContent = message; errorEl.style.display = 'block'; }
  document.getElementById(fieldId)?.classList.add('error');
}

function showFormError(message) {
  const el = document.getElementById('formError');
  if (el) { el.textContent = '❌ ' + message; el.style.display = 'block'; }
}

// ── Registration submit ──
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const institution = document.getElementById('regInstitution')?.value.trim() || '';
    const joinCode = document.getElementById('regJoinCode')?.value.trim().toUpperCase() || '';

    // Show loading
    const submitBtn  = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitSpinner = document.getElementById('submitSpinner');
    submitBtn.disabled = true;
    submitText.style.display = 'none';
    submitSpinner.style.display = 'inline';

    try {
      // Register
      const regRes = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: selectedRole })
      });

      const regData = await regRes.json();

      if (!regRes.ok) {
        showFormError(regData.error || 'Registration failed');
        submitBtn.disabled = false;
        submitText.style.display = 'inline';
        submitSpinner.style.display = 'none';
        return;
      }

      // Save session
      localStorage.setItem('edurank_token', regData.token);
      localStorage.setItem('edurank_user', JSON.stringify(regData.user));

      // Also set legacy session key for backward compat with existing pages
      localStorage.setItem('edurank_current', regData.user.name);

      // If teacher: set institution
      // (future: update profile API call)

      // If student with join code: join the class
      if (selectedRole === 'student' && joinCode) {
        try {
          await fetch(`${API}/classes/join`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${regData.token}`
            },
            body: JSON.stringify({ join_code: joinCode })
          });
        } catch (joinErr) {
          console.warn('Class join failed, continuing:', joinErr);
        }
      }

      // Redirect based on role
      if (selectedRole === 'teacher') {
        window.location.href = 'teacher-dashboard.html';
      } else {
        window.location.href = 'dashboard.html';
      }

    } catch (err) {
      console.error('Registration error:', err);
      showFormError('Connection error. Is the server running?');
      submitBtn.disabled = false;
      submitText.style.display = 'inline';
      submitSpinner.style.display = 'none';
    }
  });
}


// =============================================
// LOGIN PAGE functions (used by index.html + login.html)
// =============================================

// ── New email+password login ──
async function loginWithEmail(email, password) {
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return { _error: data.error || 'Login failed' };

    localStorage.setItem('edurank_token', data.token);
    localStorage.setItem('edurank_user', JSON.stringify(data.user));
    localStorage.setItem('edurank_current', data.user.name); // legacy compat
    return data;
  } catch (err) {
    return { _error: 'Cannot connect to server' };
  }
}

// ── Get stored auth token ──
function getAuthToken() {
  return localStorage.getItem('edurank_token');
}

// ── Get stored user ──
function getStoredUser() {
  const raw = localStorage.getItem('edurank_user');
  return raw ? JSON.parse(raw) : null;
}

// ── Logout (clears both new + legacy sessions) ──
function logout() {
  localStorage.removeItem('edurank_token');
  localStorage.removeItem('edurank_user');
  localStorage.removeItem('edurank_current');
  window.location.href = 'landing.html';
}

// ── Authenticated fetch helper ──
async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  return fetch(url, { ...options, headers });
}

// ── Require new auth (for protected pages) ──
function requireNewAuth(redirectRole) {
  const token = getAuthToken();
  const user = getStoredUser();
  if (!token || !user) {
    window.location.href = 'landing.html';
    return null;
  }
  if (redirectRole && user.role !== redirectRole) {
    window.location.href = user.role === 'teacher' ? 'teacher-dashboard.html' : 'dashboard.html';
    return null;
  }
  return user;
}
