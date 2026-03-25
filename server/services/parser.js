// server/services/parser.js

const parseAIResponse = (rawResponse, expectedCardType) => {
  if (!rawResponse || typeof rawResponse !== 'string') {
    throw new Error('AI returned an empty or invalid response.');
  }

  let jsonString = rawResponse.trim();

  // Strip markdown code blocks if present
  jsonString = jsonString
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Find JSON object bounds if there's surrounding text
  const jsonStart = jsonString.indexOf('{');
  const jsonEnd = jsonString.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('AI response did not contain valid JSON. Try regenerating.');
  }

  jsonString = jsonString.substring(jsonStart, jsonEnd + 1);

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (parseError) {
    throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
  }

  if (!parsed.type || !Array.isArray(parsed.cards)) {
    throw new Error('AI response is missing required fields: type or cards array.');
  }

  if (parsed.type !== expectedCardType) {
    console.warn(`[Parser] Card type mismatch: expected ${expectedCardType}, got ${parsed.type}`);
    parsed.type = expectedCardType;
  }

  if (parsed.cards.length === 0) {
    throw new Error('AI generated 0 cards. The document may not have enough content.');
  }

  // Add sequential IDs if missing
  parsed.cards = parsed.cards.map((card, index) => ({
    ...card,
    id: card.id || index + 1,
  }));

  // Preserve chapters array if AI returned one
  if (!Array.isArray(parsed.chapters)) {
    // Auto-derive chapters from card.chapter fields if missing
    const seen = [];
    parsed.cards.forEach(c => {
      if (c.chapter && !seen.includes(c.chapter)) seen.push(c.chapter);
    });
    parsed.chapters = seen.length > 0 ? seen : [];
  }

  return parsed;
};

module.exports = { parseAIResponse };
