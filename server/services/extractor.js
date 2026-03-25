// server/services/extractor.js
const { extractFromPDF } = require('./extractors/pdfExtractor');
const { extractFromDOCX } = require('./extractors/docxExtractor');
const { extractFromPPTX } = require('./extractors/pptxExtractor');
const { extractFromTXT } = require('./extractors/txtExtractor');
const { getExtension } = require('../utils/fileUtils');

const extractContent = async (filePath) => {
  const ext = getExtension(filePath);

  console.log(`[Extractor] Processing ${ext.toUpperCase()} file: ${filePath}`);

  let result;

  switch (ext) {
    case 'pdf':
      result = await extractFromPDF(filePath);
      break;
    case 'docx':
      result = await extractFromDOCX(filePath);
      break;
    case 'pptx':
      result = await extractFromPPTX(filePath);
      break;
    case 'txt':
    case 'md':
      result = await extractFromTXT(filePath);
      break;
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }

  const allText = [
    result.text,
    ...(result.imageTexts || []),
  ].filter(Boolean).join('\n\n');

  if (!allText || allText.trim().length < 50) {
    throw new Error(
      'Could not extract enough readable content from this file. ' +
      'The file may be empty, corrupted, or image-only without readable text.'
    );
  }

  return {
    text: allText,
    metadata: result.metadata || {},
    characterCount: allText.length,
    wordCount: allText.split(/\s+/).filter(Boolean).length,
    fileType: ext,
  };
};

module.exports = { extractContent };
