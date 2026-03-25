// public/js/api.js
'use strict';

const BrainDeckAPI = (() => {
  const BASE = '/api';

  const getAuthHeaders = () => {
    const token = typeof BrainDeckAuth !== 'undefined' ? BrainDeckAuth.getToken() : null;
    return { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
  };

  const handleResponse = async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || `HTTP Error: ${r.status}`);
    return d;
  };

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append('document', file);
    const r = await fetch(`${BASE}/upload`, { method:'POST', body:fd, headers: getAuthHeaders(), credentials:'include' });
    return handleResponse(r);
  };

  const generateCards = async (filePath, cardType, sessionId, difficulty = 'medium') => {
    const r = await fetch(`${BASE}/generate`, {
      method:'POST',
      headers: { 'Content-Type':'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify({ filePath, cardType, sessionId, difficulty }),
    });
    return handleResponse(r);
  };

  const getCardsForType = async (sessionId, cardType) => {
    const r = await fetch(`${BASE}/cards/${cardType}?sessionId=${encodeURIComponent(sessionId)}&cardType=${cardType}`, {
      method:'GET', headers: getAuthHeaders(), credentials:'include',
    });
    return handleResponse(r);
  };

  // Auto-save deck to server if user is logged in
  const saveDeck = async (deckData) => {
    const token = typeof BrainDeckAuth !== 'undefined' ? BrainDeckAuth.getToken() : null;
    if (!token) return null;
    try {
      const r = await fetch(`${BASE}/decks`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(deckData),
      });
      return await r.json();
    } catch { return null; }
  };

  return { uploadFile, generateCards, getCardsForType, saveDeck };
})();
