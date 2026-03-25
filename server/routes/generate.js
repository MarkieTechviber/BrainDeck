// server/routes/generate.js
const express = require('express');
const router = express.Router();
const generateController = require('../controllers/generateController');

router.post('/', generateController.generateCards);

module.exports = router;
