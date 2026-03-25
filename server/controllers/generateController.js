// server/controllers/generateController.js
const { sendSuccess, sendError } = require('../utils/responseUtils');
const { extractContent } = require('../services/extractor');
const { generateCards } = require('../services/ai');
const { deleteFile } = require('../utils/fileUtils');

// In-memory session store
// Key: sessionId, Value: { extractedText, flashcard, summary, quiz }
const cardStore = new Map();

const generateCardsHandler = async (req, res, next) => {
  let filePath = null;

  try {
    const { filePath: fp, cardType, sessionId, difficulty = 'medium' } = req.body;
    filePath = fp;

    if (!filePath || !cardType) {
      return sendError(res, 'Missing required fields: filePath, cardType', 400);
    }
    const validDifficulties = ['easy','medium','hard','expert'];
    const activeDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'medium';

    const validTypes = ['flashcard', 'summary', 'quiz'];
    if (!validTypes.includes(cardType)) {
      return sendError(res, `Invalid card type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    // Step 1: Extract content from file
    console.log(`[Generate] Step 1: Extracting content from ${filePath}...`);
    const extraction = await extractContent(filePath);
    console.log(`[Generate] Extracted ${extraction.wordCount} words from ${extraction.fileType.toUpperCase()}`);

    // Step 2: Generate cards via AI
    console.log(`[Generate] Step 2: Generating ${cardType} cards via AI...`);
    const result = await generateCards(extraction.text, cardType, activeDifficulty);

    // Step 3: Cache session for type switching
    const storeKey = sessionId || `session_${Date.now()}`;

    if (!cardStore.has(storeKey)) {
      cardStore.set(storeKey, {
        extractedText: extraction.text,
        difficulty: activeDifficulty,
        flashcard: null,
        summary: null,
        quiz: null,
      });
    }

    const session = cardStore.get(storeKey);
    session[cardType] = result.cards;
    session[cardType + '_chapters'] = result.chapters || [];
    session.extractedText = extraction.text;

    // Auto-cleanup after 1 hour
    setTimeout(() => {
      cardStore.delete(storeKey);
      console.log(`[Session] Auto-cleaned session: ${storeKey}`);
    }, 3600000);

    return sendSuccess(res, {
      sessionId: storeKey,
      cardType,
      difficulty: activeDifficulty,
      cardCount: result.cards.length,
      cards:     result.cards,
      chapters:  result.chapters || [],
      extraction: {
        wordCount: extraction.wordCount,
        fileType: extraction.fileType,
      },
    }, `Generated ${result.cards.length} ${cardType} cards successfully.`);

  } catch (error) {
    next(error);
  } finally {
    // Always clean up uploaded file
    if (filePath) {
      deleteFile(filePath);
    }
  }
};

const getCardsForType = async (req, res, next) => {
  try {
    const { sessionId, cardType } = req.query;

    if (!sessionId || !cardType) {
      return sendError(res, 'Missing sessionId or cardType query parameters.', 400);
    }

    const validTypes = ['flashcard', 'summary', 'quiz'];
    if (!validTypes.includes(cardType)) {
      return sendError(res, `Invalid card type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    if (!cardStore.has(sessionId)) {
      return sendError(res, 'Session expired or not found. Please re-upload your document.', 404);
    }

    const session = cardStore.get(sessionId);

    // Return cached cards if available
    if (session[cardType]) {
      return sendSuccess(res, {
        sessionId,
        cardType,
        cardCount: session[cardType].length,
        cards:     session[cardType],
        chapters:  session[cardType + '_chapters'] || [],
        cached: true,
      }, `Retrieved cached ${cardType} cards.`);
    }

    // Generate this card type from cached extracted text
    console.log(`[Cards] Generating ${cardType} cards from cached session: ${sessionId}`);
    const sessionDifficulty = session.difficulty || 'medium';
    const result = await generateCards(session.extractedText, cardType, sessionDifficulty);
    session[cardType] = result.cards;

    return sendSuccess(res, {
      sessionId,
      cardType,
      cardCount: result.cards.length,
      cards:     result.cards,
      chapters:  result.chapters || [],
      cached: false,
    }, `Generated ${result.cards.length} ${cardType} cards.`);

  } catch (error) {
    next(error);
  }
};

module.exports = { generateCards: generateCardsHandler, getCardsForType };
