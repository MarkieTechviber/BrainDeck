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
    // Avatar
    const avatarRing = document.getElementById('avatarRing');
    const avatarImg = document.getElementById('avatarImg');
    const avatarInitials = document.getElementById('avatarInitials');
    
    if (user.avatarUrl) {
      avatarImg.src = user.avatarUrl;
      avatarImg.style.display = 'block';
      if (avatarInitials) avatarInitials.style.display = 'none';
    } else {
      if (avatarInitials) {
        avatarInitials.textContent = initials;
        avatarInitials.style.display = 'block';
      }
      avatarImg.style.display = 'none';
    }

    // Cover photo
    const coverArea = document.getElementById('coverArea');
    const coverImg = document.getElementById('coverImg');
    
    if (user.coverUrl) {
      coverImg.src = user.coverUrl;
      coverImg.style.display = 'block';
    } else {
      if (coverImg) coverImg.style.display = 'none';
    }

    // Profile name and bio
    const profileNameEl = document.getElementById('profileName');
    if (profileNameEl) profileNameEl.textContent = user.name || 'No name set';
    
    const profileEmailEl = document.getElementById('profileEmail');
    if (profileEmailEl) profileEmailEl.textContent = user.email || '';
    
    const profileBioEl = document.getElementById('profileBioPreview');
    if (profileBioEl && user.bio) {
      profileBioEl.textContent = user.bio;
    }
  };

  loadProfileImages();

  // ── Notification helper ──
  const showNotification = (msg, type = 'success') => {
    const notif = document.createElement('div');
    notif.className = `alert alert-${type} position-fixed bottom-3 end-3`;
    notif.textContent = msg;
    notif.style.zIndex = '9999';
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  };

  // ── Avatar upload handler ──
  const avatarFileInput = document.getElementById('avatarFileInput');
  const avatarRing = document.getElementById('avatarRing');
  
  if (avatarRing && avatarFileInput) {
    avatarRing.addEventListener('click', () => avatarFileInput.click());
    
    avatarFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append('file', file);

        avatarRing.style.opacity = '0.6';
        avatarRing.style.pointerEvents = 'none';

        const uploadRes = await fetch('/api/upload/deck-image', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${BrainDeckAuth.getToken()}` },
          credentials: 'include',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.data?.fileName) {
          // Build accessible URL
          const avatarUrl = `/uploads/${uploadData.data.fileName}`;
          
          // Save to database
          const saveRes = await fetch('/api/auth/me', {
            method: 'PATCH',
            headers: BrainDeckAuth.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ avatarUrl }),
          });

          const saveData = await saveRes.json();
          if (saveData.success && saveData.data?.user) {
            // Update local user object with full returned data
            user = { ...user, ...saveData.data.user };
            loadProfileImages();
            showNotification('✓ Profile picture saved!', 'success');
          } else {
            showNotification('Failed to save profile picture', 'danger');
          }
        } else {
          showNotification('Upload failed', 'danger');
        }
      } catch (err) {
        console.error('Avatar upload error:', err);
        showNotification('Network error uploading avatar', 'danger');
      } finally {
        avatarRing.style.opacity = '1';
        avatarRing.style.pointerEvents = 'auto';
        avatarFileInput.value = '';
      }
    });
  }

  // ── Cover photo upload handler ──
  const coverFileInput = document.getElementById('coverFileInput');
  const changeCoverBtn = document.getElementById('changeCoverBtn');

  if (changeCoverBtn && coverFileInput) {
    changeCoverBtn.addEventListener('click', () => coverFileInput.click());
    
    coverFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append('file', file);

        changeCoverBtn.style.opacity = '0.6';
        changeCoverBtn.style.pointerEvents = 'none';

        const uploadRes = await fetch('/api/upload/deck-image', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${BrainDeckAuth.getToken()}` },
          credentials: 'include',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.data?.fileName) {
          // Build accessible URL
          const coverUrl = `/uploads/${uploadData.data.fileName}`;
          
          // Save to database
          const saveRes = await fetch('/api/auth/me', {
            method: 'PATCH',
            headers: BrainDeckAuth.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ coverUrl }),
          });

          const saveData = await saveRes.json();
          if (saveData.success && saveData.data?.user) {
            // Update local user object with full returned data
            user = { ...user, ...saveData.data.user };
            loadProfileImages();
            showNotification('✓ Cover photo saved!', 'success');
          } else {
            showNotification('Failed to save cover photo', 'danger');
          }
        } else {
          showNotification('Upload failed', 'danger');
        }
      } catch (err) {
        console.error('Cover upload error:', err);
        showNotification('Network error uploading cover', 'danger');
      } finally {
        changeCoverBtn.style.opacity = '1';
        changeCoverBtn.style.pointerEvents = 'auto';
        coverFileInput.value = '';
      }
    });
  }

  // ── Edit Quick Button (if exists) ──
  const editQuickBtn = document.getElementById('editQuickBtn');
  if (editQuickBtn) {
    editQuickBtn.addEventListener('click', () => {
      // Scroll to edit section or open modal
      const editSection = document.querySelector('[id*="edit"]') || document.querySelector('.sc');
      if (editSection) {
        editSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

})();
