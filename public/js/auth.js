// public/js/auth.js — Auth module
'use strict';

const BrainDeckAuth = (() => {
  const BASE = '/api/auth';
  let _token = localStorage.getItem('bd_access_token') || null;

  // ── Token helpers ──
  const saveToken = t => { _token = t; localStorage.setItem('bd_access_token', t); };
  const clearToken = ()=> { _token = null; localStorage.removeItem('bd_access_token'); };
  const getToken   = ()=> _token;
  const getHeaders = ()=> ({ 'Content-Type':'application/json', ...((_token)?{'Authorization':`Bearer ${_token}`}:{}) });

  // ── Try refresh on load ──
  const tryRefresh = async () => {
    try {
      const r = await fetch(`${BASE}/refresh`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'} });
      if (r.ok) { const d = await r.json(); if(d.data?.accessToken) { saveToken(d.data.accessToken); return d.data.user; } }
    } catch {}
    clearToken();
    return null;
  };

  // ── Get current user ──
  const getCurrentUser = async () => {
    if (!_token) return null;
    try {
      const r = await fetch(`${BASE}/me`, { headers: getHeaders(), credentials:'include' });
      if (r.status === 401) { clearToken(); return null; }
      const d = await r.json();
      return d.success ? d.data.user : null;
    } catch { return null; }
  };

  // ── Show/hide error ──
  const showErr = msg => {
    const a = document.getElementById('errorAlert');
    const m = document.getElementById('errorMsg');
    if(a && m) { m.textContent = msg; a.classList.remove('d-none'); }
  };
  const hideErr = () => { document.getElementById('errorAlert')?.classList.add('d-none'); };
  const setBusy = (btnId, spinnerId, txtId, busy) => {
    const btn = document.getElementById(btnId);
    if(btn) btn.disabled = busy;
    document.getElementById(spinnerId)?.classList.toggle('d-none', !busy);
    document.getElementById(txtId)?.classList.toggle('d-none',  busy);
  };

  // ── Register ──
  const register = async () => {
    hideErr();
    const name  = document.getElementById('nameInput')?.value.trim();
    const email = document.getElementById('emailInput')?.value.trim();
    const pwd   = document.getElementById('passwordInput')?.value;
    const cpwd  = document.getElementById('confirmInput')?.value;
    if (!email || !pwd) return showErr('Email and password are required.');
    if (pwd.length < 8) return showErr('Password must be at least 8 characters.');
    if (pwd !== cpwd)   return showErr('Passwords do not match.');
    setBusy('registerBtn','regSpinner','regBtnText',true);
    try {
      const r = await fetch(`${BASE}/register`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({name,email,password:pwd}) });
      const d = await r.json();
      if (d.success) { saveToken(d.data.accessToken); window.location.href = '/'; }
      else showErr(d.message || 'Registration failed.');
    } catch { showErr('Network error. Please try again.'); }
    finally { setBusy('registerBtn','regSpinner','regBtnText',false); }
  };

  // ── Login ──
  const login = async () => {
    hideErr();
    const email = document.getElementById('emailInput')?.value.trim();
    const pwd   = document.getElementById('passwordInput')?.value;
    if (!email || !pwd) return showErr('Email and password are required.');
    setBusy('loginBtn','loginSpinner','loginBtnText',true);
    try {
      const r = await fetch(`${BASE}/login`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({email,password:pwd}) });
      const d = await r.json();
      if (d.success) { saveToken(d.data.accessToken); window.location.href = '/'; }
      else showErr(d.message || 'Login failed.');
    } catch { showErr('Network error. Please try again.'); }
    finally { setBusy('loginBtn','loginSpinner','loginBtnText',false); }
  };

  // ── Logout ──
  const logout = async () => {
    try {
      await fetch(`${BASE}/logout`, { method:'POST', headers: getHeaders(), credentials:'include' });
    } finally { 
      localStorage.removeItem('bd_session');
      clearToken(); 
      window.location.href = '/login.html'; 
    }
  };

  // ── Forgot password ──
  const forgotPassword = async () => {
    const email = document.getElementById('emailInput')?.value.trim();
    if (!email) return showErr('Please enter your email.');
    setBusy('resetBtn','resetSpinner','resetBtnText',true);
    try {
      const r = await fetch(`${BASE}/forgot-password`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email}) });
      const d = await r.json();
      if (d.success) {
        document.getElementById('formSection')?.classList.add('d-none');
        document.getElementById('successMsg')?.classList.remove('d-none');
      } else showErr(d.message);
    } catch { showErr('Network error.'); }
    finally { setBusy('resetBtn','resetSpinner','resetBtnText',false); }
  };

  // ── Update navbar with user info ──
  const updateNavAuth = async () => {
    // Show auth CTA on index if not logged in
    const authCta = document.getElementById('authCta');
    const user = await getCurrentUser();
    if (authCta) authCta.classList.toggle('d-none', !!user);

    // Replace profile links in nav if user is logged in
    // (Profile/decks links are shown in aimode.js widget area already)
  };

  // Auto-update navbar on every page
  (async () => {
    if (!_token) await tryRefresh();
    updateNavAuth();
    // Wire logout buttons
    document.getElementById('logoutBtn')?.addEventListener('click',  logout);
    document.getElementById('logoutBtn2')?.addEventListener('click', logout);
  })();

  return { register, login, logout, forgotPassword, getCurrentUser, getToken, getHeaders, tryRefresh, saveToken };
})();
