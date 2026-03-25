// public/js/sidebar.js
'use strict';

const Sidebar = (() => {
  const COLLAPSED_KEY = 'bd_sidebar_collapsed';

  async function init() {
    const sidebar  = document.getElementById('bdSidebar');
    const main     = document.getElementById('bdMain');
    const overlay  = document.getElementById('bdSidebarOverlay');
    const guestNav = document.getElementById('bdGuestNav');
    const topbar   = document.querySelector('.bd-topbar');
    if (!sidebar) return;

    // ── Check auth ──
    let user = null;
    try {
      if (typeof BrainDeckAuth !== 'undefined') {
        user = BrainDeckAuth.getToken() ? await BrainDeckAuth.getCurrentUser() : null;
        if (!user) user = await BrainDeckAuth.tryRefresh();
      }
    } catch {}

    if (user) {
      // ══ LOGGED IN — show sidebar, hide guest nav ══
      sidebar.classList.add('bd-sidebar-visible');
      sidebar.classList.remove('bd-sidebar-hidden');
      if (topbar) topbar.style.display = 'flex';
      guestNav?.classList.add('d-none');

      // Set main margin to match sidebar width
      const updateMargin = () => {
        if (main) main.style.marginLeft = sidebar.classList.contains('collapsed') ? '64px' : '240px';
      };
      updateMargin();

      // Restore collapsed state
      if (localStorage.getItem(COLLAPSED_KEY) === '1') {
        sidebar.classList.add('collapsed');
        updateMargin();
      }

      // Desktop collapse toggle
      document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem(COLLAPSED_KEY, sidebar.classList.contains('collapsed') ? '1' : '0');
        updateMargin();
      });

      // Mobile toggle
      document.getElementById('sidebarMobileBtn')?.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        overlay?.classList.toggle('visible');
      });
      overlay?.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay?.classList.remove('visible');
      });

      // Populate user info
      const initials  = (user.name || user.email || '?').slice(0,2).toUpperCase();
      const avatarHtml = user.avatarUrl
        ? `<img src="${user.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.parentElement.textContent='${initials}'">`
        : initials;
      const el = id => document.getElementById(id);
      if (el('sidebarAvatar'))   el('sidebarAvatar').innerHTML   = avatarHtml;
      if (el('sidebarName'))     el('sidebarName').textContent   = user.name || user.email?.split('@')[0] || 'User';
      if (el('sidebarRole'))     el('sidebarRole').textContent   = user.email || '';
      if (el('topbarAvatar'))    el('topbarAvatar').innerHTML    = avatarHtml;
      if (el('topbarName'))      el('topbarName').textContent    = (user.name||user.email||'User').split(' ')[0];
      if (el('topbarDropName'))  el('topbarDropName').textContent  = user.name || '';
      if (el('topbarDropEmail')) el('topbarDropEmail').textContent = user.email || '';
      el('sidebarAuthSection')?.classList.remove('d-none');
      el('sidebarGuestSection')?.classList.add('d-none');

    } else {
      // ══ GUEST — hide sidebar entirely, show simple nav ══
      sidebar.style.display = 'none';
      if (main) main.style.marginLeft = '0';
      if (topbar) topbar.style.display = 'none';
      guestNav?.classList.remove('d-none');
    }

    // Mark active nav item
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.bd-nav-item[data-page]').forEach(el => {
      if (el.dataset.page === current) el.classList.add('active');
    });

    // Wire logout
    document.getElementById('sidebarLogout')?.addEventListener('click', () => BrainDeckAuth.logout());
    document.getElementById('topbarLogout')?.addEventListener('click',  () => BrainDeckAuth.logout());
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
