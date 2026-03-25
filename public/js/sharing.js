// public/js/sharing.js — share deck + score card
'use strict';
const Sharing = (() => {
  const injectShareBtn = () => {
    if (document.getElementById('shareBtn')) return;
    const nav = document.querySelector('.navbar .container .d-flex');
    if (!nav) return;
    const btn = document.createElement('button');
    btn.id = 'shareBtn';
    btn.title = 'Share this deck';
    btn.innerHTML = '<i class="bi bi-share"></i>';
    btn.style.cssText = 'background:var(--surface);border:none;border-radius:50%;width:36px;height:36px;box-shadow:var(--neu-shadow-sm);cursor:pointer;color:var(--text-muted);font-size:.9rem;transition:var(--transition);display:flex;align-items:center;justify-content:center';
    btn.addEventListener('click', shareCurrentDeck);
    nav.prepend(btn);
  };

  const shareCurrentDeck = async () => {
    const session = JSON.parse(localStorage.getItem('bd_session') || '{}');
    if (!session.cards?.length) { alert('No deck to share.'); return; }

    const btn = document.getElementById('shareBtn');
    if (btn) { btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; btn.disabled = true; }

    try {
      const r = await fetch('/api/share', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ sessionData: JSON.stringify(session) }),
      });
      const d = await r.json();
      if (d.success) {
        const url = window.location.origin + d.url;
        showShareModal(url);
      } else { alert(d.message || 'Could not share.'); }
    } catch { alert('Network error.'); }
    finally { if(btn){ btn.innerHTML='<i class="bi bi-share"></i>'; btn.disabled=false; } }
  };

  const showShareModal = (url) => {
    let modal = document.getElementById('shareModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'shareModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:9998;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = `
      <div style="background:var(--surface);border-radius:var(--radius-xl);padding:2rem;max-width:400px;width:90%;box-shadow:var(--neu-shadow)">
        <h4 style="color:var(--text);font-weight:800;margin-bottom:.5rem"><i class="bi bi-share-fill me-2" style="color:var(--primary)"></i>Share Deck</h4>
        <p style="color:var(--text-muted);font-size:.88rem;margin-bottom:1rem">Anyone with this link can study this deck. Link expires in 72 hours.</p>
        <div style="display:flex;gap:.5rem;margin-bottom:1rem">
          <input id="shareUrlInput" type="text" value="${url}" readonly
                 style="flex:1;background:var(--bg);border:none;border-radius:var(--radius);box-shadow:var(--neu-inset);padding:.6rem .9rem;font-size:.82rem;color:var(--text)">
          <button onclick="navigator.clipboard.writeText('${url}').then(()=>{ document.getElementById('copyFeedback').style.opacity=1; setTimeout(()=>document.getElementById('copyFeedback').style.opacity=0,2000) })"
                  style="background:var(--grad-primary);color:#fff;border:none;border-radius:var(--radius);padding:.6rem 1rem;cursor:pointer;font-weight:700;font-size:.85rem;box-shadow:3px 3px 10px rgba(108,99,255,0.35)">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
        <div id="copyFeedback" style="color:var(--success);font-size:.82rem;opacity:0;transition:opacity .3s"><i class="bi bi-check-circle-fill me-1"></i>Copied!</div>
        <button onclick="document.getElementById('shareModal').remove()"
                style="margin-top:1rem;width:100%;background:var(--surface);border:none;border-radius:var(--radius);box-shadow:var(--neu-shadow-sm);padding:.6rem;cursor:pointer;color:var(--text-muted);font-weight:600">
          Close
        </button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.getElementById('shareUrlInput')?.select();
  };

  document.addEventListener('DOMContentLoaded', injectShareBtn);
  return { injectShareBtn, shareCurrentDeck };
})();
