// public/js/tts.js — text-to-speech for flashcards
'use strict';
const TTS = (() => {
  let enabled = false;
  const synth = window.speechSynthesis;

  const speak = text => {
    if (!enabled || !synth || !text) return;
    synth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95; utt.pitch = 1; utt.volume = 1;
    synth.speak(utt);
  };

  const toggle = () => {
    enabled = !enabled;
    if (!enabled) synth?.cancel();
    document.querySelectorAll('.bd-tts-btn').forEach(btn => {
      btn.style.color = enabled ? 'var(--primary)' : 'var(--text-muted)';
      btn.title = enabled ? 'TTS on (T to toggle)' : 'TTS off (T to toggle)';
    });
    if (enabled) {
      const q = document.getElementById('cardQuestion');
      if (q) speak(q.textContent);
    }
  };

  const speakQuestion = () => {
    const q = document.getElementById('cardQuestion');
    if (q) speak(q.textContent);
  };

  const speakAnswer = () => {
    const a = document.getElementById('cardAnswer');
    if (a) speak(a.textContent);
  };

  return { toggle, speak, speakQuestion, speakAnswer, isEnabled: () => enabled };
})();
