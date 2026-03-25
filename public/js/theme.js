// public/js/theme.js — dark/light theme toggle
'use strict';
const Theme = (() => {
  const KEY = 'bd_theme';
  const apply = t => {
    document.documentElement.setAttribute('data-theme', t);
    document.body.setAttribute('data-theme', t);
    // Also set on any dynamically appended modal wrappers
    document.querySelectorAll('#aiModeModal').forEach(el => el.setAttribute('data-theme', t));
    localStorage.setItem(KEY, t);
    document.querySelectorAll('.bd-theme-icon').forEach(el => {
      el.className = 'bd-theme-icon bi ' + (t === 'dark' ? 'bi-sun-fill' : 'bi-moon-fill');
    });
  };
  const toggle = () => apply(current() === 'dark' ? 'light' : 'dark');
  const current = () => localStorage.getItem(KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const init = () => { apply(current()); };
  return { init, toggle, current };
})();
Theme.init();
