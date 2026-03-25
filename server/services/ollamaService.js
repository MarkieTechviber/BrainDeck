// server/services/ollamaService.js
const axios = require('axios');
const aiConfig = require('../config/ai.config');

const generateWithOllama = async (systemPrompt, userPrompt, modelOverride) => {
  const url = `${aiConfig.ollama.url}/api/chat`;
  const model = modelOverride || aiConfig.ollama.model;

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    options: { temperature: 0.3, num_predict: 4096 },
  };

  try {
    const response = await axios.post(url, payload, {
      timeout: 120000,
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data.message?.content || '';
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to Ollama. Make sure Ollama is running: run `ollama serve` in your terminal.');
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Ollama request timed out. The model may still be loading — try again in a moment.');
    }
    throw new Error(`Ollama API error: ${error.message}`);
  }
};

module.exports = { generateWithOllama };
