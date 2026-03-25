// public/js/spaced-rep.js — SM-2 spaced repetition algorithm
'use strict';
const SpacedRep = (() => {
  const KEY = 'bd_sr_cards';

  // SM-2: quality 0-5 (0-2 = fail, 3-5 = pass)
  const calculate = (card, quality) => {
    let { easeFactor = 2.5, interval = 1, repetitions = 0 } = card;
    if (quality >= 3) {
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 6;
      else interval = Math.round(interval * easeFactor);
      repetitions++;
    } else {
      repetitions = 0;
      interval = 1;
    }
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    return { easeFactor, interval, repetitions, nextReview: nextReview.toISOString(), lastQuality: quality };
  };

  const load = () => JSON.parse(localStorage.getItem(KEY) || '{}');
  const save = data => localStorage.setItem(KEY, JSON.stringify(data));

  const updateCard = (deckId, cardId, quality) => {
    const all = load();
    const k = `${deckId}_${cardId}`;
    all[k] = calculate(all[k] || {}, quality);
    save(all);
    return all[k];
  };

  const getDueCards = (deckId, cards) => {
    const all = load();
    const now = new Date();
    return cards.filter(c => {
      const k = `${deckId}_${c.id}`;
      if (!all[k]) return true; // never reviewed
      return new Date(all[k].nextReview) <= now;
    });
  };

  const getCardStats = (deckId, cardId) => {
    const all = load();
    return all[`${deckId}_${cardId}`] || null;
  };

  const getDeckProgress = (deckId, cards) => {
    const all = load();
    const now = new Date();
    const due = cards.filter(c => { const k=`${deckId}_${c.id}`; return !all[k]||new Date(all[k].nextReview)<=now; }).length;
    const learned = cards.filter(c => { const k=`${deckId}_${c.id}`; return all[k]?.repetitions>0; }).length;
    return { due, learned, total: cards.length, mastered: cards.filter(c => { const k=`${deckId}_${c.id}`; return (all[k]?.interval||0)>=21; }).length };
  };

  return { updateCard, getDueCards, getCardStats, getDeckProgress, calculate };
})();
