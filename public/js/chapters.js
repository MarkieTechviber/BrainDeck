// public/js/chapters.js
// Chapter / section jump for BrainDeck study pages
'use strict';

const Chapters = (() => {

  // ── Auto-group cards that have no chapter field ──
  // Uses simple keyword clustering: find common topic words across questions
  function autoGroup(cards, cardType) {
    if (!cards?.length) return [];

    // If cards already have chapter fields, use those
    const hasChapters = cards.some(c => c.chapter);
    if (hasChapters) {
      const seen = [];
      cards.forEach(c => {
        const ch = c.chapter || 'General';
        if (!seen.includes(ch)) seen.push(ch);
      });
      return seen.map(ch => ({
        title:    ch,
        cards:    cards.filter(c => (c.chapter || 'General') === ch),
        startIdx: cards.findIndex(c => (c.chapter || 'General') === ch),
      }));
    }

    // Fallback: group into equal-ish chunks of ~6 cards, label by content
    const CHUNK = 6;
    const groups = [];
    for (let i = 0; i < cards.length; i += CHUNK) {
      const chunk = cards.slice(i, Math.min(i + CHUNK, cards.length));
      const label = deriveLabel(chunk, cardType, groups.length + 1);
      groups.push({ title: label, cards: chunk, startIdx: i });
    }
    return groups;
  }

  // ── Derive a chapter label from card content ──
  function deriveLabel(cards, cardType, num) {
    // Pull topic words from questions/titles
    const text = cards.map(c =>
      (c.question || c.title || c.front || '').toLowerCase()
    ).join(' ');

    // Strip common stop words
    const stop = new Set(['what','is','the','a','an','of','in','to','and','or',
      'how','does','why','when','who','which','are','was','were','do','did',
      'can','could','would','should','has','have','had','been','be','with',
      'for','on','at','by','from','as','its','it','that','this','these','those']);

    const words = text.split(/\W+/).filter(w => w.length > 3 && !stop.has(w));

    // Find most frequent meaningful word
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const topWord = sorted[0]?.[0] || '';

    if (topWord) {
      return `Chapter ${num}: ${topWord.charAt(0).toUpperCase() + topWord.slice(1)}`;
    }
    return `Chapter ${num}`;
  }

  // ── Build and inject the chapter sidebar ────
  function inject(cards, cardType, chapters, onJump) {
    if (document.getElementById('chapterNav')) return;
    if (!cards?.length) return;

    // Build groups
    const groups = chapters?.length
      ? chapters.map((title, i) => {
          const ch = typeof title === 'string' ? title : title.title;
          return {
            title:    ch,
            cards:    cards.filter(c => (c.chapter || '') === ch),
            startIdx: cards.findIndex(c => (c.chapter || '') === ch),
          };
        }).filter(g => g.cards.length > 0)
      : autoGroup(cards, cardType);

    if (!groups.length || groups.length < 2) return; // not worth showing for 1 group

    // ── Build panel HTML ──
    const panel = document.createElement('div');
    panel.id = 'chapterNav';
    panel.innerHTML = `
      <style>
        #chapterNav {
          position: fixed;
          left: 0; top: 50%;
          transform: translateY(-50%);
          z-index: 600;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
          padding: .5rem 0;
          transition: transform .3s ease;
        }
        /* Shift right when sidebar is open */
        .bd-sidebar.bd-sidebar-visible ~ .bd-main #chapterNav,
        .bd-sidebar-visible + .bd-sidebar-overlay + .bd-main #chapterNav {
          left: 240px;
        }
        .bd-sidebar.collapsed ~ .bd-main #chapterNav {
          left: 64px;
        }

        #chapterNavToggle {
          position: fixed;
          left: 0; top: 50%;
          transform: translateY(-50%);
          z-index: 601;
          background: var(--surface);
          border: none;
          border-radius: 0 var(--radius) var(--radius) 0;
          box-shadow: 4px 0 12px rgba(0,0,0,.12);
          padding: .5rem .35rem;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          transition: left .3s ease;
        }
        #chapterNavToggle i { font-size: .9rem; color: var(--text-muted); }
        #chapterNavToggle .ch-count {
          font-size: .6rem; font-weight: 700;
          color: var(--primary); line-height: 1;
        }

        #chapterPanel {
          position: fixed;
          left: -260px; top: 0;
          width: 260px; height: 100vh;
          background: var(--surface);
          box-shadow: 4px 0 24px rgba(0,0,0,.15);
          z-index: 600;
          transition: left .3s cubic-bezier(.4,0,.2,1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        #chapterPanel.open { left: 0; }

        /* Shift when sidebar visible */
        .bd-sidebar.bd-sidebar-visible ~ .bd-main #chapterPanel,
        .bd-sidebar.bd-sidebar-visible ~ .bd-main #chapterNavToggle {
          left: 240px !important;
        }
        .bd-sidebar.bd-sidebar-visible ~ .bd-main #chapterPanel.open {
          left: calc(240px) !important;
        }
        .bd-sidebar.collapsed ~ .bd-main #chapterPanel { left: calc(64px - 260px); }
        .bd-sidebar.collapsed ~ .bd-main #chapterPanel.open { left: 64px; }
        .bd-sidebar.collapsed ~ .bd-main #chapterNavToggle { left: 64px; }

        #chapterPanelHeader {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 1rem 1rem .75rem;
          border-bottom: .5px solid rgba(108,99,255,.12);
          flex-shrink: 0;
        }
        #chapterPanelHeader h6 {
          font-size: .85rem; font-weight: 800;
          color: var(--text); margin: 0;
          display: flex; align-items: center; gap: .4rem;
        }
        #chapterPanelHeader h6 i { color: var(--primary); }
        .ch-close-btn {
          background: none; border: none;
          color: var(--text-muted); cursor: pointer;
          font-size: 1.1rem; padding: .1rem .3rem;
          border-radius: 6px;
        }
        .ch-close-btn:hover { color: var(--text); background: rgba(108,99,255,.08); }

        #chapterList {
          flex: 1; overflow-y: auto;
          padding: .5rem;
        }
        #chapterList::-webkit-scrollbar { width: 3px; }
        #chapterList::-webkit-scrollbar-thumb { background: rgba(108,99,255,.2); border-radius: 3px; }

        .ch-item {
          display: flex; align-items: center;
          gap: .6rem;
          padding: .55rem .65rem;
          border-radius: var(--radius);
          cursor: pointer;
          transition: all .15s ease;
          border: .5px solid transparent;
          margin-bottom: 2px;
        }
        .ch-item:hover {
          background: rgba(108,99,255,.07);
          border-color: rgba(108,99,255,.15);
        }
        .ch-item.active {
          background: rgba(108,99,255,.12);
          border-color: rgba(108,99,255,.3);
        }
        .ch-num {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: rgba(108,99,255,.1);
          color: var(--primary);
          font-size: .68rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ch-item.active .ch-num {
          background: var(--primary);
          color: #fff;
        }
        .ch-info { flex: 1; min-width: 0; }
        .ch-title {
          font-size: .82rem; font-weight: 600;
          color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          line-height: 1.3;
        }
        .ch-meta {
          font-size: .68rem; color: var(--text-muted);
          margin-top: 1px;
        }
        .ch-progress {
          width: 28px; height: 28px;
          flex-shrink: 0;
          position: relative;
        }
        .ch-progress svg { transform: rotate(-90deg); }
        .ch-progress-ring {
          transition: stroke-dashoffset .4s ease;
        }

        /* Dark mode */
        [data-theme="dark"] #chapterPanel {
          background: rgba(20,25,40,.98);
          box-shadow: 4px 0 24px rgba(0,0,0,.4);
        }
        [data-theme="dark"] #chapterNavToggle {
          background: rgba(20,25,40,.98);
          box-shadow: 4px 0 12px rgba(0,0,0,.35);
        }

        /* Mobile: full-width slide */
        @media (max-width: 768px) {
          #chapterPanel { width: 85vw; left: -85vw; }
          #chapterPanel.open { left: 0 !important; }
          .bd-sidebar.bd-sidebar-visible ~ .bd-main #chapterPanel.open { left: 0 !important; }
          .bd-sidebar.bd-sidebar-visible ~ .bd-main #chapterNavToggle { left: 0 !important; }
        }
      </style>

      <!-- Toggle button (always visible) -->
      <button id="chapterNavToggle" title="Chapters">
        <i class="bi bi-bookmark-fill" style="color:var(--primary)"></i>
        <span class="ch-count">${groups.length}</span>
      </button>

      <!-- Panel -->
      <div id="chapterPanel">
        <div id="chapterPanelHeader">
          <h6><i class="bi bi-bookmark-fill"></i> Chapters</h6>
          <button class="ch-close-btn" id="chapterCloseBtn">&times;</button>
        </div>
        <div id="chapterList">
          ${groups.map((g, i) => `
            <div class="ch-item" data-start="${g.startIdx}" data-idx="${i}" id="chItem_${i}">
              <div class="ch-num">${i + 1}</div>
              <div class="ch-info">
                <div class="ch-title">${escHtml(g.title)}</div>
                <div class="ch-meta">${g.cards.length} card${g.cards.length !== 1 ? 's' : ''}</div>
              </div>
              <div class="ch-progress">
                <svg width="28" height="28" viewBox="0 0 28 28">
                  <circle cx="14" cy="14" r="11" fill="none"
                          stroke="rgba(108,99,255,.12)" stroke-width="2.5"/>
                  <circle cx="14" cy="14" r="11" fill="none"
                          stroke="var(--primary)" stroke-width="2.5"
                          stroke-dasharray="${Math.round(2 * Math.PI * 11)}"
                          stroke-dashoffset="${Math.round(2 * Math.PI * 11)}"
                          stroke-linecap="round"
                          class="ch-progress-ring"
                          id="chRing_${i}"/>
                </svg>
              </div>
            </div>`).join('')}
        </div>
      </div>`;

    document.body.appendChild(panel);

    // ── Wire toggle ──
    const toggle  = document.getElementById('chapterNavToggle');
    const chPanel = document.getElementById('chapterPanel');
    const closeBtn= document.getElementById('chapterCloseBtn');

    toggle.addEventListener('click', () => chPanel.classList.toggle('open'));
    closeBtn.addEventListener('click', () => chPanel.classList.remove('open'));

    // Close on outside click
    document.addEventListener('click', e => {
      if (chPanel.classList.contains('open') &&
          !chPanel.contains(e.target) &&
          !toggle.contains(e.target)) {
        chPanel.classList.remove('open');
      }
    });

    // ── Wire chapter item clicks ──
    document.querySelectorAll('.ch-item').forEach(item => {
      item.addEventListener('click', () => {
        const startIdx = parseInt(item.dataset.start);
        if (onJump) onJump(startIdx);
        chPanel.classList.remove('open');
        setActive(parseInt(item.dataset.idx));
      });
    });

    return groups;
  }

  // ── Update active chapter based on current card index ──
  function updateActive(cardIdx, groups) {
    if (!groups) return;
    // Find which group this card belongs to
    let activeGroup = 0;
    for (let i = groups.length - 1; i >= 0; i--) {
      if (cardIdx >= groups[i].startIdx) { activeGroup = i; break; }
    }
    setActive(activeGroup);
    updateProgressRings(cardIdx, groups);
  }

  function setActive(groupIdx) {
    document.querySelectorAll('.ch-item').forEach((el, i) => {
      el.classList.toggle('active', i === groupIdx);
    });
    // Scroll active into view in the panel
    const active = document.querySelector(`.ch-item[data-idx="${groupIdx}"]`);
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── Update progress rings ─────────────────────
  function updateProgressRings(currentIdx, groups, ratings = {}) {
    groups.forEach((g, i) => {
      const ring = document.getElementById(`chRing_${i}`);
      if (!ring) return;

      const circumference = Math.round(2 * Math.PI * 11);
      const cardsInGroup  = g.cards.length;

      // Count how many cards in this group have been rated
      const rated = g.cards.filter(c => ratings[c.id]).length;
      const pct   = cardsInGroup > 0 ? rated / cardsInGroup : 0;
      const offset= Math.round(circumference * (1 - pct));

      ring.style.strokeDashoffset = offset;

      // Color: green if complete, primary otherwise
      if (pct === 1) ring.style.stroke = 'var(--success)';
      else if (pct > 0) ring.style.stroke = 'var(--primary)';
      else ring.style.stroke = 'rgba(108,99,255,.4)';
    });
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { inject, autoGroup, updateActive, updateProgressRings };
})();
