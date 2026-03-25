// public/js/streaks.js — study streak tracker
'use strict';
const Streaks = (() => {
  const KEY = 'bd_streaks';

  const load = () => JSON.parse(localStorage.getItem(KEY) || '{"days":[],"longest":0,"xp":0,"level":1}');
  const save = d => localStorage.setItem(KEY, JSON.stringify(d));

  const today = () => new Date().toISOString().slice(0,10);
  const yesterday = () => { const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); };

  const recordStudy = (cardsStudied = 1) => {
    const data = load();
    const t = today();
    if (!data.days.includes(t)) {
      data.days.push(t);
      // check streak continuity
      const last = data.days[data.days.length - 2];
      if (last !== yesterday()) data.currentStreak = 1;
      else data.currentStreak = (data.currentStreak || 1) + 1;
      data.longest = Math.max(data.longest || 0, data.currentStreak);
    }
    data.xp = (data.xp || 0) + cardsStudied;
    data.level = Math.floor(data.xp / 100) + 1;
    save(data);
    return data;
  };

  const getStats = () => {
    const data = load();
    const t = today();
    const last = data.days[data.days.length - 1];
    const active = last === t || last === yesterday();
    return {
      currentStreak: active ? (data.currentStreak || (data.days.length > 0 ? 1 : 0)) : 0,
      longest:       data.longest || 0,
      totalDays:     (data.days || []).length,
      xp:            data.xp || 0,
      level:         data.level || 1,
      studiedToday:  last === t,
      days:          data.days || [],
    };
  };

  const getHeatmap = () => {
    const data = load();
    const set = new Set(data.days || []);
    const result = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const s = d.toISOString().slice(0,10);
      result.push({ date: s, studied: set.has(s) });
    }
    return result;
  };

  return { recordStudy, getStats, getHeatmap };
})();
