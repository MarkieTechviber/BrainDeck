// public/js/urlimport.js — URL and YouTube link import
'use strict';
const UrlImport = (() => {
  const inject = () => {
    const uploadCard = document.querySelector('.glass-card');
    if (!uploadCard || document.getElementById('urlImportSection')) return;

    const section = document.createElement('div');
    section.id = 'urlImportSection';
    section.style.cssText = 'margin-top:1rem';
    section.innerHTML = `
      <div style="text-align:center;margin:.5rem 0">
        <span style="color:var(--text-muted);font-size:.82rem">— or import from a URL —</span>
      </div>
      <div style="display:flex;gap:.5rem">
        <div style="position:relative;flex:1">
          <i class="bi bi-link-45deg" style="position:absolute;left:.9rem;top:50%;transform:translateY(-50%);color:var(--text-light)"></i>
          <input id="urlInput" type="url" class="neu-input" style="padding-left:2.4rem"
                 placeholder="https://en.wikipedia.org/wiki/... or YouTube link">
        </div>
        <button id="urlImportBtn"
                style="background:var(--grad-primary);color:#fff;border:none;border-radius:var(--radius);
                       padding:.5rem 1rem;cursor:pointer;font-weight:700;font-size:.85rem;white-space:nowrap;
                       box-shadow:3px 3px 10px rgba(108,99,255,0.35);transition:var(--transition)">
          <i class="bi bi-arrow-down-circle me-1"></i>Import
        </button>
      </div>
      <div id="urlStatus" style="font-size:.78rem;margin-top:.4rem;color:var(--text-muted)"></div>`;

    // Insert after file size note
    const sizeNote = uploadCard.querySelector('p');
    if (sizeNote) sizeNote.after(section);
    else uploadCard.appendChild(section);

    document.getElementById('urlImportBtn').addEventListener('click', importUrl);
    document.getElementById('urlInput').addEventListener('keydown', e => { if(e.key==='Enter') importUrl(); });
  };

  const importUrl = async () => {
    const input = document.getElementById('urlInput');
    const status = document.getElementById('urlStatus');
    const btn = document.getElementById('urlImportBtn');
    const url = input?.value.trim();
    if (!url) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Fetching...';
    if (status) status.textContent = 'Fetching content…';

    try {
      const r = await fetch('/api/url-import', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ url }),
      });
      const d = await r.json();
      if (d.success) {
        // Treat result like an uploaded file — trigger generate flow
        status.style.color = 'var(--success)';
        status.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i>Fetched: ${d.data.originalName} (${Math.round(d.data.fileSize/1000)}k chars)`;

        // Store file path in a global for the generate button to pick up
        window._sc_urlFilePath = d.data.filePath;
        window._sc_urlFileName = url;

        // Patch the generateBtn to use this file
        const origGenerate = document.getElementById('generateBtn');
        if (origGenerate) {
          origGenerate.removeAttribute('disabled');
          // Override click handler
          origGenerate._urlOverride = d.data;
        }
      } else {
        status.style.color = 'var(--danger)';
        status.textContent = d.message || 'Import failed.';
      }
    } catch (err) {
      if (status) { status.style.color = 'var(--danger)'; status.textContent = 'Could not fetch URL.'; }
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-arrow-down-circle me-1"></i>Import';
    }
  };

  return { inject };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('dropZone')) UrlImport.inject();
});
