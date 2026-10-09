// =============================================
//  EduRank — teacher-dashboard.js
//  Teacher Dashboard: class management + analytics
// =============================================

const API = window.location.origin + "/api";
let currentUser = null;
let lastCreatedCode = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard — must be logged in as teacher
  const token = localStorage.getItem('edurank_token');
  const userData = localStorage.getItem('edurank_user');

  if (!token || !userData) {
    // Fallback: try legacy session
    const legacyName = localStorage.getItem('edurank_current');
    if (legacyName) {
      // Show limited view with legacy session
      renderLegacyView(legacyName);
      return;
    }
    window.location.href = 'landing.html';
    return;
  }

  currentUser = JSON.parse(userData);

  // Set UI
  document.getElementById('teacherName').textContent = currentUser.name;
  document.getElementById('navUserName').textContent = currentUser.name;
  if (currentUser.institution) {
    document.getElementById('institutionLabel').textContent = currentUser.institution;
  }

  // Load classes
  await loadClasses();
});

// ── Load classes ──
async function loadClasses() {
  const token = localStorage.getItem('edurank_token');
  const grid = document.getElementById('classGrid');
  const countEl = document.getElementById('classCount');

  try {
    const res = await fetch(`${API}/classes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const classes = await res.json();

    countEl.textContent = `${classes.length} class${classes.length !== 1 ? 'es' : ''}`;

    if (classes.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏫</div>
          <p>No classes yet. Create your first class to get started.</p>
        </div>`;
      return;
    }

    grid.innerHTML = classes.map(cls => renderClassCard(cls)).join('');

  } catch (err) {
    grid.innerHTML = '<div class="empty-state"><p>Could not load classes. Please refresh.</p></div>';
    console.error('Load classes error:', err);
  }
}

// ── Render class card ──
function renderClassCard(cls) {
  const studentCount = cls.student_ids?.length || 0;
  const subject = cls.subject ? `<span class="cc-subject">${cls.subject}</span>` : '';

  return `
    <div class="class-card">
      <div class="cc-header">
        <div>
          <div class="cc-name">${escapeHtml(cls.name)}</div>
          <div class="cc-institution">${escapeHtml(cls.institution || '')}</div>
        </div>
        ${subject}
      </div>
      <div class="cc-stats">
        <div>
          <div class="cc-stat-val">${studentCount}</div>
          <div class="cc-stat-key">Students</div>
        </div>
      </div>
      <div class="cc-code-row">
        <span class="cc-code-label">Join Code</span>
        <span class="cc-code" id="code-${cls.id}">${cls.join_code}</span>
        <button class="cc-copy-btn" onclick="copyCode('${cls.join_code}')" title="Copy join code">📋</button>
      </div>
    </div>
  `;
}

// ── Copy code to clipboard ──
function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    // Small feedback
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;background:#4ade80;color:#0a0a0f;
      padding:10px 18px;border-radius:8px;font-weight:700;font-size:0.88rem;
      z-index:9999;animation:fadeInUp 0.2s ease;
    `;
    toast.textContent = '✓ Copied!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  });
}

// ── Create class modal ──
function openCreateClassModal() {
  document.getElementById('createClassModal').classList.add('open');
  document.getElementById('newClassName').focus();
  document.getElementById('modalError').style.display = 'none';
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function closeModalOnOverlay(event, id) {
  if (event.target.id === id) closeModal(id);
}

async function submitCreateClass() {
  const name        = document.getElementById('newClassName').value.trim();
  const institution = document.getElementById('newInstitution').value.trim();
  const subject     = document.getElementById('newSubject').value.trim();
  const token       = localStorage.getItem('edurank_token');
  const errorEl     = document.getElementById('modalError');
  const btn         = document.getElementById('createClassSubmitBtn');
  const btnText     = document.getElementById('createClassText');
  const btnSpinner  = document.getElementById('createClassSpinner');

  if (!name) {
    errorEl.textContent = 'Class name is required';
    errorEl.style.display = 'block';
    document.getElementById('newClassName').focus();
    return;
  }

  btn.disabled = true;
  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline';
  errorEl.style.display = 'none';

  try {
    const res = await fetch(`${API}/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, institution, subject })
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Failed to create class';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';
      return;
    }

    lastCreatedCode = data.join_code;

    // Close create modal, open join code modal
    closeModal('createClassModal');
    document.getElementById('joinCodeDisplay').textContent = data.join_code;
    document.getElementById('joinCodeModal').classList.add('open');

    // Clear form
    document.getElementById('newClassName').value = '';
    document.getElementById('newInstitution').value = '';
    document.getElementById('newSubject').value = '';
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';

    // Reload classes
    await loadClasses();

  } catch (err) {
    errorEl.textContent = 'Connection error';
    errorEl.style.display = 'block';
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    console.error('Create class error:', err);
  }
}

function copyJoinCode() {
  if (lastCreatedCode) copyCode(lastCreatedCode);
}

// ── Legacy session fallback ──
function renderLegacyView(name) {
  document.getElementById('teacherName').textContent = name;
  document.getElementById('navUserName').textContent = name;
  document.getElementById('classGrid').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <p>You are using the old login system. <a href="signup.html?role=teacher" style="color:#4ade80">Create a proper teacher account</a> to use class management features.</p>
    </div>`;
}

// ── Logout ──
function logout() {
  localStorage.removeItem('edurank_token');
  localStorage.removeItem('edurank_user');
  localStorage.removeItem('edurank_current');
  window.location.href = 'landing.html';
}

// ── Escape HTML helper ──
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
