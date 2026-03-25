// server/services/claudeService.js
const axios = require('axios');
const aiConfig = require('../config/ai.config');

const generateWithClaude = async (systemPrompt, userPrompt) => {
  if (!aiConfig.claude.apiKey) {
    throw new Error('Claude API key not configured. Set CLAUDE_API_KEY in your .env file.');
  }

  const url = 'https://api.anthropic.com/v1/messages';

  const payload = {
    model: aiConfig.claude.model,
    max_tokens: aiConfig.claude.maxTokens,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  };

  try {
    const response = await axios.post(url, payload, {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiConfig.claude.apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    return response.data.content?.[0]?.text || '';
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Invalid Claude API key. Check your CLAUDE_API_KEY in .env');
    }
    if (error.response?.status === 429) {
      throw new Error('Claude API rate limit exceeded. Please wait before retrying.');
    }
    if (error.response?.status === 400) {
      throw new Error('Bad request to Claude API. The document may be too long.');
    }
    throw new Error(`Claude API error: ${error.message}`);
  }
};

module.exports = { generateWithClaude };
