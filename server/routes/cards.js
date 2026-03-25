// server/routes/cards.js
const express = require('express');
const router = express.Router();
const generateController = require('../controllers/generateController');

// GET /api/cards/:type?sessionId=xxx
router.get('/:type', generateController.getCardsForType);

module.exports = router;
