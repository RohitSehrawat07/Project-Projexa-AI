// =============================================
//  EduRank — landing.js
//  Landing page interactions + pricing loader
// =============================================

const API = window.location.origin + "/api";

// ── Navbar scroll effect ──
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ── Mobile hamburger ──
const hamburger = document.getElementById('hamburgerBtn');
const navLinks  = document.getElementById('navLinks');

if (hamburger) {
  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', open);
  });
}

// ── Scroll animations ──
function initScrollAnimations() {
  const elements = document.querySelectorAll(
    '.section-label, .section-title, .section-sub, .workflow-step,' +
    '.feature-column, .why-card, .pricing-card, .cta-box, .hero-demo'
  );
  elements.forEach(el => el.classList.add('anim-in'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}

// ── Load pricing from API ──
async function loadPricing() {
  const grid = document.getElementById('pricingGrid');
  if (!grid) return;

  try {
    const res = await fetch(`${API}/plans`);
    if (!res.ok) throw new Error('Failed to load plans');
    const plans = await res.json();

    grid.innerHTML = '';

    // Render in order: free, basic, pro
    const order = ['free', 'basic', 'pro'];
    order.forEach(key => {
      const plan = plans[key];
      if (!plan) return;

      const card = document.createElement('div');
      card.className = `pricing-card${plan.highlighted ? ' highlighted' : ''}`;

      const featuresHtml = plan.features
        .map(f => `<li>${f}</li>`)
        .join('');

      // Determine CTA link based on plan
      let ctaHref = 'signup.html?role=teacher';
      if (plan.name === 'Pro') ctaHref = '#pricing'; // Contact Us — no page yet

      card.innerHTML = `
        ${plan.highlighted ? '<div class="pricing-badge">Recommended</div>' : ''}
        <div class="plan-name">${plan.name}</div>
        <div class="plan-tagline">${plan.tagline}</div>
        <div class="plan-price">${plan.price_label}</div>
        ${plan.price_note ? `<div class="plan-price-note">⚠️ ${plan.price_note}</div>` : '<div style="margin-bottom:28px"></div>'}
        <ul class="plan-features">${featuresHtml}</ul>
        <a href="${ctaHref}" class="plan-cta ${plan.highlighted ? 'primary' : ''}" id="plan-cta-${key}">
          ${plan.cta}
        </a>
      `;

      grid.appendChild(card);
    });

    // Re-run animations on new elements
    initScrollAnimations();

  } catch (err) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:32px;">Could not load pricing. Please refresh.</p>';
  }
}

// ── Smooth scroll for anchor links ──
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top, behavior: 'smooth' });
      // Close mobile nav if open
      navLinks?.classList.remove('open');
      hamburger?.setAttribute('aria-expanded', 'false');
    }
  });
});

// ── Check if already logged in — update nav ──
function checkExistingSession() {
  // New auth: JWT token
  const token = localStorage.getItem('edurank_token');
  const userData = localStorage.getItem('edurank_user');

  if (token && userData) {
    const user = JSON.parse(userData);
    const loginBtn = document.getElementById('navLogin');
    const getStartedBtn = document.getElementById('navGetStarted');
    if (loginBtn) {
      loginBtn.textContent = user.name;
      loginBtn.href = user.role === 'teacher' ? 'teacher-dashboard.html' : 'dashboard.html';
    }
    if (getStartedBtn) {
      getStartedBtn.textContent = 'Dashboard →';
      getStartedBtn.href = user.role === 'teacher' ? 'teacher-dashboard.html' : 'dashboard.html';
    }
    return;
  }

  // Legacy auth (old name-only session)
  const legacyName = localStorage.getItem('edurank_current');
  if (legacyName) {
    const loginBtn = document.getElementById('navLogin');
    if (loginBtn) {
      loginBtn.textContent = legacyName;
      loginBtn.href = 'dashboard.html';
    }
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  checkExistingSession();
  loadPricing();
  initScrollAnimations();
});
