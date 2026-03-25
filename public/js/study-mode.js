// public/js/study-mode.js — Learn / Test / Timed mode selector
'use strict';

const StudyMode = (() => {
  // ── Mode definitions ────────────────────────
  const MODES = {
    learn: {
      id:    'learn',
      icon:  'bi-lightbulb-fill',
      label: 'Learn',
      color: 'var(--success)',
      colorLight: 'rgba(52,211,153,0.12)',
      colorBorder: 'rgba(52,211,153,0.3)',
      desc:  'Hints & guided answers',
      tip:   'First letter of the answer shown. Auto-advances after you rate.',
    },
    standard: {
      id:    'standard',
      icon:  'bi-card-text',
      label: 'Standard',
      color: 'var(--primary)',
      colorLight: 'rgba(108,99,255,0.12)',
      colorBorder: 'rgba(108,99,255,0.25)',
      desc:  'Classic flip cards',
      tip:   'Flip to reveal answer, then rate yourself.',
    },
    test: {
      id:    'test',
      icon:  'bi-shield-lock-fill',
      label: 'Test',
      color: 'var(--danger)',
      colorLight: 'rgba(248,113,113,0.1)',
      colorBorder: 'rgba(248,113,113,0.3)',
      desc:  'No hints, strict self-test',
      tip:   'No hints. You must flip yourself. Rating buttons locked until flipped.',
    },
    timed: {
      id:    'timed',
      icon:  'bi-stopwatch-fill',
      label: 'Timed',
      color: 'var(--warning)',
      colorLight: 'rgba(251,191,36,0.1)',
      colorBorder: 'rgba(251,191,36,0.3)',
      desc:  '10s per card',
      tip:   'Answer before the timer runs out! Auto-marks as Review if time expires.',
    },
  };

  const STORAGE_KEY = 'bd_study_mode';
  let currentMode   = localStorage.getItem(STORAGE_KEY) || 'standard';
  let timerInterval = null;
  let timerSeconds  = 0;
  let onModeChange  = null; // callback from flashcard.js

  // ── Public getter ───────────────────────────
  function getMode() { return currentMode; }
  function getModeConfig() { return MODES[currentMode] || MODES.standard; }

  // ── Inject selector into topbar ─────────────
  function injectSelector() {
    if (document.getElementById('studyModeSelector')) return;

    const topbarLeft = document.querySelector('.bd-topbar-left');
    if (!topbarLeft) return;

    const wrap = document.createElement('div');
    wrap.id = 'studyModeSelector';
    wrap.style.cssText = 'display:flex;align-items:center;gap:.35rem;margin-left:.5rem';

    wrap.innerHTML = `
      <div class="dropdown">
        <button class="btn-neu d-flex align-items-center gap-1 px-2 py-1 rounded-3"
                id="studyModeBtn"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                style="font-size:.78rem;font-weight:700;border:none;min-width:110px;justify-content:center">
          <i class="bi bi-card-text" id="studyModeIcon" style="font-size:.85rem"></i>
          <span id="studyModeLabel">Standard</span>
          <i class="bi bi-chevron-down" style="font-size:.6rem;opacity:.6;margin-left:1px"></i>
        </button>
        <ul class="dropdown-menu rounded-3 border-0 mt-1 p-1"
            id="studyModeMenu"
            style="background:var(--surface);box-shadow:var(--neu-shadow);min-width:210px">
          ${Object.values(MODES).map(m => `
            <li>
              <button class="dropdown-item rounded-2 d-flex align-items-center gap-2 py-2 px-2"
                      data-mode="${m.id}"
                      style="font-size:.82rem;color:var(--text)">
                <div style="width:28px;height:28px;border-radius:8px;background:${m.colorLight};
                            border:.5px solid ${m.colorBorder};display:flex;align-items:center;
                            justify-content:center;flex-shrink:0">
                  <i class="bi ${m.icon}" style="font-size:.8rem;color:${m.color}"></i>
                </div>
                <div style="min-width:0">
                  <div style="font-weight:700;line-height:1.2">${m.label}</div>
                  <div style="font-size:.7rem;color:var(--text-muted);line-height:1.2">${m.desc}</div>
                </div>
                <i class="bi bi-check-lg ms-auto check-icon" data-mode="${m.id}"
                   style="color:var(--primary);opacity:0;font-size:.8rem"></i>
              </button>
            </li>`).join('')}
        </ul>
      </div>`;

    topbarLeft.appendChild(wrap);

    // Wire dropdown clicks
    wrap.querySelectorAll('[data-mode]').forEach(btn => {
      if (!btn.dataset.mode || btn.tagName !== 'BUTTON') return;
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    updateSelectorUI();
  }

  // ── Set mode ────────────────────────────────
  function setMode(modeId) {
    if (!MODES[modeId]) return;
    currentMode = modeId;
    localStorage.setItem(STORAGE_KEY, modeId);
    updateSelectorUI();
    showModeToast(MODES[modeId]);
    // Apply body class for CSS mode-specific styles
    document.body.classList.remove('mode-learn','mode-standard','mode-test','mode-timed');
    document.body.classList.add('mode-' + modeId);
    if (onModeChange) onModeChange(modeId);
  }

  // ── Update selector appearance ───────────────
  function updateSelectorUI() {
    const m    = MODES[currentMode] || MODES.standard;
    const btn  = document.getElementById('studyModeBtn');
    const icon = document.getElementById('studyModeIcon');
    const lbl  = document.getElementById('studyModeLabel');
    if (!btn) return;

    btn.style.color       = m.color;
    btn.style.borderColor = m.colorBorder;
    if (icon) { icon.className = `bi ${m.icon}`; icon.style.fontSize = '.85rem'; }
    if (lbl)  lbl.textContent  = m.label;

    // Check mark on active
    document.querySelectorAll('.check-icon').forEach(el => {
      el.style.opacity = el.dataset.mode === currentMode ? '1' : '0';
    });
  }

  // ── Toast notification ──────────────────────
  function showModeToast(mode) {
    const existing = document.getElementById('studyModeToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'studyModeToast';
    toast.style.cssText = `
      position:fixed;top:4.5rem;left:50%;transform:translateX(-50%);
      background:var(--surface);border-radius:var(--radius-lg);
      box-shadow:var(--neu-shadow);
      padding:.65rem 1.1rem;z-index:9990;
      display:flex;align-items:center;gap:.65rem;
      border:.5px solid ${mode.colorBorder};
      max-width:320px;width:calc(100% - 2rem);
      animation:modeToastIn .3s cubic-bezier(.175,.885,.32,1.275);
    `;
    toast.innerHTML = `
      <style>
        @keyframes modeToastIn {
          from { opacity:0; transform:translateX(-50%) translateY(-12px) scale(.95); }
          to   { opacity:1; transform:translateX(-50%) translateY(0)      scale(1);   }
        }
      </style>
      <div style="width:32px;height:32px;border-radius:9px;background:${mode.colorLight};
                  display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="bi ${mode.icon}" style="color:${mode.color}"></i>
      </div>
      <div style="min-width:0">
        <div style="font-size:.84rem;font-weight:700;color:var(--text)">${mode.label} mode</div>
        <div style="font-size:.72rem;color:var(--text-muted);line-height:1.3">${mode.tip}</div>
      </div>`;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity .3s, transform .3s';
      toast.style.opacity    = '0';
      toast.style.transform  = 'translateX(-50%) translateY(-8px)';
      setTimeout(() => toast.remove(), 350);
    }, 2800);
  }

  // ══ MODE BEHAVIOURS (called by flashcard.js) ══

  // ── Learn mode: generate first-letter hint ──
  function getLearnHint(answer) {
    if (!answer) return '';
    const words = answer.trim().split(/\s+/).slice(0, 6);
    return words.map(w => w[0]?.toUpperCase() + '_ ').join(' ').trim()
      + (answer.trim().split(/\s+/).length > 6 ? '…' : '');
  }

  // Full hint (first word of each sentence)
  function getLearnHintFull(answer) {
    if (!answer) return '';
    // Show first 3 words
    const words = answer.trim().split(/\s+/);
    const shown = words.slice(0, 3).join(' ');
    const rest  = words.length > 3 ? ' …' : '';
    return `${shown}${rest}`;
  }

  // ── Apply mode to a rendered card ───────────
  function applyToCard(card, isFlipped) {
    const hintEl    = document.getElementById('studyModeHint');
    const flipHint  = document.querySelector('.bd-flip-hint');
    const gotBtn    = document.getElementById('gotItBtn');
    const revBtn    = document.getElementById('needReviewBtn');

    switch (currentMode) {

      case 'learn':
        // Show answer hint on front face
        if (hintEl && !isFlipped) {
          hintEl.style.display = 'block';
          hintEl.textContent   = 'Hint: ' + getLearnHint(card.answer);
        } else if (hintEl) {
          hintEl.style.display = 'none';
        }
        // Flip hint text
        if (flipHint) flipHint.innerHTML = '<i class="bi bi-lightbulb me-1"></i>click to reveal';
        break;

      case 'standard':
        if (hintEl) hintEl.style.display = 'none';
        if (flipHint) flipHint.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>click to reveal';
        break;

      case 'test':
        // No hints ever — hide hint element
        if (hintEl) hintEl.style.display = 'none';
        // Change flip hint to something more strict
        if (flipHint) flipHint.innerHTML = '<i class="bi bi-shield-lock me-1"></i>flip to answer';
        // Keep rating buttons disabled until flipped (handled by flip logic)
        break;

      case 'timed':
        if (hintEl) hintEl.style.display = 'none';
        if (flipHint) flipHint.innerHTML = '<i class="bi bi-stopwatch me-1"></i>answer quickly!';
        break;
    }
  }

  // ── Timer logic (timed mode) ────────────────
  function startTimer(onExpire) {
    stopTimer();
    if (currentMode !== 'timed') return;

    timerSeconds = 10;
    updateTimerDisplay(timerSeconds);
    showTimerBar(timerSeconds);

    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerDisplay(timerSeconds);
      updateTimerBar(timerSeconds);

      if (timerSeconds <= 0) {
        stopTimer();
        if (onExpire) onExpire();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    hideTimerBar();
  }

  function updateTimerDisplay(secs) {
    const el = document.getElementById('studyModeTimer');
    if (!el) return;
    el.textContent = secs + 's';
    el.style.color = secs <= 3 ? 'var(--danger)' : secs <= 6 ? 'var(--warning)' : 'var(--text-muted)';
    if (secs <= 3) el.style.fontWeight = '800';
    else el.style.fontWeight = '600';
  }

  function showTimerBar(maxSecs) {
    let bar = document.getElementById('studyModeTimerBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'studyModeTimerBar';
      bar.style.cssText = `
        position:absolute;bottom:0;left:0;height:4px;border-radius:0 0 var(--radius-xl) var(--radius-xl);
        background:var(--warning);transition:width 1s linear, background .5s;
        width:100%;
      `;
      document.getElementById('flipScene')?.appendChild(bar);
    }
    bar.style.display    = 'block';
    bar.style.width      = '100%';
    bar.style.background = 'var(--success)';
    bar.style.transition = 'none';
    // Trigger reflow so transition starts fresh
    bar.offsetWidth;
    bar.style.transition = `width ${maxSecs}s linear, background ${maxSecs * 0.3}s ease ${maxSecs * 0.5}s`;
    setTimeout(() => {
      bar.style.width      = '0%';
      bar.style.background = 'var(--danger)';
    }, 50);
  }

  function updateTimerBar(secs) {
    // Bar animates via CSS — nothing to do here
  }

  function hideTimerBar() {
    const bar = document.getElementById('studyModeTimerBar');
    if (bar) { bar.style.display = 'none'; bar.style.width = '100%'; }
  }

  // ── Inject hint + timer elements into card ──
  function injectCardElements() {
    const front = document.querySelector('.bd-flip-front');
    if (!front) return;

    // Hint element (learn mode)
    if (!document.getElementById('studyModeHint')) {
      const hint = document.createElement('div');
      hint.id = 'studyModeHint';
      hint.style.cssText = `
        position:absolute;bottom:2.8rem;left:1.5rem;right:1.5rem;
        font-size:.75rem;font-weight:600;
        color:rgba(52,211,153,0.8);
        text-align:center;display:none;
        letter-spacing:.02em;
        background:rgba(52,211,153,0.08);
        border-radius:8px;padding:.25rem .5rem;
        border:.5px solid rgba(52,211,153,0.2);
      `;
      front.appendChild(hint);
    }

    // Timer display element (timed mode)
    if (!document.getElementById('studyModeTimer')) {
      const timer = document.createElement('div');
      timer.id = 'studyModeTimer';
      timer.style.cssText = `
        position:absolute;top:1rem;right:1.5rem;
        font-size:.85rem;font-weight:600;
        color:var(--text-muted);
        font-variant-numeric:tabular-nums;
        display:none;
      `;
      front.appendChild(timer);
    }
  }

  // Show/hide timer display
  function setTimerVisible(visible) {
    const el = document.getElementById('studyModeTimer');
    if (el) el.style.display = visible ? 'block' : 'none';
  }

  // ── Register change callback ─────────────────
  function onChange(cb) { onModeChange = cb; }

  // ── Init ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('flipScene')) return;
    injectSelector();
    injectCardElements();
    // Set initial body class
    document.body.classList.add('mode-' + currentMode);
  });

  return {
    getMode, getModeConfig, setMode,
    applyToCard, getLearnHint, getLearnHintFull,
    startTimer, stopTimer, setTimerVisible,
    onChange,
    MODES,
  };
})();
