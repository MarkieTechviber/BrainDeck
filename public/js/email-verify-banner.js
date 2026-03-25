// public/js/email-verify-banner.js
// Shows a dismissible banner when the logged-in user hasn't verified their email
'use strict';

(async () => {
  // Only run if user is logged in
  if (typeof BrainDeckAuth === 'undefined') return;
  const token = BrainDeckAuth.getToken();
  if (!token) return;

  let user = null;
  try {
    user = await BrainDeckAuth.getCurrentUser();
  } catch { return; }

  if (!user || user.isEmailVerified) return;

  // Don't show on verify page itself
  if (window.location.pathname.includes('verify-email')) return;

  // Don't show if dismissed this session
  if (sessionStorage.getItem('bd_verify_banner_dismissed')) return;

  const banner = document.createElement('div');
  banner.id = 'emailVerifyBanner';
  banner.style.cssText = `
    position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
    z-index: 888; max-width: 520px; width: calc(100% - 2rem);
    background: var(--surface); border-radius: var(--radius-lg);
    box-shadow: var(--neu-shadow); border: 1px solid rgba(251,191,36,0.3);
    padding: .85rem 1.1rem; display: flex; align-items: center; gap: .85rem;
    animation: slideUp .3s ease;
  `;

  banner.innerHTML = `
    <style>@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>
    <div style="width:36px;height:36px;border-radius:50%;background:rgba(251,191,36,0.15);
                display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <i class="bi bi-envelope-exclamation-fill" style="color:var(--warning);font-size:1rem"></i>
    </div>
    <div style="flex:1;min-width:0">
      <div class="fw-700 bd-font-sm" style="color:var(--text)">Verify your email address</div>
      <div class="bd-font-xs" style="color:var(--text-muted)">Check your inbox for a verification link from BrainDeck.</div>
    </div>
    <button id="resendVerifyBtn"
            style="background:var(--grad-primary);color:#fff;border:none;border-radius:var(--radius);
                   padding:.4rem .85rem;font-size:.78rem;font-weight:600;cursor:pointer;
                   box-shadow:3px 3px 8px rgba(108,99,255,.3);white-space:nowrap;flex-shrink:0">
      Resend
    </button>
    <button id="dismissVerifyBtn"
            style="background:none;border:none;color:var(--text-muted);cursor:pointer;
                   font-size:1.1rem;padding:0 .2rem;flex-shrink:0">&times;</button>
  `;

  document.body.appendChild(banner);

  document.getElementById('dismissVerifyBtn').addEventListener('click', () => {
    sessionStorage.setItem('bd_verify_banner_dismissed', '1');
    banner.style.animation = 'none';
    banner.style.opacity   = '0';
    banner.style.transform = 'translateX(-50%) translateY(16px)';
    banner.style.transition = 'opacity .25s, transform .25s';
    setTimeout(() => banner.remove(), 300);
  });

  document.getElementById('resendVerifyBtn').addEventListener('click', async () => {
    const btn = document.getElementById('resendVerifyBtn');
    btn.textContent = 'Sending...';
    btn.disabled = true;
    try {
      const r = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: BrainDeckAuth.getHeaders(),
        credentials: 'include',
      });
      const d = await r.json();
      btn.textContent = d.success ? 'Sent!' : 'Failed';
      if (d.success) {
        setTimeout(() => {
          sessionStorage.setItem('bd_verify_banner_dismissed', '1');
          banner.remove();
        }, 2000);
      }
    } catch {
      btn.textContent = 'Error';
    }
  });
})();
