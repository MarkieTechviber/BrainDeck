// public/js/decks.js
'use strict';

(async () => {
  let user = await BrainDeckAuth.getCurrentUser();
  if (!user) { user = await BrainDeckAuth.tryRefresh(); }
  if (!user) { window.location.href = '/login.html'; return; }

  let allDecks = [];

  const FILE_ICONS  = { pdf:'bi-file-earmark-pdf', docx:'bi-file-earmark-word', pptx:'bi-file-earmark-slides', txt:'bi-file-earmark-text', md:'bi-markdown' };
  const FILE_COLORS = { pdf:'var(--danger)', docx:'var(--primary)', pptx:'var(--warning)', txt:'var(--success)', md:'var(--secondary)' };

  const TYPE_LABEL = { flashcard:'Flashcards', summary:'Summary', quiz:'Quiz' };
  const TYPE_ICON  = { flashcard:'bi-card-text', summary:'bi-list-ul', quiz:'bi-patch-question' };
  const TYPE_COLOR = { flashcard:'var(--primary)', summary:'var(--secondary)', quiz:'var(--warning)' };

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Group flat deck list into one entry per originalFileName ──────────────
  function groupDecks(decks) {
    const map = new Map(); // key: originalFileName (or id if no fileName)

    decks.forEach(d => {
      const key = d.originalFileName || `__solo_${d.id}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          title:            d.title,
          originalFileName: d.originalFileName,
          fileType:         d.fileType,
          createdAt:        d.createdAt,
          lastStudiedAt:    d.lastStudiedAt,
          types: {},   // cardType → deck row
        });
      }
      const group = map.get(key);
      group.types[d.cardType] = d;
      // Keep the most recent lastStudiedAt across all types
      if (d.lastStudiedAt && (!group.lastStudiedAt || d.lastStudiedAt > group.lastStudiedAt)) {
        group.lastStudiedAt = d.lastStudiedAt;
      }
    });

    return [...map.values()];
  }

  function renderDecks(decks) {
    const grid  = document.getElementById('deckGrid');
    const empty = document.getElementById('deckEmpty');
    const load  = document.getElementById('deckLoading');
    const label = document.getElementById('deckCountLabel');

    load.classList.add('d-none');

    const groups = groupDecks(decks);
    label.textContent = `${groups.length} deck${groups.length !== 1 ? 's' : ''} saved`;

    if (groups.length === 0) { empty.classList.remove('d-none'); grid.innerHTML = ''; return; }
    empty.classList.add('d-none');

    grid.innerHTML = groups.map(g => {
      const fileIcon  = FILE_ICONS[g.fileType]  || 'bi-file-earmark';
      const fileColor = FILE_COLORS[g.fileType] || 'var(--text-muted)';
      const studied   = g.lastStudiedAt ? `Last studied ${formatDate(g.lastStudiedAt)}` : 'Not yet studied';

      // Total card count across all types in this group
      const totalCards = Object.values(g.types).reduce((sum, d) => sum + (d.cardCount || 0), 0);
      const cardCountTxt = totalCards === 1 ? '1 card' : `${totalCards} cards`;

      // Type badges — only render types that actually exist in this group
      const ORDER = ['flashcard', 'summary', 'quiz'];
      const typeBadges = ORDER.filter(t => g.types[t]).map(t => `
        <span style="
          display:inline-flex;align-items:center;gap:3px;
          background:var(--surface);border-radius:20px;
          padding:2px 9px;font-size:.75rem;font-weight:600;
          box-shadow:var(--neu-shadow-sm);color:${TYPE_COLOR[t]}">
          <i class="bi ${TYPE_ICON[t]}"></i>${TYPE_LABEL[t]}
        </span>`).join('');

      // IDs for the study buttons — prefer flashcard, fallback to whatever exists
      const studyType  = g.types['flashcard'] ? 'flashcard' : ORDER.find(t => g.types[t]);
      const studyId    = g.types[studyType]?.id;

      // Collect all IDs for deletion
      const allIds = ORDER.filter(t => g.types[t]).map(t => g.types[t].id);

      return `
      <div class="col-md-6 col-lg-4">
        <div class="glass-card p-3 h-100 d-flex flex-column" style="cursor:default">

          <!-- Header: file icon + title -->
          <div class="d-flex align-items-start gap-2 mb-2">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--surface);
                        box-shadow:var(--neu-shadow-sm);display:flex;align-items:center;
                        justify-content:center;flex-shrink:0">
              <i class="bi ${fileIcon}" style="color:${fileColor};font-size:1.2rem"></i>
            </div>
            <div class="flex-grow-1 min-width-0">
              <h6 class="fw-700 mb-0 text-truncate" style="color:var(--text)" title="${escHtml(g.title)}">${escHtml(g.title)}</h6>
              <span class="bd-font-xs bd-text-muted">
                ${g.fileType?.toUpperCase() || '—'} · ${cardCountTxt}
              </span>
            </div>
          </div>

          <!-- Type badges -->
          <div class="d-flex flex-wrap gap-1 mb-2">${typeBadges}</div>

          <!-- Dates -->
          <div class="bd-font-xs bd-text-muted mb-3 flex-grow-1">
            <div><i class="bi bi-calendar3 me-1"></i>Created ${formatDate(g.createdAt)}</div>
            <div><i class="bi bi-clock-history me-1"></i>${studied}</div>
          </div>

          <!-- Actions -->
          <div class="d-flex gap-2">
            <button class="btn-primary-neu flex-fill py-1 rounded-3 bd-font-sm fw-600"
                    onclick="openDeck('${studyId}','${studyType}')">
              <i class="bi bi-play-fill me-1"></i>Study
            </button>
            <button class="btn-neu px-3 py-1 rounded-3 bd-font-sm"
                    style="color:var(--danger)"
                    onclick="deleteGroup(${JSON.stringify(allIds)},this)"
                    title="Delete deck">
              <i class="bi bi-trash3"></i>
            </button>
          </div>

        </div>
      </div>`;
    }).join('');
  }

  // ── Open a deck (always opens flashcards first) ───────────────────────────
  window.openDeck = async (id, cardType) => {
    try {
      const r = await fetch(`/api/decks/${id}`, { headers: BrainDeckAuth.getHeaders(), credentials:'include' });
      const d = await r.json();
      if (d.success) {
        localStorage.setItem('bd_session', JSON.stringify({
          sessionId: `deck_${id}`,
          cardType:  d.data.deck.cardType,
          cards:     d.data.deck.cards,
          cardCount: d.data.deck.cardCount,
          timestamp: Date.now(),
        }));
        const pages = { flashcard:'flashcard.html', summary:'summary.html', quiz:'quiz.html' };
        window.location.href = pages[cardType] || 'flashcard.html';
      }
    } catch { alert('Could not load deck.'); }
  };

  // ── Delete all types in a group at once ───────────────────────────────────
  window.deleteGroup = async (ids, btn) => {
    if (!confirm('Delete this deck (all types)? This cannot be undone.')) return;
    btn.disabled = true;
    try {
      await Promise.all(ids.map(id =>
        fetch(`/api/decks/${id}`, { method:'DELETE', headers: BrainDeckAuth.getHeaders(), credentials:'include' })
      ));
      // Remove all matching decks from local state and re-render
      const idSet = new Set(ids.map(String));
      allDecks = allDecks.filter(d => !idSet.has(String(d.id)));
      renderDecks(filterDecks());
    } catch { alert('Network error.'); btn.disabled = false; }
  };

  function filterDecks() {
    const q = document.getElementById('searchInput')?.value.toLowerCase() || '';
    if (!q) return allDecks;
    return allDecks.filter(d =>
      (d.title||'').toLowerCase().includes(q) ||
      (d.cardType||'').includes(q) ||
      (d.fileType||'').includes(q) ||
      (d.originalFileName||'').toLowerCase().includes(q)
    );
  }

  document.getElementById('searchInput')?.addEventListener('input', () => renderDecks(filterDecks()));

  // ── Load decks ────────────────────────────────────────────────────────────
  try {
    const r = await fetch('/api/decks', { headers: BrainDeckAuth.getHeaders(), credentials:'include' });
    const d = await r.json();
    if (d.success) {
      allDecks = d.data.decks || [];
      renderDecks(allDecks);
    } else {
      document.getElementById('deckLoading').innerHTML = '<p class="bd-text-muted">Could not load decks.</p>';
    }
  } catch {
    document.getElementById('deckLoading').innerHTML = '<p class="bd-text-muted">Could not load decks.</p>';
  }

})();
