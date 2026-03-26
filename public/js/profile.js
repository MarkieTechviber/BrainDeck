// public/js/profile.js
'use strict';

(async () => {
  // Guard — must be logged in
  let user = await BrainDeckAuth.getCurrentUser();
  if (!user) {
    user = (await BrainDeckAuth.tryRefresh());
    if (!user) { window.location.href = '/login.html'; return; }
  }

  const initials = (user.name || user.email || '?').slice(0,2).toUpperCase();

  // ── Load profile images on page initialization ──
  const loadProfileImages = () => {
    const avatarRing     = document.getElementById('avatarRing');
    const avatarImg      = document.getElementById('avatarImg');
    const avatarInitials = document.getElementById('avatarInitials');

    if (user.avatarUrl) {
      if (avatarImg) { avatarImg.src = user.avatarUrl; avatarImg.style.display = 'block'; }
      if (avatarInitials) avatarInitials.style.display = 'none';
    } else {
      if (avatarInitials) { avatarInitials.textContent = initials; avatarInitials.style.display = 'block'; }
      if (avatarImg) avatarImg.style.display = 'none';
    }

    const coverImg = document.getElementById('coverImg');
    if (coverImg) {
      if (user.coverUrl) { coverImg.src = user.coverUrl; coverImg.style.display = 'block'; }
      else coverImg.style.display = 'none';
    }

    const profileNameEl = document.getElementById('profileName');
    if (profileNameEl) profileNameEl.textContent = user.name || 'No name set';

    const profileEmailEl = document.getElementById('profileEmail');
    if (profileEmailEl) profileEmailEl.textContent = user.email || '';

    const profileBioEl = document.getElementById('profileBioPreview');
    if (profileBioEl && user.bio) profileBioEl.textContent = user.bio;
  };

  loadProfileImages();

  // ── Toast notification ──
  const showNotification = (msg, type = 'success') => {
    const notif = document.createElement('div');
    notif.className = `alert alert-${type} position-fixed`;
    notif.style.cssText = 'bottom:1.5rem;right:1.5rem;z-index:9999;min-width:220px;font-weight:600';
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3500);
  };

  // ── Generic image uploader ──────────────────────────────────────────────────
  // endpoint : '/api/auth/me/avatar' or '/api/auth/me/cover'
  // fieldName: 'avatar' or 'cover'
  // onSuccess: called with the returned URL string
  const uploadImage = async (file, endpoint, fieldName, onSuccess, onBusy) => {
    if (!file) return;

    onBusy(true);
    try {
      const formData = new FormData();
      formData.append(fieldName, file);          // ← correct field name for multer

      const res  = await fetch(endpoint, {
        method:      'POST',
        headers:     { 'Authorization': `Bearer ${BrainDeckAuth.getToken()}` },
        credentials: 'include',
        body:        formData,                   // no Content-Type header — browser sets multipart boundary
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess(data.data);
      } else {
        showNotification(data.message || 'Upload failed.', 'danger');
      }
    } catch (err) {
      console.error('[Profile] Upload error:', err);
      showNotification('Network error — please try again.', 'danger');
    } finally {
      onBusy(false);
    }
  };

  // ── Avatar upload ───────────────────────────────────────────────────────────
  const avatarFileInput = document.getElementById('avatarFileInput');
  const avatarRing      = document.getElementById('avatarRing');

  if (avatarRing && avatarFileInput) {
    avatarRing.addEventListener('click', () => avatarFileInput.click());

    avatarFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      await uploadImage(
        file,
        '/api/auth/me/avatar',    // ← correct dedicated endpoint
        'avatar',                 // ← multer field name on that route
        (data) => {
          user.avatarUrl = data.avatarUrl;
          loadProfileImages();
          showNotification('✓ Profile picture updated!', 'success');
        },
        (busy) => {
          if (avatarRing) {
            avatarRing.style.opacity      = busy ? '0.5' : '1';
            avatarRing.style.pointerEvents = busy ? 'none' : 'auto';
          }
        }
      );

      avatarFileInput.value = '';
    });
  }

  // ── Cover photo upload ──────────────────────────────────────────────────────
  const coverFileInput  = document.getElementById('coverFileInput');
  const changeCoverBtn  = document.getElementById('changeCoverBtn');

  if (changeCoverBtn && coverFileInput) {
    changeCoverBtn.addEventListener('click', () => coverFileInput.click());

    coverFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      await uploadImage(
        file,
        '/api/auth/me/cover',    // ← correct dedicated endpoint
        'cover',                 // ← multer field name on that route
        (data) => {
          user.coverUrl = data.coverUrl;
          loadProfileImages();
          showNotification('✓ Cover photo updated!', 'success');
        },
        (busy) => {
          if (changeCoverBtn) {
            changeCoverBtn.style.opacity      = busy ? '0.5' : '1';
            changeCoverBtn.style.pointerEvents = busy ? 'none' : 'auto';
          }
        }
      );

      coverFileInput.value = '';
    });
  }

  // ── Edit Quick Button ──────────────────────────────────────────────────────
  const editQuickBtn = document.getElementById('editQuickBtn');
  if (editQuickBtn) {
    editQuickBtn.addEventListener('click', () => {
      const editSection = document.querySelector('[id*="edit"]') || document.querySelector('.sc');
      if (editSection) editSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

})();
