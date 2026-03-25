// server/services/extractors/pdfExtractor.js
const fs = require('fs');
const { cleanText } = require('../../utils/textUtils');

const extractFromPDF = async (filePath) => {
  try {
    // Dynamically require to handle optional dependency
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    return {
      text: cleanText(data.text),
      metadata: {
        pageCount: data.numpages,
        info: data.info,
      },
      imageTexts: [],
    };
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      throw new Error('pdf-parse module not installed. Run: npm install pdf-parse');
    }
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
};

module.exports = { extractFromPDF };
