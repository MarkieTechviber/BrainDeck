// server/utils/textUtils.js

const cleanText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return '';

  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\t/g, '  ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\0/g, '')
    .trim();
};

const chunkText = (text, maxChunkLength = 3000) => {
  if (!text) return [];

  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  const chunks = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length > maxChunkLength) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += ' ' + sentence;
          }
        }
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

const estimateTokenCount = (text) => {
  return Math.ceil(text.length / 4);
};

const truncateToTokenLimit = (text, maxTokens = 3000) => {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '\n\n[Content truncated for processing...]';
};

module.exports = { cleanText, chunkText, estimateTokenCount, truncateToTokenLimit };
