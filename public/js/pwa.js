// public/js/pwa.js — PWA install prompt + update handler
'use strict';

const PWA = (() => {
  let deferredPrompt = null;
  let installBtn     = null;

  // ── Capture install prompt ──────────────────
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  // ── App installed ───────────────────────────
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideBanner();
    showToast('BrainDeck installed! Find it on your home screen.', 'success');
    localStorage.setItem('bd_pwa_installed', '1');
  });

  // ── Show install banner ─────────────────────
  function showInstallBanner() {
    // Don't show if already installed or dismissed recently
    if (localStorage.getItem('bd_install_dismissed')) return;
    if (isStandalone()) return;
    if (document.getElementById('pwaInstallBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.style.cssText = `
      position: fixed; bottom: 1.5rem; left: 50%;
      transform: translateX(-50%);
      z-index: 887; max-width: 480px; width: calc(100% - 2rem);
      background: var(--surface); border-radius: var(--radius-xl);
      box-shadow: var(--neu-shadow);
      border: 1px solid rgba(108,99,255,0.2);
      padding: 1rem 1.1rem;
      display: flex; align-items: center; gap: .9rem;
      animation: pwaSlideUp .3s cubic-bezier(.4,0,.2,1);
    `;
    banner.innerHTML = `
      <style>
        @keyframes pwaSlideUp {
          from { opacity:0; transform:translateX(-50%) translateY(20px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      </style>
      <div style="width:44px;height:44px;border-radius:12px;
                  background:var(--grad-primary);display:flex;
                  align-items:center;justify-content:center;flex-shrink:0;
                  box-shadow:3px 3px 10px rgba(108,99,255,.35)">
        <img src="/icons/icon-192x192.svg" width="28" height="28" alt="BrainDeck"
             style="border-radius:6px" onerror="this.style.display='none';this.parentElement.innerHTML='🧠'">
      </div>
      <div style="flex:1;min-width:0">
        <div class="fw-700 bd-font-sm" style="color:var(--text)">Install BrainDeck</div>
        <div class="bd-font-xs" style="color:var(--text-muted)">
          Add to home screen for the best experience
        </div>
      </div>
      <button id="pwaInstallBtn"
              style="background:var(--grad-primary);color:#fff;border:none;
                     border-radius:var(--radius);padding:.45rem .9rem;
                     font-size:.8rem;font-weight:700;cursor:pointer;
                     box-shadow:3px 3px 8px rgba(108,99,255,.3);
                     white-space:nowrap;flex-shrink:0">
        Install
      </button>
      <button id="pwaDismissBtn"
              style="background:none;border:none;color:var(--text-muted);
                     cursor:pointer;font-size:1.2rem;padding:0 .2rem;flex-shrink:0">
        &times;
      </button>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwaInstallBtn').addEventListener('click', triggerInstall);
    document.getElementById('pwaDismissBtn').addEventListener('click', () => {
      hideBanner();
      // Don't show again for 3 days
      const exp = Date.now() + 3 * 24 * 3600 * 1000;
      localStorage.setItem('bd_install_dismissed', exp.toString());
    });

    installBtn = document.getElementById('pwaInstallBtn');
  }

  // ── Trigger native install prompt ──────────
  async function triggerInstall() {
    if (!deferredPrompt) {
      // iOS — show manual instructions
      showIOSInstructions();
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    hideBanner();
    if (outcome === 'dismissed') {
      localStorage.setItem('bd_install_dismissed', (Date.now() + 24*3600*1000).toString());
    }
  }

  function hideBanner() {
    const b = document.getElementById('pwaInstallBanner');
    if (b) {
      b.style.transition = 'opacity .25s, transform .25s';
      b.style.opacity = '0';
      b.style.transform = 'translateX(-50%) translateY(16px)';
      setTimeout(() => b.remove(), 300);
    }
  }

  // ── iOS manual install instructions ────────
  function showIOSInstructions() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:9998;display:flex;align-items:flex-end;justify-content:center;
      padding-bottom:env(safe-area-inset-bottom,0)
    `;
    modal.innerHTML = `
      <div style="background:var(--surface);border-radius:var(--radius-xl) var(--radius-xl) 0 0;
                  padding:1.5rem;width:100%;max-width:480px;box-shadow:var(--neu-hover)">
        <div style="text-align:center;margin-bottom:1.2rem">
          <div class="fw-800" style="color:var(--text);font-size:1.1rem;margin-bottom:.3rem">
            Install BrainDeck on iOS
          </div>
          <p class="bd-font-sm bd-text-muted mb-0">Follow these steps to add to your home screen:</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:.8rem;margin-bottom:1.2rem">
          <div style="display:flex;align-items:center;gap:.8rem">
            <div style="width:32px;height:32px;border-radius:50%;background:rgba(108,99,255,.12);
                        display:flex;align-items:center;justify-content:center;flex-shrink:0;
                        color:var(--primary);font-weight:700">1</div>
            <span class="bd-font-sm" style="color:var(--text)">
              Tap the <strong>Share</strong> button
              <span style="display:inline-block;background:rgba(108,99,255,.1);border-radius:6px;
                           padding:2px 8px;font-size:.75rem;color:var(--primary);margin-left:4px">
                <i class="bi bi-box-arrow-up"></i> Share
              </span>
              in Safari
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:.8rem">
            <div style="width:32px;height:32px;border-radius:50%;background:rgba(108,99,255,.12);
                        display:flex;align-items:center;justify-content:center;flex-shrink:0;
                        color:var(--primary);font-weight:700">2</div>
            <span class="bd-font-sm" style="color:var(--text)">
              Scroll down and tap <strong>"Add to Home Screen"</strong>
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:.8rem">
            <div style="width:32px;height:32px;border-radius:50%;background:rgba(108,99,255,.12);
                        display:flex;align-items:center;justify-content:center;flex-shrink:0;
                        color:var(--primary);font-weight:700">3</div>
            <span class="bd-font-sm" style="color:var(--text)">
              Tap <strong>"Add"</strong> — done! 🎉
            </span>
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()"
                style="width:100%;background:var(--grad-primary);color:#fff;border:none;
                       border-radius:var(--radius);padding:.75rem;font-weight:700;
                       cursor:pointer;box-shadow:3px 3px 10px rgba(108,99,255,.3)">
          Got it
        </button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }

  // ── SW update available ─────────────────────
  async function checkForUpdate(reg) {
    if (!reg) return;
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(newSW);
        }
      });
    });
  }

  function showUpdateBanner(newSW) {
    if (document.getElementById('pwaUpdateBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'pwaUpdateBanner';
    banner.style.cssText = `
      position:fixed; top:1rem; left:50%; transform:translateX(-50%);
      z-index:9997; max-width:400px; width:calc(100% - 2rem);
      background:var(--surface); border-radius:var(--radius-lg);
      box-shadow:var(--neu-shadow); border:1px solid rgba(108,99,255,.2);
      padding:.75rem 1rem; display:flex; align-items:center; gap:.75rem;
      animation:pwaSlideDown .3s ease;
    `;
    banner.innerHTML = `
      <style>@keyframes pwaSlideDown{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>
      <i class="bi bi-arrow-clockwise" style="color:var(--primary);font-size:1.1rem;flex-shrink:0"></i>
      <span class="bd-font-sm" style="color:var(--text);flex:1">New version available!</span>
      <button onclick="PWA.applyUpdate()"
              style="background:var(--primary);color:#fff;border:none;border-radius:8px;
                     padding:.35rem .75rem;font-size:.78rem;font-weight:700;cursor:pointer;flex-shrink:0">
        Update
      </button>
      <button onclick="document.getElementById('pwaUpdateBanner').remove()"
              style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0">&times;</button>
    `;
    document.body.appendChild(banner);
    window._pendingSW = newSW;
  }

  // Apply SW update
  function applyUpdate() {
    if (window._pendingSW) {
      window._pendingSW.postMessage({ type: 'SKIP_WAITING' });
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  }

  // ── isStandalone check ──────────────────────
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
      || document.referrer.includes('android-app://');
  }

  // ── Check dismissed expiry ──────────────────
  function checkDismissedExpiry() {
    const exp = localStorage.getItem('bd_install_dismissed');
    if (exp && Date.now() > parseInt(exp)) {
      localStorage.removeItem('bd_install_dismissed');
    }
  }

  // ── Init ────────────────────────────────────
  async function init() {
    checkDismissedExpiry();

    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await checkForUpdate(reg);

      // Pass reg to push notifications module if available
      if (typeof PushNotifications !== 'undefined') {
        window._swReg = reg;
      }
    } catch (err) {
      console.warn('[PWA] SW registration failed:', err.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { triggerInstall, isStandalone, applyUpdate };
})();

// ── Standalone UX tweaks ──────────────────────
if (window.matchMedia('(display-mode: standalone)').matches) {
  // Add safe-area padding for notches
  document.documentElement.style.setProperty('--safe-area-top',    'env(safe-area-inset-top, 0px)');
  document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)');
  document.body.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
}
