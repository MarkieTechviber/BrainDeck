// server/services/extractors/pptxExtractor.js
const { cleanText } = require('../../utils/textUtils');

const extractFromPPTX = async (filePath) => {
  try {
    const AdmZip = require('adm-zip');
    const slides = [];

    const zip = new AdmZip(filePath);
    const slideEntries = zip.getEntries().filter(e =>
      e.entryName.startsWith('ppt/slides/slide') &&
      e.entryName.endsWith('.xml')
    );

    // Sort slides by number
    slideEntries.sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] || 0);
      const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] || 0);
      return numA - numB;
    });

    for (let i = 0; i < slideEntries.length; i++) {
      const xml = zip.readAsText(slideEntries[i]);
      const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
      const texts = matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
      if (texts.length > 0) {
        slides.push(`--- Slide ${i + 1} ---\n${texts.join('\n')}`);
      }
    }

    const combinedText = slides.join('\n\n');

    return {
      text: cleanText(combinedText),
      metadata: {
        slideCount: slides.length,
      },
      imageTexts: [],
    };
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      throw new Error('adm-zip module not installed. Run: npm install adm-zip');
    }
    throw new Error(`PPTX extraction failed: ${error.message}`);
  }
};

module.exports = { extractFromPPTX };
