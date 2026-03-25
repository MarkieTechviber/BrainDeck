# BrainDeck Data Isolation Issues - Problems & Fixes

## 🔴 CRITICAL ISSUES IDENTIFIED

### Issue #1: Deck ID Property Mismatch (Prevents Playing Decks)
**Location**: `public/js/decks.js` line 116  
**Problem**: 
```javascript
onclick="openDeck('${d._id}','${d.cardType}')"
```
Uses `d._id` (MongoDB convention) but the database returns `d.id` (SQL field).
This causes `openDeck()` to receive `undefined` as the deck ID, preventing deck loading.

**Why decks can't be played**: When clicking "Study" on a deck, the ID is undefined, so `/api/decks/undefined` is called, which returns 404 or no data.

---

### Issue #2: Data Visibility - All Decks Visible to All Users
**Location**: Frontend shows all decks regardless of login state  
**Root Cause**: The `listDecks()` endpoint in `server/controllers/deckController.js` correctly filters by `userId`, BUT there's a secondary issue in how the frontend or caching is working.

**Suspected Problem**: 
- LocalStorage `bd_session` may be persisting across user sessions without proper cleanup on logout
- Browser cache may be storing deck data from previous user
- Session data not being cleared when user logs out

---

### Issue #3: Incomplete Deck Data Loading
**Location**: `public/js/flashcard.js` (and quiz.js, summary.js)  
**Problem**: The pages rely on `localStorage.getItem('bd_session')` which contains cards. However:
1. If user navigates away and comes back, the session expires (after ~1 hour)
2. No fallback to fetch deck data from server when localStorage is missing
3. The session is only set during generation, not when opening from "My Decks"

---

## 📋 COMPLETE FIX LIST

### FIX #1: Correct Deck ID Property in decks.js
**File**: `public/js/decks.js`  
**Line**: 116  
**Current Code**:
```javascript
<button class="btn-primary-neu flex-fill py-1 rounded-3 bd-font-sm fw-600"
        onclick="openDeck('${d._id}','${d.cardType}')">
```
**Fixed Code**:
```javascript
<button class="btn-primary-neu flex-fill py-1 rounded-3 bd-font-sm fw-600"
        onclick="openDeck('${d.id}','${d.cardType}')">
```

---

### FIX #2: Correct Delete Button ID Property in decks.js
**File**: `public/js/decks.js`  
**Line**: 125  
**Current Code**:
```javascript
<button class="btn-neu px-3 py-1 rounded-3 bd-font-sm"
        style="color:var(--danger)"
        onclick="deleteDeck('${d._id}',this)"
        title="Delete deck">
```
**Fixed Code**:
```javascript
<button class="btn-neu px-3 py-1 rounded-3 bd-font-sm"
        style="color:var(--danger)"
        onclick="deleteDeck('${d.id}',this)"
        title="Delete deck">
```

---

### FIX #3: Clear LocalStorage Session on Logout
**File**: `public/js/auth.js`  
**Location**: In the logout function, add session cleanup  
**Current Code** (find the logout section):
```javascript
logout: async function() {
  const token = this.getToken();
  if (!token) {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    window.location.href = '/login.html';
    return;
  }
  
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });
  } finally {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    window.location.href = '/login.html';
  }
}
```

**Fixed Code** (add bd_session cleanup):
```javascript
logout: async function() {
  const token = this.getToken();
  if (!token) {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem('bd_session');  // ← ADD THIS LINE
    window.location.href = '/login.html';
    return;
  }
  
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
    });
  } finally {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem('bd_session');  // ← ADD THIS LINE
    window.location.href = '/login.html';
  }
}
```

---

### FIX #4: Improve Deck Loading with Server Fallback
**File**: `public/js/flashcard.js`  
**Location**: At initialization (around line 301)  
**Current Code**:
```javascript
// ── Load session ─────────────────────────────
const raw = localStorage.getItem('bd_session');
if (!raw) { new bootstrap.Modal(document.getElementById('noSessionModal')).show(); return; }
const session = JSON.parse(raw);

if (session.cardType === 'flashcard' && session.cards?.length) {
  init(session.cards, session.chapters || []);
} else if (session.sessionId) {
  BrainDeckAPI.getCardsForType(session.sessionId, 'flashcard')
    .then(res => {
      // ... existing code
    }).catch(() => new bootstrap.Modal(document.getElementById('noSessionModal')).show());
} else { new bootstrap.Modal(document.getElementById('noSessionModal')).show(); }
```

**Fixed Code** (adds fallback to fetch from server):
```javascript
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
```

---

### FIX #5: Same Fixes for quiz.js 
Apply the same change as FIX #4 to `public/js/quiz.js` (same initialization pattern around line 300+)

---

### FIX #6: Same Fixes for summary.js
Apply the same change as FIX #4 to `public/js/summary.js` (same initialization pattern around line 300+)

---

## 🧪 TESTING AFTER FIXES

1. **Test 1 - Play deck immediately after creation**:
   - Upload a file → generates flashcard/quiz/summary
   - Click "Study" buttons
   - All three study modes should open and display cards

2. **Test 2 - Play deck from My Decks later**:
   - Create and save a deck
   - Navigate away (to library, home, etc.)
   - Go to "My Decks"
   - Click "Study" on the deck
   - Cards should load from server

3. **Test 3 - User isolation**:
   - Login as User A → Create 3 decks
   - Logout
   - Login as User B
   - User B's "My Decks" should show 0 decks (not User A's 3)
   - Create 2 decks as User B
   - Logout → Login as User A
   - User A should see exactly 3 decks (User B's 2 are invisible)

4. **Test 4 - Cross-browser session**:
   - Create deck in one browser window
   - Open completely different browser
   - Login to same account
   - Should NOT see previous browser's localStorage session
   - Should only see saved decks from server

---

## 📊 ROOT CAUSE SUMMARY

| Problem | Root Cause | Impact |
|---------|-----------|--------|
| Can't play decks | `d._id` → `d.id` mismatch | openDeck receives undefined |
| Other users' decks visible | localStorage persists across sessions | Session data leaks between users |
| Deck unplayable after refresh | No server fallback for expired sessions | Cards lost when session expires |

