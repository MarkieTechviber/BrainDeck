// server/services/extractors/ocrExtractor.js
const { cleanText } = require('../../utils/textUtils');

/**
 * Run OCR on an image buffer using Tesseract.js
 * Only called when embedded images are detected in documents
 */
const extractTextFromImage = async (imageBuffer) => {
  try {
    const Tesseract = require('tesseract.js');

    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: () => {}, // Suppress verbose logging
    });

    return cleanText(text);
  } catch (error) {
    console.warn('[OCR] OCR failed for image:', error.message);
    return ''; // Non-fatal: return empty string
  }
};

module.exports = { extractTextFromImage };
