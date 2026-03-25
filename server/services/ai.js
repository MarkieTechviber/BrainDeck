// server/services/ai.js
const aiConfig = require('../config/ai.config');
const { generateWithOllama } = require('./ollamaService');
const { generateWithCloud } = require('./cloudService');
const { getSystemPrompt, buildUserPrompt } = require('./prompts');
const { parseAIResponse } = require('./parser');
const { truncateToTokenLimit } = require('../utils/textUtils');

const generateCards = async (extractedText, cardType, difficulty = 'medium') => {
  const validTypes = ['flashcard', 'summary', 'quiz'];
  if (!validTypes.includes(cardType)) {
    throw new Error(`Invalid card type: ${cardType}. Must be one of: ${validTypes.join(', ')}`);
  }

  const text = truncateToTokenLimit(extractedText, 3000);
  const d = ['easy','medium','hard','expert'].includes(difficulty) ? difficulty : 'medium';
  const systemPrompt = getSystemPrompt(cardType, d);
  const userPrompt   = buildUserPrompt(text, cardType, d);

  // Read mode dynamically — supports runtime switching via /api/ai-mode
  const activeMode = global.aiModeOverride || aiConfig.mode;
  const activeOllamaModel = global.ollamaModelOverride || aiConfig.ollama.model;
  const providerName = global.cloudProviderState?.provider || 'claude';

  console.log(`[AI] Mode: ${activeMode}${activeMode === 'cloud' ? ` | Provider: ${providerName}` : ` | Ollama model: ${activeOllamaModel}`} | Card type: ${cardType} | Difficulty: ${d}`);

  let rawResponse;

  if (activeMode === 'cloud') {
    rawResponse = await generateWithCloud(systemPrompt, userPrompt);
  } else {
    rawResponse = await generateWithOllama(systemPrompt, userPrompt, activeOllamaModel);
  }

  console.log(`[AI] Response received (${rawResponse.length} chars), parsing...`);

  const parsed = parseAIResponse(rawResponse, cardType);
  console.log(`[AI] Generated ${parsed.cards.length} cards of type: ${cardType}`);
  return parsed;
};

module.exports = { generateCards };
