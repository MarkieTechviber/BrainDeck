// public/js/decks.js
'use strict';

(async () => {
  let user = await BrainDeckAuth.getCurrentUser();
  if (!user) { user = await BrainDeckAuth.tryRefresh(); }
  if (!user) { window.location.href = '/login.html'; return; }

  let allDecks = [];

  const TYPE_ICONS  = { flashcard:'bi-card-text', summary:'bi-list-ul', quiz:'bi-patch-question' };
  const TYPE_COLORS = { flashcard:'var(--primary)', summary:'var(--secondary)', quiz:'var(--warning)' };
  const FILE_ICONS  = { pdf:'bi-file-earmark-pdf', docx:'bi-file-earmark-word', pptx:'bi-file-earmark-slides', txt:'bi-file-earmark-text', md:'bi-markdown' };
  const FILE_COLORS = { pdf:'var(--danger)', docx:'var(--primary)', pptx:'var(--warning)', txt:'var(--success)', md:'var(--secondary)' };

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  }
  function fmtCount(n) { return n === 1 ? '1 card' : `${n} cards`; }

  function renderDecks(decks) {
    const grid  = document.getElementById('deckGrid');
    const empty = document.getElementById('deckEmpty');
    const load  = document.getElementById('deckLoading');
    const label = document.getElementById('deckCountLabel');

    load.classList.add('d-none');
    label.textContent = `${decks.length} deck${decks.length !== 1 ? 's' : ''} saved`;

    if (decks.length === 0) { empty.classList.remove('d-none'); grid.innerHTML=''; return; }
    empty.classList.add('d-none');

    grid.innerHTML = decks.map(d => {
      const typeIcon  = TYPE_ICONS[d.cardType]  || 'bi-card-text';
      const typeColor = TYPE_COLORS[d.cardType] || 'var(--primary)';
      const fileIcon  = FILE_ICONS[d.fileType]  || 'bi-file-earmark';
      const fileColor = FILE_COLORS[d.fileType] || 'var(--text-muted)';
      const studied   = d.lastStudiedAt ? `Last studied ${formatDate(d.lastStudiedAt)}` : 'Not yet studied';

      return `
      <div class="col-md-6 col-lg-4">
        <div class="glass-card p-3 h-100 d-flex flex-column" style="cursor:default">
          <div class="d-flex align-items-start gap-2 mb-3">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--surface);box-shadow:var(--neu-shadow-sm);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="bi ${typeIcon}" style="color:${typeColor};font-size:1.2rem"></i>
            </div>
            <div class="flex-grow-1 min-width-0">
              <h6 class="fw-700 mb-0 text-truncate" style="color:var(--text)" title="${escHtml(d.title)}">${escHtml(d.title)}</h6>
              <span class="bd-font-xs bd-text-muted"><i class="bi ${fileIcon} me-1" style="color:${fileColor}"></i>${d.fileType?.toUpperCase()||'—'} · ${fmtCount(d.cardCount)}</span>
            </div>
          </div>
          <div class="bd-font-xs bd-text-muted mb-3 flex-grow-1">
            <div><i class="bi bi-calendar3 me-1"></i>Created ${formatDate(d.createdAt)}</div>
            <div><i class="bi bi-clock-history me-1"></i>${studied}</div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn-primary-neu flex-fill py-1 rounded-3 bd-font-sm fw-600"
                    onclick="openDeck('${d.id}','${d.cardType}')">
              <i class="bi bi-play-fill me-1"></i>Study
            </button>
            <button class="btn-neu px-3 py-1 rounded-3 bd-font-sm"
                    style="color:var(--danger)"
                    onclick="deleteDeck('${d.id}',this)"
                    title="Delete deck">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.openDeck = async (id, cardType) => {
    try {
      const r = await fetch(`/api/decks/${id}`, { headers: BrainDeckAuth.getHeaders(), credentials:'include' });
      const d = await r.json();
      if (d.success) {
        localStorage.setItem('bd_session', JSON.stringify({
          sessionId: `deck_${id}`,
          cardType: d.data.deck.cardType,
          cards:    d.data.deck.cards,
          cardCount:d.data.deck.cardCount,
          timestamp: Date.now(),
        }));
        const pages = { flashcard:'flashcard.html', summary:'summary.html', quiz:'quiz.html' };
        window.location.href = pages[cardType] || 'flashcard.html';
      }
    } catch { alert('Could not load deck.'); }
  };

  window.deleteDeck = async (id, btn) => {
    if (!confirm('Delete this deck? This cannot be undone.')) return;
    btn.disabled = true;
    try {
      const r = await fetch(`/api/decks/${id}`, { method:'DELETE', headers: BrainDeckAuth.getHeaders(), credentials:'include' });
      const d = await r.json();
      if (d.success) {
        allDecks = allDecks.filter(dk => dk._id !== id);
        renderDecks(filterDecks());
      } else { alert(d.message || 'Delete failed.'); btn.disabled = false; }
    } catch { alert('Network error.'); btn.disabled = false; }
  };

  function filterDecks() {
    const q = document.getElementById('searchInput')?.value.toLowerCase() || '';
    return q ? allDecks.filter(d => d.title.toLowerCase().includes(q) || d.cardType.includes(q) || (d.fileType||'').includes(q)) : allDecks;
  }

  document.getElementById('searchInput')?.addEventListener('input', () => renderDecks(filterDecks()));

  // ── Load decks ──
  try {
    const r = await fetch('/api/decks', { headers: BrainDeckAuth.getHeaders(), credentials:'include' });
    const d = await r.json();
    if (d.success) { allDecks = d.data.decks || []; renderDecks(allDecks); }
    else { document.getElementById('deckLoading').innerHTML = '<p class="bd-text-muted">Could not load decks.</p>'; }
  } catch {
    document.getElementById('deckLoading').innerHTML = '<p class="bd-text-muted">Could not load decks.</p>';
  }

})();
