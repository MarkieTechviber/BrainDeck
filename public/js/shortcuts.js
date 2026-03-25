// public/js/shortcuts.js — global keyboard shortcuts + help overlay
'use strict';
const Shortcuts = (() => {
  const show = () => {
    let modal = document.getElementById('shortcutsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'shortcutsModal';
      modal.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center" id="shortcutsOverlay">
          <div style="background:var(--surface);border-radius:var(--radius-xl);padding:2rem;max-width:440px;width:90%;box-shadow:var(--neu-shadow)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
              <h3 style="color:var(--text);font-weight:800;font-size:1.2rem"><i class="bi bi-keyboard me-2" style="color:var(--primary)"></i>Keyboard Shortcuts</h3>
              <button onclick="document.getElementById('shortcutsModal').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.2rem">&times;</button>
            </div>
            <div style="display:grid;gap:.6rem">
              ${[
                ['Space / Enter','Flip card'],
                ['→ / L','Next card'],
                ['← / H','Previous card'],
                ['G','Got it!'],
                ['R','Need review'],
                ['F','Toggle focus mode'],
                ['D','Toggle dark mode'],
                ['T','Text-to-speech'],
                ['P','Pause/resume timer'],
                ['?','Show this help'],
                ['Esc','Exit focus mode / close'],
              ].map(([k,v]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:.4rem 0;border-bottom:.5px solid rgba(108,99,255,0.1)">
                  <span style="color:var(--text-muted);font-size:.9rem">${v}</span>
                  <kbd style="background:var(--bg);border-radius:8px;padding:.2rem .6rem;font-size:.8rem;color:var(--primary);font-family:monospace;box-shadow:var(--neu-shadow-sm)">${k}</kbd>
                </div>`).join('')}
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#shortcutsOverlay').addEventListener('click', e => { if(e.target===e.currentTarget) modal.remove(); });
    }
  };

  document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) show();
    if (e.key === 'd' || e.key === 'D') typeof Theme !== 'undefined' && Theme.toggle();
    if (e.key === 'Escape') {
      document.getElementById('shortcutsModal')?.remove();
      document.body.classList.remove('bd-focus-mode');
    }
    if (e.key === 'f' || e.key === 'F') {
      if (!document.querySelector('.bd-flip-scene')) return;
      document.body.classList.toggle('bd-focus-mode');
    }
    if ((e.key === 't' || e.key === 'T') && typeof TTS !== 'undefined') TTS.toggle();
    if ((e.key === 'p' || e.key === 'P') && typeof Pomodoro !== 'undefined') Pomodoro.toggle();
    if (e.key === 'g' || e.key === 'G') document.getElementById('gotItBtn')?.click();
    if (e.key === 'r' || e.key === 'R') document.getElementById('needReviewBtn')?.click();
  });

  return { show };
})();
