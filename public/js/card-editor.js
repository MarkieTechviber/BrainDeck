// public/js/card-editor.js
// Full card editor panel — edit, add, delete, reorder cards
'use strict';

const CardEditor = (() => {
  let cards       = [];        // working copy
  let onApply     = null;      // callback when user applies changes
  let editingId   = null;      // currently open card id
  let searchQuery = '';
  let cardType    = 'flashcard';
  let nextTempId  = 9000;      // temp ids for new cards

  // ── Build panel HTML once ──────────────────
  function buildPanel() {
    if (document.getElementById('cePanel')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'ceBackdrop';
    backdrop.className = 'ce-backdrop';
    backdrop.addEventListener('click', close);
    document.body.appendChild(backdrop);

    const panel = document.createElement('div');
    panel.id = 'cePanel';
    panel.className = 'ce-panel';
    panel.innerHTML = `
      <div class="ce-header">
        <div class="ce-title">
          <i class="bi bi-pencil-square"></i>
          Edit Cards
        </div>
        <div class="ce-header-actions">
          <span class="ce-count" id="ceCount">0 cards</span>
          <button class="ce-close-btn" id="ceCloseBtn" title="Close">&times;</button>
        </div>
      </div>

      <div class="ce-toolbar">
        <input class="ce-search" id="ceSearch" type="text" placeholder="Search cards…">
        <button class="ce-add-btn" id="ceAddBtn">
          <i class="bi bi-plus-lg me-1"></i>Add card
        </button>
      </div>

      <div class="ce-list" id="ceList"></div>

      <div class="ce-footer">
        <span class="ce-footer-note" id="ceFooterNote">Changes apply to this session only</span>
        <div style="display:flex;gap:.5rem">
          <button class="ce-btn" id="ceCancelBtn">Cancel</button>
          <button class="ce-apply-btn" id="ceApplyBtn">
            <i class="bi bi-check-lg me-1"></i>Apply changes
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Wire header buttons
    document.getElementById('ceCloseBtn').addEventListener('click', close);
    document.getElementById('ceCancelBtn').addEventListener('click', close);
    document.getElementById('ceApplyBtn').addEventListener('click', applyChanges);
    document.getElementById('ceAddBtn').addEventListener('click', addCard);
    document.getElementById('ceSearch').addEventListener('input', e => {
      searchQuery = e.target.value.toLowerCase();
      renderList();
    });
  }

  // ── Open panel ─────────────────────────────
  function open(cardList, type, callback) {
    buildPanel();
    cards     = JSON.parse(JSON.stringify(cardList)); // deep copy
    cardType  = type || 'flashcard';
    onApply   = callback;
    editingId = null;
    searchQuery = '';
    document.getElementById('ceSearch').value = '';

    renderList();
    updateCount();
    updateFooterNote();

    requestAnimationFrame(() => {
      document.getElementById('ceBackdrop').classList.add('open');
      document.getElementById('cePanel').classList.add('open');
    });

    document.addEventListener('keydown', onEscKey);
  }

  // ── Close panel ────────────────────────────
  function close() {
    document.getElementById('ceBackdrop')?.classList.remove('open');
    document.getElementById('cePanel')?.classList.remove('open');
    document.removeEventListener('keydown', onEscKey);
  }

  const onEscKey = e => { if (e.key === 'Escape') close(); };

  // ── Render card list ───────────────────────
  function renderList() {
    const list = document.getElementById('ceList');
    if (!list) return;

    const filtered = searchQuery
      ? cards.filter(c => {
          const q = (c.question || c.title || c.front || '').toLowerCase();
          const a = (c.answer   || c.back  || c.summary || '').toLowerCase();
          const p = (c.options?.map(o=>o.text).join(' ') || '').toLowerCase();
          return q.includes(searchQuery) || a.includes(searchQuery) || p.includes(searchQuery);
        })
      : cards;

    if (!filtered.length) {
      list.innerHTML = `
        <div class="ce-empty">
          <i class="bi bi-${searchQuery ? 'search' : 'card-list'}"></i>
          <div>${searchQuery ? `No cards match "${searchQuery}"` : 'No cards yet'}</div>
          ${!searchQuery ? '<div style="font-size:.78rem;margin-top:.4rem">Click "Add card" to create one</div>' : ''}
        </div>`;
      return;
    }

    list.innerHTML = '';
    filtered.forEach((card, displayIdx) => {
      const realIdx = cards.indexOf(card);
      const item = buildCardItem(card, realIdx, displayIdx);
      list.appendChild(item);
    });
  }

  // ── Build a single card item ───────────────
  function buildCardItem(card, realIdx, displayIdx) {
    const item = document.createElement('div');
    item.className = 'ce-card-item';
    item.dataset.id = card.id;
    if (card._new) item.classList.add('new-card');
    if (editingId === card.id) item.classList.add('editing');

    const preview = getPreview(card);
    const isOpen  = editingId === card.id;

    item.innerHTML = `
      <div class="ce-card-header" data-id="${card.id}">
        <div class="ce-icon-btn ce-drag-handle" title="Drag to reorder">
          <i class="bi bi-grip-vertical"></i>
        </div>
        <div class="ce-card-num">${realIdx + 1}</div>
        <div class="ce-card-preview">${escHtml(preview)}</div>
        <div class="ce-card-actions">
          <button class="ce-icon-btn ce-edit-toggle" data-id="${card.id}" title="Edit card">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="ce-icon-btn ce-dup-btn" data-id="${card.id}" title="Duplicate">
            <i class="bi bi-copy"></i>
          </button>
          <button class="ce-icon-btn del ce-del-btn" data-id="${card.id}" title="Delete card">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>
      ${isOpen ? buildEditForm(card) : ''}
    `;

    // Wire events
    item.querySelector('.ce-card-header').addEventListener('click', e => {
      if (e.target.closest('button')) return;
      toggleEdit(card.id);
    });
    item.querySelector('.ce-edit-toggle').addEventListener('click', () => toggleEdit(card.id));
    item.querySelector('.ce-dup-btn').addEventListener('click',     () => duplicateCard(card.id));
    item.querySelector('.ce-del-btn').addEventListener('click',     () => deleteCard(card.id, item));

    if (isOpen) {
      item.querySelector('.ce-btn-cancel-edit')?.addEventListener('click', () => { editingId = null; renderList(); });
      item.querySelector('.ce-btn-save-edit')?.addEventListener('click',   () => saveCard(card.id, item));
      // Auto-resize textareas
      item.querySelectorAll('.ce-textarea').forEach(ta => {
        ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; });
        setTimeout(() => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }, 10);
      });
    }

    return item;
  }

  // ── Build edit form fields ─────────────────
  function buildEditForm(card) {
    if (cardType === 'flashcard') {
      return `
        <div class="ce-edit-form">
          <div>
            <div class="ce-field-label">Question</div>
            <textarea class="ce-textarea" id="ceQ_${card.id}" rows="3">${escHtml(card.question || '')}</textarea>
          </div>
          <div>
            <div class="ce-field-label">Answer</div>
            <textarea class="ce-textarea" id="ceA_${card.id}" rows="3">${escHtml(card.answer || '')}</textarea>
          </div>
          <div class="ce-diff-row">
            <span class="ce-diff-label">Difficulty:</span>
            <select class="ce-diff-select" id="ceD_${card.id}">
              <option value="easy"   ${card.difficulty==='easy'   ?'selected':''}>Easy</option>
              <option value="medium" ${(card.difficulty==='medium'||!card.difficulty)?'selected':''}>Medium</option>
              <option value="hard"   ${card.difficulty==='hard'   ?'selected':''}>Hard</option>
            </select>
          </div>
          <div class="ce-save-row">
            <button class="ce-btn ce-btn-cancel-edit">Cancel</button>
            <button class="ce-btn primary ce-btn-save-edit"><i class="bi bi-check-lg me-1"></i>Save</button>
          </div>
        </div>`;
    }

    if (cardType === 'summary') {
      const pts = (card.keyPoints || []).join('\n');
      return `
        <div class="ce-edit-form">
          <div>
            <div class="ce-field-label">Title</div>
            <textarea class="ce-textarea" id="ceQ_${card.id}" rows="2">${escHtml(card.title || '')}</textarea>
          </div>
          <div>
            <div class="ce-field-label">Key points (one per line)</div>
            <textarea class="ce-textarea" id="ceA_${card.id}" rows="4">${escHtml(pts)}</textarea>
          </div>
          <div>
            <div class="ce-field-label">Summary</div>
            <textarea class="ce-textarea" id="ceS_${card.id}" rows="3">${escHtml(card.summary || '')}</textarea>
          </div>
          <div class="ce-save-row">
            <button class="ce-btn ce-btn-cancel-edit">Cancel</button>
            <button class="ce-btn primary ce-btn-save-edit"><i class="bi bi-check-lg me-1"></i>Save</button>
          </div>
        </div>`;
    }

    if (cardType === 'quiz') {
      const opts = (card.options || []).map((o,i) =>
        `${o.label || String.fromCharCode(65+i)}. ${o.text}${o.isCorrect?' [CORRECT]':''}`
      ).join('\n');
      return `
        <div class="ce-edit-form">
          <div>
            <div class="ce-field-label">Question</div>
            <textarea class="ce-textarea" id="ceQ_${card.id}" rows="3">${escHtml(card.question || '')}</textarea>
          </div>
          <div>
            <div class="ce-field-label">Options (format: A. text [CORRECT] to mark answer)</div>
            <textarea class="ce-textarea" id="ceA_${card.id}" rows="5">${escHtml(opts)}</textarea>
          </div>
          <div>
            <div class="ce-field-label">Explanation (optional)</div>
            <textarea class="ce-textarea" id="ceE_${card.id}" rows="2">${escHtml(card.explanation || '')}</textarea>
          </div>
          <div class="ce-save-row">
            <button class="ce-btn ce-btn-cancel-edit">Cancel</button>
            <button class="ce-btn primary ce-btn-save-edit"><i class="bi bi-check-lg me-1"></i>Save</button>
          </div>
        </div>`;
    }

    return '';
  }

  // ── Toggle edit form ───────────────────────
  function toggleEdit(id) {
    editingId = editingId === id ? null : id;
    renderList();
    if (editingId) {
      // Scroll edited card into view
      setTimeout(() => {
        document.querySelector(`.ce-card-item[data-id="${id}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  // ── Save edits for one card ────────────────
  function saveCard(id, item) {
    const idx = cards.findIndex(c => c.id == id);
    if (idx === -1) return;
    const card = cards[idx];

    if (cardType === 'flashcard') {
      const q = document.getElementById(`ceQ_${id}`)?.value.trim();
      const a = document.getElementById(`ceA_${id}`)?.value.trim();
      const d = document.getElementById(`ceD_${id}`)?.value;
      if (!q || !a) { shake(item); return; }
      card.question   = q;
      card.answer     = a;
      card.difficulty = d || 'medium';
    } else if (cardType === 'summary') {
      const t  = document.getElementById(`ceQ_${id}`)?.value.trim();
      const kp = document.getElementById(`ceA_${id}`)?.value.trim().split('\n').filter(Boolean);
      const s  = document.getElementById(`ceS_${id}`)?.value.trim();
      if (!t) { shake(item); return; }
      card.title     = t;
      card.keyPoints = kp;
      card.summary   = s;
    } else if (cardType === 'quiz') {
      const q    = document.getElementById(`ceQ_${id}`)?.value.trim();
      const raw  = document.getElementById(`ceA_${id}`)?.value.trim();
      const expl = document.getElementById(`ceE_${id}`)?.value.trim();
      if (!q) { shake(item); return; }
      card.question    = q;
      card.explanation = expl;
      card.options     = parseQuizOptions(raw);
    }

    delete card._new;
    editingId = null;
    renderList();
    updateCount();
    flashSaved(id);
  }

  // ── Parse quiz options from text ───────────
  function parseQuizOptions(raw) {
    const lines = raw.split('\n').filter(Boolean);
    return lines.map((line, i) => {
      const isCorrect = line.includes('[CORRECT]');
      const cleaned   = line.replace('[CORRECT]', '').trim();
      const match     = cleaned.match(/^([A-Za-z])\.\s*(.+)/);
      return {
        label:     match ? match[1].toUpperCase() : String.fromCharCode(65+i),
        text:      match ? match[2].trim() : cleaned,
        isCorrect,
      };
    });
  }

  // ── Add new card ───────────────────────────
  function addCard() {
    const id = `temp_${nextTempId++}`;
    let newCard;

    if (cardType === 'flashcard') {
      newCard = { id, question: '', answer: '', difficulty: 'medium', _new: true };
    } else if (cardType === 'summary') {
      newCard = { id, title: '', keyPoints: [], summary: '', _new: true };
    } else {
      newCard = { id, question: '', options: [
        { label:'A', text:'', isCorrect:true },
        { label:'B', text:'', isCorrect:false },
        { label:'C', text:'', isCorrect:false },
        { label:'D', text:'', isCorrect:false },
      ], explanation: '', _new: true };
    }

    cards.unshift(newCard);
    editingId = id;
    searchQuery = '';
    document.getElementById('ceSearch').value = '';
    renderList();
    updateCount();

    // Scroll to top + focus first field
    document.getElementById('ceList').scrollTop = 0;
    setTimeout(() => {
      document.querySelector('.ce-card-item.new-card .ce-textarea')?.focus();
    }, 80);
  }

  // ── Duplicate card ─────────────────────────
  function duplicateCard(id) {
    const idx = cards.findIndex(c => c.id == id);
    if (idx === -1) return;
    const copy = { ...JSON.parse(JSON.stringify(cards[idx])), id: `temp_${nextTempId++}`, _new: true };
    cards.splice(idx + 1, 0, copy);
    renderList();
    updateCount();
  }

  // ── Delete card ────────────────────────────
  function deleteCard(id, itemEl) {
    if (cards.length <= 1) {
      shake(itemEl);
      showToast('You must have at least 1 card.', 'warning');
      return;
    }
    itemEl.classList.add('deleting');
    setTimeout(() => {
      cards = cards.filter(c => c.id != id);
      if (editingId === id) editingId = null;
      renderList();
      updateCount();
    }, 280);
  }

  // ── Apply changes + save to session ────────
  function applyChanges() {
    // Validate — no empty cards
    const empty = cards.filter(c => {
      if (cardType === 'flashcard') return !c.question?.trim() || !c.answer?.trim();
      if (cardType === 'summary')   return !c.title?.trim();
      if (cardType === 'quiz')      return !c.question?.trim();
      return false;
    });

    if (empty.length) {
      showToast(`${empty.length} card${empty.length>1?'s are':' is'} empty — please fill them in or delete them.`, 'warning');
      editingId = empty[0].id;
      renderList();
      setTimeout(() => {
        document.querySelector('.ce-card-item.editing')?.scrollIntoView({ behavior:'smooth', block:'nearest' });
      }, 50);
      return;
    }

    // Clean up temp flags
    const clean = cards.map(({ _new, ...c }) => c);

    // Update localStorage session
    const raw = localStorage.getItem('bd_session');
    if (raw) {
      const session = JSON.parse(raw);
      session.cards     = clean;
      session.cardCount = clean.length;
      session.editedAt  = Date.now();
      localStorage.setItem('bd_session', JSON.stringify(session));
    }

    close();
    if (onApply) onApply(clean);

    showToast(`${clean.length} cards saved!`, 'success');
  }

  // ── Helpers ────────────────────────────────
  function getPreview(card) {
    if (cardType === 'flashcard') return card.question || '(empty)';
    if (cardType === 'summary')   return card.title || '(empty)';
    if (cardType === 'quiz')      return card.question || '(empty)';
    return '(unknown type)';
  }

  function updateCount() {
    const el = document.getElementById('ceCount');
    if (el) el.textContent = `${cards.length} card${cards.length!==1?'s':''}`;
  }

  function updateFooterNote() {
    const el = document.getElementById('ceFooterNote');
    if (!el) return;
    const isLoggedIn = typeof BrainDeckAuth !== 'undefined' && BrainDeckAuth.getToken();
    el.textContent = isLoggedIn
      ? 'Changes saved to session — re-save deck to persist'
      : 'Log in to permanently save edited decks';
  }

  function escHtml(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function shake(el) {
    el?.classList.add('ce-shake');
    setTimeout(() => el?.classList.remove('ce-shake'), 500);
  }

  function flashSaved(id) {
    const item = document.querySelector(`.ce-card-item[data-id="${id}"]`);
    if (!item) return;
    item.style.borderColor = 'rgba(52,211,153,0.6)';
    setTimeout(() => { item.style.borderColor = ''; }, 800);
  }

  function showToast(msg, type='info') {
    const colors = { success:'var(--success)', warning:'var(--warning)', danger:'var(--danger)', info:'var(--primary)' };
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;top:1rem;left:50%;transform:translateX(-50%);
      background:var(--surface);border-radius:var(--radius);box-shadow:var(--neu-shadow);
      padding:.6rem 1rem;font-size:.84rem;font-weight:500;color:var(--text);
      z-index:1300;display:flex;align-items:center;gap:.5rem;
      border-left:3px solid ${colors[type]};max-width:360px;width:calc(100% - 2rem);
      animation:ceToastIn .25s ease`;
    t.innerHTML = `<style>@keyframes ceToastIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>${msg}`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.transition='opacity .3s'; t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 3000);
  }

  // ── Inject trigger button into study pages ─
  function injectTriggerBtn(callback) {
    if (document.getElementById('ceOpenBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'ceOpenBtn';
    btn.className = 'ce-trigger-btn';
    btn.innerHTML = '<i class="bi bi-pencil-square"></i><span>Edit cards</span>';
    btn.title = 'Open card editor';

    // Put it in the topbar-left or near the progress bar
    const topbarLeft = document.querySelector('.bd-topbar-left');
    if (topbarLeft) {
      topbarLeft.appendChild(btn);
    } else {
      // Fallback — float bottom-left
      btn.style.cssText += ';position:fixed;bottom:5rem;left:1rem;z-index:500';
      document.body.appendChild(btn);
    }

    btn.addEventListener('click', callback);
  }

  return { open, close, injectTriggerBtn };
})();
