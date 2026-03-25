// server/config/ai.config.js
require('dotenv').config();

module.exports = {
  mode: process.env.AI_MODE || 'local',
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3',
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS) || 4096,
  },
};
