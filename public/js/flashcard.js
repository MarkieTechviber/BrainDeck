// public/js/flashcard.js
'use strict';

(function () {
  const flipScene    = document.getElementById('flipScene');
  const flipCard     = document.getElementById('flipCard');
  const cardQuestion = document.getElementById('cardQuestion');
  const cardAnswer   = document.getElementById('cardAnswer');
  const progressBar  = document.getElementById('progressBar');
  const currentNum   = document.getElementById('currentCardNum');
  const totalCards   = document.getElementById('totalCards');
  const diffBadge    = document.getElementById('difficultyBadge');
  const prevBtn      = document.getElementById('prevBtn');
  const nextBtn      = document.getElementById('nextBtn');
  const gotItBtn     = document.getElementById('gotItBtn');
  const needRevBtn   = document.getElementById('needReviewBtn');
  const sessionComp  = document.getElementById('sessionComplete');
  const restartBtn   = document.getElementById('restartBtn');
  const reviewWeak   = document.getElementById('reviewWeakBtn');
  const compTotal    = document.getElementById('completeTotal');
  const compGot      = document.getElementById('completeGotIt');
  const compNeed     = document.getElementById('completeNeedReview');

  let cards = [], current = 0, isFlipped = false, ratings = {};
  let chapterGroups = null;

  const DIFF_STYLES = {
    easy:   'bd-diff-easy',
    medium: 'bd-diff-medium',
    hard:   'bd-diff-hard',
  };

  // ── Get current mode (safe — StudyMode may not be loaded) ──
  function mode() {
    return typeof StudyMode !== 'undefined' ? StudyMode.getMode() : 'standard';
  }

  // ── Render card ─────────────────────────────
  function renderCard(idx) {
    const card = cards[idx]; if (!card) return;
    isFlipped = false;
    flipCard.classList.remove('flipped');
    cardQuestion.textContent = card.question;
    cardAnswer.textContent   = card.answer;

    // Difficulty badge
    diffBadge.className   = 'px-3 py-1 rounded-pill bd-font-xs fw-600 ' + (DIFF_STYLES[card.difficulty] || DIFF_STYLES.medium);
    diffBadge.textContent = card.difficulty ? card.difficulty.charAt(0).toUpperCase() + card.difficulty.slice(1) : 'Medium';

    currentNum.textContent  = idx + 1;
    progressBar.style.width = Math.round(((idx + 1) / cards.length) * 100) + '%';

    prevBtn.disabled   = idx === 0;

    // Update chapter nav
    if (typeof Chapters !== 'undefined' && chapterGroups) {
      Chapters.updateActive(idx, chapterGroups, ratings);
    }
    nextBtn.innerHTML  = idx === cards.length - 1
      ? '<i class="bi bi-flag-fill me-1"></i>Finish'
      : 'Next<i class="bi bi-chevron-right ms-1"></i>';

    // Mode-specific rating button state
    const m = mode();
    if (m === 'learn') {
      // Learn: rating buttons enabled immediately — hints guide the user
      gotItBtn.disabled  = false;
      needRevBtn.disabled= false;
    } else {
      // Standard / Test / Timed: must flip first
      gotItBtn.disabled  = true;
      needRevBtn.disabled= true;
    }

    // Apply mode behaviour (hints, timer, etc.)
    if (typeof StudyMode !== 'undefined') {
      StudyMode.applyToCard(card, false);

      if (m === 'timed') {
        StudyMode.setTimerVisible(true);
        StudyMode.startTimer(() => {
          // Timer expired — auto-mark as review and advance
          ratings[card.id] = 'review';
          showTimerExpired();
          setTimeout(() => {
            if (current < cards.length - 1) { current++; renderCard(current); }
            else showComplete();
          }, 900);
        });
      } else {
        StudyMode.setTimerVisible(false);
        StudyMode.stopTimer();
      }
    }

    // TTS — speak question if enabled
    if (typeof TTS !== 'undefined' && TTS.isEnabled()) TTS.speakQuestion();
  }

  // ── Flip card ───────────────────────────────
  function flip() {
    if (isFlipped) return;
    isFlipped = true;
    flipCard.classList.add('flipped');

    const m = mode();

    // Stop timer if timed mode
    if (m === 'timed' && typeof StudyMode !== 'undefined') {
      StudyMode.stopTimer();
      StudyMode.setTimerVisible(false);
    }

    // Test mode: require self-evaluation before enabling buttons
    if (m === 'test') {
      // Short delay — user must see answer first
      setTimeout(() => {
        gotItBtn.disabled  = false;
        needRevBtn.disabled= false;
        // Pulse the buttons to draw attention
        gotItBtn.style.animation  = 'pulse .4s ease';
        needRevBtn.style.animation= 'pulse .4s ease';
        setTimeout(() => {
          gotItBtn.style.animation  = '';
          needRevBtn.style.animation= '';
        }, 450);
      }, 800);
    } else if (m !== 'learn') {
      // Standard / timed: enable immediately on flip
      gotItBtn.disabled  = false;
      needRevBtn.disabled= false;
    }

    // TTS answer
    if (typeof TTS !== 'undefined' && TTS.isEnabled()) {
      setTimeout(() => TTS.speakAnswer(), 100);
    }
  }

  // ── Timer expired visual feedback ───────────
  function showTimerExpired() {
    const scene = document.getElementById('flipScene');
    if (!scene) return;
    scene.style.outline = '3px solid var(--danger)';
    scene.style.outlineOffset = '4px';
    setTimeout(() => {
      scene.style.outline      = '';
      scene.style.outlineOffset= '';
    }, 800);
    if (typeof Confetti === 'undefined') return; // no confetti on expire
  }

  // ── Show complete ───────────────────────────
  function showComplete() {
    if (typeof StudyMode !== 'undefined') StudyMode.stopTimer();
    document.querySelector('main').classList.add('d-none');
    sessionComp.classList.remove('d-none');
    const got  = Object.values(ratings).filter(r => r === 'got').length;
    const need = Object.values(ratings).filter(r => r === 'review').length;
    compTotal.textContent = cards.length;
    compGot.textContent   = got;
    compNeed.textContent  = need;

    // Confetti based on performance
    if (typeof Confetti !== 'undefined') {
      const pct = cards.length > 0 ? (got / cards.length) : 0;
      setTimeout(() => {
        if (pct === 1)       Confetti.perfectScore();
        else if (pct >= 0.8) Confetti.goodScore();
        else                 Confetti.deckComplete();
      }, 300);
    }

    // Update completion message + score bar
    const pct = cards.length > 0 ? Math.round((got / cards.length) * 100) : 0;
    const msg = pct === 100
      ? '🏆 Perfect session! You knew every card!'
      : pct >= 80 ? `🌟 Great work! You got ${pct}% right.`
      : `✅ Session complete! Review the cards you missed.`;
    const msgEl = document.getElementById('sessionCompleteMsg');
    if (msgEl) msgEl.textContent = msg;

    const bar = document.getElementById('completeScoreBar');
    if (bar) {
      requestAnimationFrame(() => { bar.style.width = pct + '%'; });
      bar.style.background = pct === 100
        ? 'linear-gradient(90deg,#34d399,#059669)'
        : pct >= 80 ? 'linear-gradient(90deg,#6c63ff,#38bdf8)'
        : pct >= 60 ? 'linear-gradient(90deg,#fbbf24,#f59e0b)'
        : 'linear-gradient(90deg,#f87171,#ef4444)';
    }

    const trophy = document.getElementById('completeTrophy');
    if (trophy) {
      trophy.textContent = pct === 100 ? '🏆' : pct >= 80 ? '🌟' : pct >= 60 ? '✅' : '📚';
      if (pct === 100) setTimeout(() => trophy.classList.add('pulse'), 600);
    }
  }

  // ── Init deck ───────────────────────────────
  function init(list, chapters) {
    cards = list; current = 0; ratings = {};
    totalCards.textContent = cards.length;
    document.querySelector('main').classList.remove('d-none');
    sessionComp.classList.add('d-none');

    // Init chapter navigation
    if (typeof Chapters !== 'undefined' && !chapterGroups) {
      chapterGroups = Chapters.inject(cards, 'flashcard', chapters, (startIdx) => {
        current = startIdx;
        renderCard(current);
      });
    }

    renderCard(0);

    // Show mode toast on first load
    if (typeof StudyMode !== 'undefined') {
      const m = StudyMode.getModeConfig();
      if (m.id !== 'standard') {
        setTimeout(() => StudyMode.setMode(m.id), 400);
      }
    }
  }

  // ── Events ──────────────────────────────────
  flipScene.addEventListener('click',   flip);
  flipScene.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });

  prevBtn.addEventListener('click', () => {
    if (typeof StudyMode !== 'undefined') StudyMode.stopTimer();
    if (current > 0) { current--; renderCard(current); }
  });

  nextBtn.addEventListener('click', () => {
    if (typeof StudyMode !== 'undefined') StudyMode.stopTimer();
    if (current < cards.length - 1) { current++; renderCard(current); }
    else showComplete();
  });

  gotItBtn.addEventListener('click', () => {
    ratings[cards[current].id] = 'got';
    if (typeof StudyMode !== 'undefined') StudyMode.stopTimer();

    // Mini confetti pop
    if (typeof Confetti !== 'undefined') {
      const btn  = document.getElementById('gotItBtn');
      const rect = btn?.getBoundingClientRect();
      if (rect) Confetti.miniPop(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    // Update chapter progress
    if (typeof Chapters !== 'undefined' && chapterGroups) {
      Chapters.updateProgressRings(current, chapterGroups, ratings);
    }

    // Learn mode — auto-advance after brief pause
    const autoAdvance = mode() === 'learn' || mode() === 'timed';
    const delay = autoAdvance ? 450 : 350;

    setTimeout(() => {
      if (current < cards.length - 1) { current++; renderCard(current); }
      else showComplete();
    }, delay);
  });

  needRevBtn.addEventListener('click', () => {
    ratings[cards[current].id] = 'review';
    if (typeof StudyMode !== 'undefined') StudyMode.stopTimer();
    if (typeof Chapters !== 'undefined' && chapterGroups) {
      Chapters.updateProgressRings(current, chapterGroups, ratings);
    }
    setTimeout(() => {
      if (current < cards.length - 1) { current++; renderCard(current); }
      else showComplete();
    }, 350);
  });

  restartBtn.addEventListener('click', () => init(cards));
  reviewWeak.addEventListener('click', () => {
    const weak = cards.filter(c => ratings[c.id] === 'review' || !ratings[c.id]);
    if (!weak.length) { alert('No weak cards — you got them all!'); return; }
    init(weak);
  });

  document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight') nextBtn.click();
    if (e.key === 'ArrowLeft')  prevBtn.click();
    if (e.key === ' ')          { e.preventDefault(); flipScene.click(); }
    if ((e.key === 'g' || e.key === 'G') && !gotItBtn.disabled)   gotItBtn.click();
    if ((e.key === 'r' || e.key === 'R') && !needRevBtn.disabled) needRevBtn.click();
  });

  // ── Listen for mode changes ──────────────────
  if (typeof StudyMode !== 'undefined') {
    StudyMode.onChange(() => renderCard(current));
  }

  // ── Load session ─────────────────────────────
  const raw = localStorage.getItem('bd_session');
  if (!raw) { new bootstrap.Modal(document.getElementById('noSessionModal')).show(); return; }
  const session = JSON.parse(raw);

  if (session.cardType === 'flashcard' && session.cards?.length) {
    init(session.cards, session.chapters || []);
  } else if (session.sessionId?.startsWith('deck_')) {
    // Load from server if session is a saved deck (format: deck_123)
    const deckId = session.sessionId.replace('deck_', '');
    fetch(`/api/decks/${deckId}`, { 
      headers: BrainDeckAuth.getHeaders(), 
      credentials: 'include' 
    })
      .then(res => res.json())
      .then(d => {
        if (d.success && d.data.deck.cards?.length) {
          const deck = d.data.deck;
          session.cards = deck.cards;
          session.chapters = [];
          session.cardCount = deck.cardCount;
          localStorage.setItem('bd_session', JSON.stringify(session));
          init(deck.cards, []);
        } else { 
          new bootstrap.Modal(document.getElementById('noSessionModal')).show(); 
        }
      })
      .catch(() => new bootstrap.Modal(document.getElementById('noSessionModal')).show());
  } else if (session.sessionId) {
    BrainDeckAPI.getCardsForType(session.sessionId, 'flashcard')
      .then(res => {
        if (res.success && res.data.cards.length) {
          session.cards    = res.data.cards;
          session.chapters = res.data.chapters || [];
          session.cardType = 'flashcard';
          localStorage.setItem('bd_session', JSON.stringify(session));
          init(res.data.cards, res.data.chapters || []);
        } else { new bootstrap.Modal(document.getElementById('noSessionModal')).show(); }
      }).catch(() => new bootstrap.Modal(document.getElementById('noSessionModal')).show());
  } else { new bootstrap.Modal(document.getElementById('noSessionModal')).show(); }

})();

// ── Wire feature modules ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const raw = localStorage.getItem('bd_session');
  if (!raw) return;
  const session = JSON.parse(raw);
  const deckId  = session.sessionId || 'default';

  if (typeof Streaks !== 'undefined') Streaks.recordStudy();

  if (typeof DeckExport !== 'undefined' && session.cards?.length) {
    DeckExport.injectBar(session.cards, session.cardType,
      session.fileName?.replace(/\.[^.]+$/, '') || 'My Deck');
  }

  document.getElementById('flipScene')?.addEventListener('click', () => {
    setTimeout(() => { if (typeof TTS !== 'undefined') TTS.speakAnswer(); }, 100);
  });

  const origGotIt = document.getElementById('gotItBtn');
  const origNeed  = document.getElementById('needReviewBtn');
  if (origGotIt && typeof SpacedRep !== 'undefined') {
    origGotIt.addEventListener('click', () => {
      const card = session.cards?.[0];
      if (card) SpacedRep.updateCard(deckId, card.id, 4);
      if (typeof Streaks !== 'undefined') Streaks.recordStudy(1);
    });
    origNeed.addEventListener('click', () => {
      const card = session.cards?.[0];
      if (card) SpacedRep.updateCard(deckId, card.id, 2);
    });
  }

  // Listen for StudyMode changes (re-register after DOM ready)
  if (typeof StudyMode !== 'undefined') {
    StudyMode.injectSelector?.();
  }
});
