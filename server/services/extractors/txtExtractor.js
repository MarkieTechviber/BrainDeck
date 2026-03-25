// server/services/extractors/txtExtractor.js
const fs = require('fs');
const { cleanText } = require('../../utils/textUtils');

const extractFromTXT = async (filePath) => {
  try {
    const rawText = fs.readFileSync(filePath, 'utf-8');

    // Strip markdown syntax for cleaner AI processing
    const stripped = rawText
      .replace(/^#{1,6}\s+/gm, '')       // Remove heading markers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1')     // Remove italic
      .replace(/`([^`]+)`/g, '$1')       // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/^[-*+]\s+/gm, '• ')     // Normalize bullet points
      .replace(/^>\s+/gm, '')            // Remove blockquotes markers
      .replace(/```[\s\S]*?```/g, '')    // Remove code blocks
      .replace(/---+/g, '')              // Remove horizontal rules

    return {
      text: cleanText(stripped),
      metadata: {
        originalLength: rawText.length,
      },
      imageTexts: [],
    };
  } catch (error) {
    throw new Error(`TXT/MD extraction failed: ${error.message}`);
  }
};

module.exports = { extractFromTXT };
