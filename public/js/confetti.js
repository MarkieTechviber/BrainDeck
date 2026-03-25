// public/js/confetti.js — BrainDeck canvas confetti engine
'use strict';

const Confetti = (() => {
  // ── Config ──────────────────────────────────
  const COLORS = [
    '#6c63ff','#38bdf8','#34d399','#f472b6',
    '#fbbf24','#f87171','#a78bfa','#60a5fa',
    '#4ade80','#fb923c','#e879f9','#2dd4bf',
  ];

  const SHAPES = ['rect', 'circle', 'triangle', 'star'];

  let canvas, ctx, particles = [], animId = null, running = false;

  // ── Particle class ──────────────────────────
  class Particle {
    constructor(x, y, opts = {}) {
      this.x     = x;
      this.y     = y;
      this.color = opts.color || COLORS[Math.floor(Math.random() * COLORS.length)];
      this.shape = opts.shape || SHAPES[Math.floor(Math.random() * SHAPES.length)];
      this.size  = opts.size  || (Math.random() * 8 + 5);   // 5–13px
      this.mass  = this.size / 10;

      // Velocity — burst outward from origin
      const angle  = opts.angle  !== undefined ? opts.angle  : Math.random() * Math.PI * 2;
      const speed  = opts.speed  !== undefined ? opts.speed  : Math.random() * 12 + 4;
      this.vx      = Math.cos(angle) * speed + (Math.random() - 0.5) * 3;
      this.vy      = Math.sin(angle) * speed - Math.random() * 8; // bias upward

      // Spin
      this.rotation  = Math.random() * Math.PI * 2;
      this.rotSpeed  = (Math.random() - 0.5) * 0.25;

      // Wobble
      this.wobble    = Math.random() * Math.PI * 2;
      this.wobbleInc = Math.random() * 0.05 + 0.02;

      // Life
      this.opacity   = 1;
      this.fadeDelay = opts.fadeDelay || (Math.random() * 60 + 40); // ticks before fade
      this.tick      = 0;
    }

    update() {
      this.tick++;
      this.vx  *= 0.98;                           // air resistance
      this.vy  += 0.35 * this.mass;              // gravity
      this.vy  *= 0.99;
      this.x   += this.vx;
      this.y   += this.vy;
      this.rotation  += this.rotSpeed;
      this.wobble    += this.wobbleInc;

      // Fade out after delay
      if (this.tick > this.fadeDelay) {
        this.opacity -= 0.018;
      }
    }

    draw(ctx) {
      if (this.opacity <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.opacity);
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;

      const s = this.size * (0.9 + Math.sin(this.wobble) * 0.1); // wobble scale

      switch (this.shape) {
        case 'rect':
          ctx.fillRect(-s / 2, -s * 0.4, s, s * 0.8);
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(0, -s / 2);
          ctx.lineTo(s / 2, s / 2);
          ctx.lineTo(-s / 2, s / 2);
          ctx.closePath();
          ctx.fill();
          break;
        case 'star': {
          const r1 = s / 2, r2 = s / 4.5, pts = 5;
          ctx.beginPath();
          for (let i = 0; i < pts * 2; i++) {
            const r     = i % 2 === 0 ? r1 : r2;
            const theta = (i * Math.PI) / pts - Math.PI / 2;
            i === 0 ? ctx.moveTo(r * Math.cos(theta), r * Math.sin(theta))
                    : ctx.lineTo(r * Math.cos(theta), r * Math.sin(theta));
          }
          ctx.closePath();
          ctx.fill();
          break;
        }
      }
      ctx.restore();
    }

    isDead() { return this.opacity <= 0 || this.y > canvas.height + 40; }
  }

  // ── Setup canvas ────────────────────────────
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      pointer-events:none;z-index:99990;
    `;
    document.body.appendChild(canvas);
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // ── Emit particles ───────────────────────────
  function emit(count, opts = {}) {
    ensureCanvas();
    ctx = canvas.getContext('2d');

    const cx = opts.x !== undefined ? opts.x : canvas.width  / 2;
    const cy = opts.y !== undefined ? opts.y : canvas.height * 0.35;

    for (let i = 0; i < count; i++) {
      particles.push(new Particle(cx, cy, {
        color:     opts.color,
        shape:     opts.shape,
        size:      opts.size,
        angle:     opts.angle,
        speed:     opts.speed,
        fadeDelay: opts.fadeDelay,
      }));
    }

    if (!running) loop();
  }

  // ── Cannon burst from edges ──────────────────
  function cannon(side, count = 60) {
    ensureCanvas();
    const w = canvas.width, h = canvas.height;
    const isLeft  = side === 'left'  || side === 'both';
    const isRight = side === 'right' || side === 'both';

    const burst = (x, y, angleMid) => {
      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * 1.2; // radians spread
        particles.push(new Particle(x, y, {
          angle:  angleMid + spread,
          speed:  Math.random() * 14 + 8,
          size:   Math.random() * 9 + 5,
          fadeDelay: Math.random() * 80 + 60,
        }));
      }
    };

    if (isLeft)  burst(0,          h * 0.55, -Math.PI * 0.25);   // bottom-left → up-right
    if (isRight) burst(w,          h * 0.55,  Math.PI * 1.25);   // bottom-right → up-left

    if (!running) loop();
  }

  // ── Rain from top ────────────────────────────
  function rain(count = 150, duration = 2000) {
    ensureCanvas();
    const w = canvas.width;
    const step = duration / count;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        particles.push(new Particle(
          Math.random() * w,
          -20,
          {
            angle:  Math.PI * 0.5 + (Math.random() - 0.5) * 0.6,
            speed:  Math.random() * 6 + 3,
            size:   Math.random() * 8 + 4,
            fadeDelay: 120,
          }
        ));
      }, i * step);
    }

    if (!running) loop();
  }

  // ── Animation loop ───────────────────────────
  function loop() {
    if (!ctx) return;
    running = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles = particles.filter(p => !p.isDead());
    particles.forEach(p => { p.update(); p.draw(ctx); });

    if (particles.length > 0) {
      animId = requestAnimationFrame(loop);
    } else {
      running = false;
      animId  = null;
      // Keep canvas but clear it
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ── Stop all ─────────────────────────────────
  function stop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    running   = false;
    particles = [];
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ══ HIGH-LEVEL CELEBRATION EFFECTS ══════════

  // 🎉 Deck complete — burst from center + cannons
  function deckComplete() {
    stop();
    // Center burst
    emit(80, { speed: 14, fadeDelay: 70 });
    // Side cannons after short delay
    setTimeout(() => cannon('both', 55), 250);
    // Second center burst
    setTimeout(() => emit(60, { x: canvas?.width/2, y: canvas?.height*0.3, speed: 10 }), 500);
    // Gentle rain finish
    setTimeout(() => rain(80, 1500), 800);

    // Auto-stop after 6s
    setTimeout(stop, 6000);
  }

  // 🏆 Perfect score — full celebration
  function perfectScore() {
    stop();

    // Big center explosion
    emit(120, { speed: 16, fadeDelay: 80 });

    // Sequential cannon bursts
    setTimeout(() => cannon('left',  70), 200);
    setTimeout(() => cannon('right', 70), 350);
    setTimeout(() => cannon('both',  50), 700);

    // Rain shower
    setTimeout(() => rain(200, 2500), 600);

    // Final burst
    setTimeout(() => emit(100, { speed: 18, fadeDelay: 90 }), 1200);

    // Auto-stop after 8s
    setTimeout(stop, 8000);
  }

  // ⭐ Good score (80%+) — moderate celebration
  function goodScore() {
    stop();
    emit(60, { speed: 12, fadeDelay: 60 });
    setTimeout(() => cannon('both', 40), 300);
    setTimeout(stop, 4500);
  }

  // 🎯 Single card got it — tiny pop
  function miniPop(x, y) {
    if (!canvas) ensureCanvas();
    emit(12, {
      x: x || canvas?.width  / 2,
      y: y || canvas?.height / 2,
      speed: 6,
      size:  5,
      fadeDelay: 25,
    });
  }

  return {
    deckComplete,
    perfectScore,
    goodScore,
    miniPop,
    stop,
    emit,
    cannon,
    rain,
  };
})();
