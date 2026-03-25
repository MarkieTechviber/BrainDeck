// server/routes/user.js
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
  getMe,
  updateMe,
  changePassword,
  getDecks,
  getDeck,
  saveDeck,
  deleteDeck,
  deleteAccount,
} = require('../controllers/userController');

// All user routes require auth
router.get('/me',                   requireAuth, getMe);
router.patch('/me',                 requireAuth, updateMe);
router.post('/me/change-password',  requireAuth, changePassword);
router.delete('/me',                requireAuth, deleteAccount);

// Decks
router.get('/decks',        requireAuth, getDecks);
router.post('/decks',       requireAuth, saveDeck);
router.get('/decks/:id',    requireAuth, getDeck);
router.delete('/decks/:id', requireAuth, deleteDeck);

module.exports = router;
