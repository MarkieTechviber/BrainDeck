// public/js/pomodoro.js — Pomodoro timer widget
'use strict';
const Pomodoro = (() => {
  let total = 25 * 60, remaining = total, running = false, breakMode = false, interval = null;

  const pad = n => String(n).padStart(2,'0');
  const fmt = s => `${pad(Math.floor(s/60))}:${pad(s%60)}`;

  const inject = () => {
    if (document.getElementById('pomodoroWidget')) return;
    const el = document.createElement('div');
    el.id = 'pomodoroWidget';
    el.innerHTML = `
      <div style="position:fixed;bottom:1.5rem;right:1.5rem;z-index:888;
                  background:var(--surface);border-radius:var(--radius-lg);
                  box-shadow:var(--neu-shadow);padding:.9rem 1.1rem;
                  display:flex;align-items:center;gap:.7rem;min-width:170px;cursor:default"
           title="Pomodoro timer — P to pause/resume">
        <div style="position:relative;width:44px;height:44px">
          <svg width="44" height="44" style="transform:rotate(-90deg)">
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(108,99,255,0.1)" stroke-width="3"/>
            <circle id="pomRing" cx="22" cy="22" r="18" fill="none"
                    stroke="var(--primary)" stroke-width="3"
                    stroke-dasharray="113" stroke-dashoffset="0"
                    stroke-linecap="round" style="transition:stroke-dashoffset 1s linear"/>
          </svg>
          <span id="pomEmoji" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px">🍅</span>
        </div>
        <div>
          <div id="pomTime" style="font-size:1.1rem;font-weight:800;color:var(--text);line-height:1">${fmt(remaining)}</div>
          <div id="pomLabel" style="font-size:.7rem;color:var(--text-muted);margin-top:2px">Focus</div>
        </div>
        <div style="display:flex;gap:4px;margin-left:auto">
          <button id="pomToggle" onclick="Pomodoro.toggle()" title="P"
                  style="background:var(--surface);border:none;border-radius:50%;width:28px;height:28px;
                         box-shadow:var(--neu-shadow-sm);cursor:pointer;color:var(--primary);font-size:.8rem">▶</button>
          <button onclick="Pomodoro.reset()"
                  style="background:var(--surface);border:none;border-radius:50%;width:28px;height:28px;
                         box-shadow:var(--neu-shadow-sm);cursor:pointer;color:var(--text-muted);font-size:.8rem">↺</button>
          <button onclick="document.getElementById('pomodoroWidget').remove()"
                  style="background:var(--surface);border:none;border-radius:50%;width:28px;height:28px;
                         box-shadow:var(--neu-shadow-sm);cursor:pointer;color:var(--text-muted);font-size:.8rem">&times;</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    tick();
  };

  const tick = () => {
    const ring = document.getElementById('pomRing');
    const timeEl = document.getElementById('pomTime');
    const labelEl = document.getElementById('pomLabel');
    const btn = document.getElementById('pomToggle');
    const emoji = document.getElementById('pomEmoji');
    if (!ring) return;
    const pct = remaining / total;
    ring.style.strokeDashoffset = 113 * (1 - pct);
    ring.style.stroke = breakMode ? 'var(--success)' : 'var(--primary)';
    timeEl.textContent = fmt(remaining);
    labelEl.textContent = breakMode ? 'Break' : 'Focus';
    if (btn) btn.textContent = running ? '⏸' : '▶';
    if (emoji) emoji.textContent = breakMode ? '☕' : '🍅';
  };

  const toggle = () => {
    inject();
    if (running) {
      clearInterval(interval); running = false;
    } else {
      running = true;
      interval = setInterval(() => {
        remaining--;
        tick();
        if (remaining <= 0) {
          clearInterval(interval); running = false;
          breakMode = !breakMode;
          total = breakMode ? 5*60 : 25*60;
          remaining = total;
          tick();
          if (Notification.permission === 'granted') {
            new Notification('BrainDeck', { body: breakMode ? 'Break time! 5 min.' : 'Back to focus! 25 min.', icon: '/favicon.ico' });
          }
        }
      }, 1000);
    }
    tick();
  };

  const reset = () => {
    clearInterval(interval); running = false; breakMode = false;
    total = 25*60; remaining = total; tick();
  };

  Notification.requestPermission?.();

  return { toggle, reset };
})();
