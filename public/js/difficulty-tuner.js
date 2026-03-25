// public/js/difficulty-tuner.js
// Difficulty tuner slider — injected into the upload page
'use strict';

const DifficultyTuner = (() => {
  const LEVELS = [
    {
      value:       'easy',
      label:       'Easy',
      emoji:       '🌱',
      color:       '#34d399',
      colorLight:  'rgba(52,211,153,0.12)',
      colorBorder: 'rgba(52,211,153,0.35)',
      desc:        'Definitions, key terms, basic facts',
      sub:         'Great for first-time review or unfamiliar topics',
      flashcard:   '8–12 cards · recall-focused',
      summary:     '4–8 cards · broad overviews',
      quiz:        '8–12 Qs · straightforward recall',
    },
    {
      value:       'medium',
      label:       'Medium',
      emoji:       '📚',
      color:       '#6c63ff',
      colorLight:  'rgba(108,99,255,0.12)',
      colorBorder: 'rgba(108,99,255,0.35)',
      desc:        'Understanding, application, comparison',
      sub:         'Balanced — good for most study sessions',
      flashcard:   '12–18 cards · conceptual',
      summary:     '6–12 cards · how & why',
      quiz:        '12–18 Qs · requires understanding',
    },
    {
      value:       'hard',
      label:       'Hard',
      emoji:       '🔥',
      color:       '#f59e0b',
      colorLight:  'rgba(245,158,11,0.12)',
      colorBorder: 'rgba(245,158,11,0.35)',
      desc:        'Analysis, synthesis, edge cases',
      sub:         'Deep mastery — for review before exams',
      flashcard:   '15–22 cards · analytical',
      summary:     '8–15 cards · mechanisms & tradeoffs',
      quiz:        '15–22 Qs · scenario-based',
    },
    {
      value:       'expert',
      label:       'Expert',
      emoji:       '⚡',
      color:       '#ef4444',
      colorLight:  'rgba(239,68,68,0.1)',
      colorBorder: 'rgba(239,68,68,0.35)',
      desc:        'Synthesis, critique, research-grade depth',
      sub:         'Graduate / professional level mastery',
      flashcard:   '18–25 cards · evaluate & synthesize',
      summary:     '10–15 cards · expert depth',
      quiz:        '18–25 Qs · complex case analysis',
    },
  ];

  let current = 1; // default: medium (index 1)
  let container = null;

  // ── Inject the tuner ───────────────────────
  function inject() {
    const cardTypeSection = document.querySelector('.mb-4 .neu-label');
    if (!cardTypeSection || document.getElementById('difficultyTuner')) return;

    container = document.createElement('div');
    container.id = 'difficultyTuner';
    container.className = 'mb-4';
    container.innerHTML = buildHTML();

    // Insert BEFORE the card type selector
    const cardTypeParent = cardTypeSection.closest('.mb-4');
    if (cardTypeParent) {
      cardTypeParent.parentNode.insertBefore(container, cardTypeParent);
    }

    wireEvents();
    updateUI();
  }

  // ── HTML template ──────────────────────────
  function buildHTML() {
    return `
      <label class="neu-label mb-3">
        <i class="bi bi-sliders me-2 text-primary"></i>Difficulty level:
      </label>

      <!-- Track + dots -->
      <div style="position:relative;padding:0 .5rem;margin-bottom:.85rem">

        <!-- Track background -->
        <div id="dtTrack" style="
          height:6px;border-radius:3px;
          background:var(--neu-inset);
          box-shadow:var(--neu-inset);
          position:relative;margin:0 .5rem;
        ">
          <!-- Active fill -->
          <div id="dtFill" style="
            position:absolute;left:0;top:0;height:100%;border-radius:3px;
            background:var(--grad-primary);width:33.3%;
            transition:width .25s ease, background .25s ease;
          "></div>
        </div>

        <!-- Slider input (invisible, on top) -->
        <input type="range" id="dtSlider"
               min="0" max="3" step="1" value="1"
               style="
                 position:absolute;top:-8px;left:.5rem;right:.5rem;
                 width:calc(100% - 1rem);
                 margin:0;opacity:0;cursor:pointer;height:22px;z-index:2;
               ">

        <!-- Dot markers -->
        <div style="display:flex;justify-content:space-between;margin:0 .5rem;position:relative;top:-10px">
          ${LEVELS.map((l, i) => `
            <div class="dt-dot" data-idx="${i}" style="
              width:16px;height:16px;border-radius:50%;
              background:${i <= 1 ? 'var(--primary)' : 'var(--bg)'};
              border:2px solid ${i <= 1 ? 'var(--primary)' : 'var(--text-light)'};
              cursor:pointer;transition:all .2s ease;
              box-shadow:${i <= 1 ? '0 0 8px rgba(108,99,255,.4)' : 'var(--neu-shadow-sm)'};
              flex-shrink:0;
            "></div>
          `).join('')}
        </div>

        <!-- Labels row -->
        <div style="display:flex;justify-content:space-between;margin:4px .5rem 0;padding:0 2px">
          ${LEVELS.map((l, i) => `
            <div class="dt-label" data-idx="${i}" style="
              font-size:.72rem;font-weight:700;letter-spacing:.03em;
              color:${i === 1 ? 'var(--primary)' : 'var(--text-muted)'};
              cursor:pointer;transition:color .2s;text-align:center;flex:1;
            ">${l.emoji} ${l.label}</div>
          `).join('')}
        </div>
      </div>

      <!-- Info card -->
      <div id="dtInfo" style="
        border-radius:var(--radius);padding:.75rem 1rem;
        transition:all .25s ease;
        border:.5px solid rgba(108,99,255,0.25);
        background:rgba(108,99,255,0.06);
      ">
        <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.35rem">
          <span id="dtInfoEmoji" style="font-size:1.2rem">📚</span>
          <div>
            <div id="dtInfoTitle" style="font-size:.88rem;font-weight:700;color:var(--text)">Medium</div>
            <div id="dtInfoSub" style="font-size:.75rem;color:var(--text-muted)">Balanced — good for most study sessions</div>
          </div>
        </div>
        <div id="dtInfoDetail" style="
          font-size:.76rem;color:var(--text-muted);
          display:flex;flex-wrap:wrap;gap:.4rem .75rem;margin-top:.3rem
        "></div>
      </div>`;
  }

  // ── Wire events ────────────────────────────
  function wireEvents() {
    const slider = document.getElementById('dtSlider');
    slider.addEventListener('input', e => {
      current = parseInt(e.target.value);
      updateUI();
    });

    // Click on dots or labels
    document.querySelectorAll('.dt-dot, .dt-label').forEach(el => {
      el.addEventListener('click', () => {
        current = parseInt(el.dataset.idx);
        document.getElementById('dtSlider').value = current;
        updateUI();
      });
    });
  }

  // ── Update all visual state ────────────────
  function updateUI() {
    const level = LEVELS[current];
    const pct   = (current / 3) * 100;

    // Fill bar
    const fill = document.getElementById('dtFill');
    if (fill) {
      fill.style.width      = pct + '%';
      fill.style.background = `linear-gradient(90deg, #6c63ff, ${level.color})`;
    }

    // Dots
    document.querySelectorAll('.dt-dot').forEach((dot, i) => {
      const active = i <= current;
      dot.style.background   = active ? level.color : 'var(--bg)';
      dot.style.borderColor  = active ? level.color : 'var(--text-light)';
      dot.style.boxShadow    = active ? `0 0 8px ${level.colorBorder}` : 'var(--neu-shadow-sm)';
      dot.style.transform    = i === current ? 'scale(1.3)' : 'scale(1)';
    });

    // Labels
    document.querySelectorAll('.dt-label').forEach((lbl, i) => {
      lbl.style.color      = i === current ? level.color : 'var(--text-muted)';
      lbl.style.fontWeight = i === current ? '800' : '700';
    });

    // Info card
    const info = document.getElementById('dtInfo');
    if (info) {
      info.style.borderColor  = level.colorBorder;
      info.style.background   = level.colorLight;
    }

    const emoji  = document.getElementById('dtInfoEmoji');
    const title  = document.getElementById('dtInfoTitle');
    const sub    = document.getElementById('dtInfoSub');
    const detail = document.getElementById('dtInfoDetail');

    if (emoji)  emoji.textContent = level.emoji;
    if (title)  { title.textContent = level.label; title.style.color = level.color; }
    if (sub)    sub.textContent   = level.sub;
    if (detail) {
      // Show per-card-type count hint based on selected card type
      const cardType = document.querySelector('input[name="cardType"]:checked')?.value || 'flashcard';
      const hints = {
        flashcard: level.flashcard,
        summary:   level.summary,
        quiz:      level.quiz,
      };
      detail.innerHTML = `
        <span style="background:rgba(108,99,255,.12);border-radius:20px;padding:2px 8px">
          <i class="bi bi-info-circle me-1"></i>${hints[cardType] || level.desc}
        </span>
        <span style="color:var(--text-muted)">${level.desc}</span>
      `;
    }
  }

  // ── Public getter ──────────────────────────
  function getValue() {
    return LEVELS[current].value;
  }

  // ── Re-render when card type changes ───────
  function watchCardType() {
    document.querySelectorAll('input[name="cardType"]').forEach(radio => {
      radio.addEventListener('change', () => updateUI());
    });
  }

  // ── Auto-inject on DOMContentLoaded ────────
  document.addEventListener('DOMContentLoaded', () => {
    // Only on index page (has the dropzone)
    if (!document.getElementById('dropZone')) return;
    setTimeout(() => {
      inject();
      watchCardType();
    }, 50);
  });

  return { inject, getValue, LEVELS };
})();
