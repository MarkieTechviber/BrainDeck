const express = require('express');
const router  = express.Router();
const { listDecks, getDeck, saveDeck, updateDeck, deleteDeck } = require('../controllers/deckController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/',           requireAuth, listDecks);
router.post('/',          requireAuth, saveDeck);
router.get('/:id',        requireAuth, getDeck);
router.patch('/:id',      requireAuth, updateDeck);
router.delete('/:id',     requireAuth, deleteDeck);

module.exports = router;
