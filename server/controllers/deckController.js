// server/controllers/deckController.js
const { Deck, Profile } = require('../models/index');
const { sendSuccess, sendError } = require('../utils/responseUtils');

const listDecks = async (req, res, next) => {
  try {
    const decks = await Deck.findAll({
      where: { userId: req.userId },
      order: [['createdAt','DESC']],
      attributes: { exclude: ['cards'] }, // don't send all card data in list
    });
    return sendSuccess(res, { decks });
  } catch (err) { next(err); }
};

const getDeck = async (req, res, next) => {
  try {
    const deck = await Deck.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!deck) return sendError(res, 'Deck not found.', 404);
    deck.studyCount   += 1;
    deck.lastStudiedAt = new Date();
    await deck.save();
    return sendSuccess(res, { deck });
  } catch (err) { next(err); }
};

const saveDeck = async (req, res, next) => {
  try {
    const { title, originalFileName, fileType, cardType, cards, aiProvider, aiModel } = req.body;
    if (!cards || !cardType) return sendError(res, 'cards and cardType are required.', 400);
    const deck = await Deck.create({
      userId: req.userId,
      title:  title || originalFileName || 'Untitled Deck',
      originalFileName, fileType, cardType, cards, aiProvider, aiModel,
    });
    await Profile.increment('totalDecks', { where: { userId: req.userId } });
    return sendSuccess(res, { deck }, 'Deck saved.', 201);
  } catch (err) { next(err); }
};

const deleteDeck = async (req, res, next) => {
  try {
    const deck = await Deck.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!deck) return sendError(res, 'Deck not found.', 404);
    await deck.destroy();
    await Profile.decrement('totalDecks', { where: { userId: req.userId } });
    return sendSuccess(res, null, 'Deck deleted.');
  } catch (err) { next(err); }
};

const updateDeck = async (req, res, next) => {
  try {
    const { title, cardType, cards, aiProvider, aiModel } = req.body;
    
    const deck = await Deck.findOne({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!deck) return sendError(res, 'Deck not found.', 404);
    
    // Update only provided fields
    if (title !== undefined) deck.title = title;
    if (cardType !== undefined) deck.cardType = cardType;
    if (cards !== undefined) deck.cards = cards;  // Will trigger Sequelize setter/getter
    if (aiProvider !== undefined) deck.aiProvider = aiProvider;
    if (aiModel !== undefined) deck.aiModel = aiModel;
    
    await deck.save();  // This triggers the beforeUpdate hook to update cardCount
    
    return sendSuccess(res, { deck }, 'Deck updated successfully.');
  } catch (err) { next(err); }
};

module.exports = { listDecks, getDeck, saveDeck, updateDeck, deleteDeck };
