// public/js/notification-settings.js
// Injects a notification settings panel into the sidebar footer
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  // Only show if logged in
  if (typeof BrainDeckAuth === 'undefined') return;
  const token = BrainDeckAuth.getToken();
  if (!token) return;

  // Check if push is supported
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  // Inject toggle button into sidebar footer
  const footer = document.querySelector('.bd-sidebar-footer');
  if (!footer) return;

  const btn = document.createElement('button');
  btn.className = 'bd-nav-item';
  btn.id = 'pushToggleBtn';
  btn.innerHTML = `<i class="bi bi-bell" id="pushBellIcon"></i><span class="bd-nav-label" id="pushBtnLabel">Notifications</span>`;
  btn.title = 'Toggle push notifications';
  footer.insertBefore(btn, footer.firstChild);

  // Get current status
  async function refreshStatus() {
    const status = await PushNotifications.getStatus();
    const icon   = document.getElementById('pushBellIcon');
    const label  = document.getElementById('pushBtnLabel');
    if (!icon || !label) return;

    if (status.subscribed && status.permission === 'granted') {
      icon.className  = 'bi bi-bell-fill';
      icon.style.color = 'var(--primary)';
      label.textContent = 'Notifications on';
    } else if (status.permission === 'denied') {
      icon.className  = 'bi bi-bell-slash';
      icon.style.color = 'var(--danger)';
      label.textContent = 'Notifications blocked';
    } else {
      icon.className  = 'bi bi-bell';
      icon.style.color = '';
      label.textContent = 'Notifications';
    }
  }

  await refreshStatus();

  btn.addEventListener('click', async () => {
    const status = await PushNotifications.getStatus();
    btn.disabled = true;
    btn.querySelector('.bd-nav-label').textContent = 'Working...';

    if (status.permission === 'denied') {
      showToast('Notifications are blocked in your browser. Enable them in browser settings.', 'warning');
      btn.disabled = false;
      await refreshStatus();
      return;
    }

    if (status.subscribed) {
      // Unsubscribe
      const r = await PushNotifications.unsubscribe();
      if (r.success) showToast('Push notifications turned off.', 'info');
      else showToast('Could not unsubscribe: ' + r.reason, 'danger');
    } else {
      // Subscribe
      const r = await PushNotifications.subscribe();
      if (r.success) {
        showToast('Notifications enabled! You\'ll be reminded when cards are due.', 'success');
      } else if (r.reason === 'denied') {
        showToast('Permission denied. Allow notifications in your browser.', 'warning');
      } else if (r.reason === 'no_vapid') {
        showToast('Push not configured on server (missing VAPID keys in .env).', 'warning');
      } else {
        showToast('Could not enable notifications: ' + r.reason, 'danger');
      }
    }

    btn.disabled = false;
    await refreshStatus();
  });
});

// ── Toast helper ──
function showToast(message, type = 'info') {
  const colors = {
    success: 'var(--success)', danger: 'var(--danger)',
    warning: 'var(--warning)', info: 'var(--primary)',
  };

  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:5rem; left:50%; transform:translateX(-50%);
    background:var(--surface); border-radius:var(--radius); box-shadow:var(--neu-shadow);
    padding:.65rem 1.1rem; font-size:.84rem; font-weight:500; color:var(--text);
    z-index:9999; max-width:340px; width:calc(100% - 2rem);
    display:flex; align-items:center; gap:.6rem;
    animation:toastIn .25s ease; border-left:3px solid ${colors[type]};
  `;
  toast.innerHTML = `<style>@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>
    <span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity .3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
