// public/js/swipe.js — Tinder-style swipe gestures for flashcards
'use strict';

const SwipeGesture = (() => {
  // ── Config ──────────────────────────────────
  const SWIPE_THRESHOLD   = 80;   // px to trigger action
  const THROW_THRESHOLD   = 120;  // px for full throw animation
  const MAX_ROTATION      = 18;   // degrees tilt at full drag
  const VELOCITY_SCALE    = 0.3;
  const RETURN_DURATION   = '0.4s';
  const THROW_DURATION    = '0.35s';

  let scene, card, overlay, hintL, hintR, hintU;
  let startX = 0, startY = 0, currentX = 0, currentY = 0;
  let isDragging = false, isFlipped = false, hasActed = false;
  let onSwipeRight, onSwipeLeft, onSwipeUp;

  // ── Inject swipe overlay elements into card ──
  function injectOverlays() {
    // Green "Got it" overlay
    const got = document.createElement('div');
    got.id = 'swipeOverlayRight';
    got.style.cssText = `
      position:absolute;inset:0;border-radius:var(--radius-xl);
      background:rgba(52,211,153,0.18);border:3px solid rgba(52,211,153,0.6);
      display:flex;align-items:center;justify-content:center;
      opacity:0;pointer-events:none;z-index:10;transition:opacity .1s;
    `;
    got.innerHTML = `<div style="transform:rotate(-15deg);text-align:center">
      <i class="bi bi-check-circle-fill" style="font-size:3rem;color:#34d399;display:block"></i>
      <span style="color:#34d399;font-weight:800;font-size:1.2rem;letter-spacing:.05em">GOT IT</span>
    </div>`;

    // Red "Review" overlay
    const rev = document.createElement('div');
    rev.id = 'swipeOverlayLeft';
    rev.style.cssText = `
      position:absolute;inset:0;border-radius:var(--radius-xl);
      background:rgba(248,113,113,0.18);border:3px solid rgba(248,113,113,0.6);
      display:flex;align-items:center;justify-content:center;
      opacity:0;pointer-events:none;z-index:10;transition:opacity .1s;
    `;
    rev.innerHTML = `<div style="transform:rotate(15deg);text-align:center">
      <i class="bi bi-arrow-repeat" style="font-size:3rem;color:#f87171;display:block"></i>
      <span style="color:#f87171;font-weight:800;font-size:1.2rem;letter-spacing:.05em">REVIEW</span>
    </div>`;

    // Blue "Flip" overlay (swipe up)
    const flip = document.createElement('div');
    flip.id = 'swipeOverlayUp';
    flip.style.cssText = `
      position:absolute;inset:0;border-radius:var(--radius-xl);
      background:rgba(108,99,255,0.15);border:3px solid rgba(108,99,255,0.5);
      display:flex;align-items:center;justify-content:center;
      opacity:0;pointer-events:none;z-index:10;transition:opacity .1s;
    `;
    flip.innerHTML = `<div style="text-align:center">
      <i class="bi bi-arrow-repeat" style="font-size:3rem;color:#6c63ff;display:block"></i>
      <span style="color:#6c63ff;font-weight:800;font-size:1.2rem;letter-spacing:.05em">FLIP</span>
    </div>`;

    // Position card relatively so overlays work
    const cardInner = document.getElementById('flipScene');
    if (cardInner) {
      cardInner.style.position = 'relative';
      cardInner.appendChild(got);
      cardInner.appendChild(rev);
      cardInner.appendChild(flip);
    }
  }

  // ── Inject swipe hint (arrows shown on first load) ──
  function injectSwipeHint() {
    if (localStorage.getItem('bd_swipe_hint_seen')) return;

    const hint = document.createElement('div');
    hint.id = 'swipeHint';
    hint.style.cssText = `
      position:absolute;inset:0;border-radius:var(--radius-xl);
      display:flex;align-items:center;justify-content:space-between;
      padding:0 1.5rem;pointer-events:none;z-index:5;
      animation:hintFade 3s ease forwards;
    `;
    hint.innerHTML = `
      <style>
        @keyframes hintFade {
          0%   { opacity:0; }
          20%  { opacity:1; }
          70%  { opacity:1; }
          100% { opacity:0; }
        }
        @keyframes hintBounceL { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-8px)} }
        @keyframes hintBounceR { 0%,100%{transform:translateX(0)} 50%{transform:translateX(8px)} }
        .hint-l { animation:hintBounceL 1s ease-in-out infinite; }
        .hint-r { animation:hintBounceR 1s ease-in-out infinite; }
      </style>
      <div class="hint-l" style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <i class="bi bi-arrow-left-circle-fill" style="font-size:1.6rem;color:rgba(248,113,113,0.6)"></i>
        <span style="font-size:.68rem;font-weight:700;color:rgba(248,113,113,0.7);letter-spacing:.04em">REVIEW</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;opacity:.45">
        <i class="bi bi-arrow-up-circle-fill" style="font-size:1.2rem;color:rgba(108,99,255,0.6)"></i>
        <span style="font-size:.6rem;font-weight:600;color:rgba(108,99,255,0.6)">FLIP</span>
      </div>
      <div class="hint-r" style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <i class="bi bi-arrow-right-circle-fill" style="font-size:1.6rem;color:rgba(52,211,153,0.6)"></i>
        <span style="font-size:.68rem;font-weight:700;color:rgba(52,211,153,0.7);letter-spacing:.04em">GOT IT</span>
      </div>`;

    const sceneEl = document.getElementById('flipScene');
    if (sceneEl) {
      sceneEl.appendChild(hint);
      setTimeout(() => {
        hint.remove();
        localStorage.setItem('bd_swipe_hint_seen', '1');
      }, 3200);
    }
  }

  // ── Pointer event handlers ──────────────────
  function onPointerDown(e) {
    if (e.target.closest('button') || e.target.closest('a')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    isDragging = true;
    hasActed   = false;
    startX     = e.clientX;
    startY     = e.clientY;
    currentX   = 0;
    currentY   = 0;

    scene.setPointerCapture(e.pointerId);
    card.style.transition = 'none';
    card.style.willChange = 'transform';
  }

  function onPointerMove(e) {
    if (!isDragging) return;

    currentX = e.clientX - startX;
    currentY = e.clientY - startY;

    const absDx = Math.abs(currentX);
    const absDy = Math.abs(currentY);

    // Determine dominant direction
    const isHorizontal = absDx > absDy;

    // Tilt based on drag direction and distance
    const rotation = isHorizontal
      ? (currentX / THROW_THRESHOLD) * MAX_ROTATION
      : 0;

    // Apply transform
    card.style.transform = `translate(${currentX * 0.9}px, ${currentY * 0.5}px) rotate(${rotation}deg)`;

    // Update overlays
    const rightO = document.getElementById('swipeOverlayRight');
    const leftO  = document.getElementById('swipeOverlayLeft');
    const upO    = document.getElementById('swipeOverlayUp');

    if (isHorizontal) {
      const pct = Math.min(Math.abs(currentX) / THROW_THRESHOLD, 1);
      if (currentX > 0) {
        if (rightO) rightO.style.opacity = pct;
        if (leftO)  leftO.style.opacity  = 0;
      } else {
        if (leftO)  leftO.style.opacity  = pct;
        if (rightO) rightO.style.opacity = 0;
      }
      if (upO) upO.style.opacity = 0;
    } else if (currentY < -30) {
      const pct = Math.min(Math.abs(currentY) / 100, 1);
      if (upO)    upO.style.opacity    = pct;
      if (rightO) rightO.style.opacity = 0;
      if (leftO)  leftO.style.opacity  = 0;
    } else {
      if (rightO) rightO.style.opacity = 0;
      if (leftO)  leftO.style.opacity  = 0;
      if (upO)    upO.style.opacity    = 0;
    }
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    card.style.willChange = '';
    hideAllOverlays();

    const absDx = Math.abs(currentX);
    const absDy = Math.abs(currentY);
    const vel   = Math.sqrt(currentX * currentX + currentY * currentY);

    // Check swipe direction
    if (absDx > absDy && absDx > SWIPE_THRESHOLD) {
      if (currentX > 0) {
        throwCard('right');
      } else {
        throwCard('left');
      }
    } else if (currentY < -SWIPE_THRESHOLD && absDy > absDx) {
      throwCard('up');
    } else {
      // Not enough — spring back
      returnCard();
    }
  }

  // ── Throw card off screen ───────────────────
  function throwCard(dir) {
    const vx = dir === 'right' ? 600 : dir === 'left' ? -600 : 0;
    const vy = dir === 'up'    ? -500 : 40;
    const rot= dir === 'right' ? 25   : dir === 'left' ? -25  : 0;

    card.style.transition = `transform ${THROW_DURATION} cubic-bezier(0.4,0,1,1)`;
    card.style.transform  = `translate(${vx}px, ${vy}px) rotate(${rot}deg)`;

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(dir === 'right' ? [40] : [20, 20, 20]);

    // Trigger action after animation
    setTimeout(() => {
      // Reset card visually
      card.style.transition = 'none';
      card.style.transform  = 'translate(0,0) rotate(0deg)';
      // Un-flip
      card.classList.remove('flipped');

      // Call the action
      if (dir === 'right' && onSwipeRight) onSwipeRight();
      if (dir === 'left'  && onSwipeLeft)  onSwipeLeft();
      if (dir === 'up') {
        // Flip the card
        const flipScene = document.getElementById('flipScene');
        flipScene?.click();
      }

      // Animate card entrance from opposite side
      const fromX = dir === 'right' ? -200 : dir === 'left' ? 200 : 0;
      const fromY = dir === 'up' ? 80 : 0;
      card.style.transform = `translate(${fromX}px, ${fromY}px)`;
      card.style.opacity   = '0';

      requestAnimationFrame(() => {
        card.style.transition = `transform 0.3s cubic-bezier(0.2,0,0.2,1), opacity 0.25s ease`;
        card.style.transform  = 'translate(0,0) rotate(0deg)';
        card.style.opacity    = '1';
      });

    }, parseInt(THROW_DURATION) * 1000 + 50);
  }

  // ── Spring back to center ───────────────────
  function returnCard() {
    card.style.transition = `transform ${RETURN_DURATION} cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
    card.style.transform  = 'translate(0,0) rotate(0deg)';
  }

  function hideAllOverlays() {
    ['swipeOverlayRight','swipeOverlayLeft','swipeOverlayUp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.opacity = '0';
    });
  }

  // ── Touch support (Safari iOS) ──────────────
  let touchStartX = 0, touchStartY = 0;

  function onTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      e.preventDefault(); // prevent scroll during horizontal swipe
    }
  }

  // ── Init ────────────────────────────────────
  function init({ onRight, onLeft, onUp } = {}) {
    scene = document.getElementById('flipScene');
    card  = document.getElementById('flipCard');
    if (!scene || !card) return;

    onSwipeRight = onRight;
    onSwipeLeft  = onLeft;
    onSwipeUp    = onUp;

    injectOverlays();

    // Use pointer events for unified mouse + touch + stylus
    scene.addEventListener('pointerdown', onPointerDown);
    scene.addEventListener('pointermove', onPointerMove);
    scene.addEventListener('pointerup',   onPointerUp);
    scene.addEventListener('pointercancel', () => { isDragging = false; returnCard(); hideAllOverlays(); });

    // Touch-specific for iOS scroll prevention
    scene.addEventListener('touchstart',  onTouchStart,  { passive: true });
    scene.addEventListener('touchmove',   onTouchMove,   { passive: false });

    // Show hint on first visit after short delay
    setTimeout(injectSwipeHint, 800);

    console.log('[Swipe] Gestures ready');
  }

  return { init };
})();
