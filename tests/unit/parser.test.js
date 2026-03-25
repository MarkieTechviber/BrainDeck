// tests/unit/parser.test.js
const { parseAIResponse } = require('../../server/services/parser');

describe('parseAIResponse', () => {
  it('parses valid flashcard JSON', () => {
    const input = JSON.stringify({
      type: 'flashcard',
      cards: [
        { id: 1, question: 'What is X?', answer: 'X is Y.', difficulty: 'easy' }
      ]
    });
    const result = parseAIResponse(input, 'flashcard');
    expect(result.type).toBe('flashcard');
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].question).toBe('What is X?');
  });

  it('strips markdown code blocks before parsing', () => {
    const input = '```json\n{"type":"flashcard","cards":[{"id":1,"question":"Q","answer":"A","difficulty":"easy"}]}\n```';
    const result = parseAIResponse(input, 'flashcard');
    expect(result.cards).toHaveLength(1);
  });

  it('throws on empty response', () => {
    expect(() => parseAIResponse('', 'flashcard')).toThrow();
  });

  it('throws when cards array is empty', () => {
    const input = JSON.stringify({ type: 'flashcard', cards: [] });
    expect(() => parseAIResponse(input, 'flashcard')).toThrow();
  });

  it('corrects type mismatch', () => {
    const input = JSON.stringify({
      type: 'wrongtype',
      cards: [{ id: 1, question: 'Q?', answer: 'A.', difficulty: 'easy' }]
    });
    const result = parseAIResponse(input, 'flashcard');
    expect(result.type).toBe('flashcard');
  });

  it('assigns IDs if missing', () => {
    const input = JSON.stringify({
      type: 'flashcard',
      cards: [{ question: 'Q?', answer: 'A.', difficulty: 'easy' }]
    });
    const result = parseAIResponse(input, 'flashcard');
    expect(result.cards[0].id).toBe(1);
  });
});
