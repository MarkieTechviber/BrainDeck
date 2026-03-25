// server/services/extractors/docxExtractor.js
const fs = require('fs');
const { cleanText } = require('../../utils/textUtils');

const extractFromDOCX = async (filePath) => {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });

    return {
      text: cleanText(result.value),
      metadata: {
        warnings: result.messages,
      },
      imageTexts: [],
    };
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      throw new Error('mammoth module not installed. Run: npm install mammoth');
    }
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
};

module.exports = { extractFromDOCX };
