// server/routes/chat.js — AI document chat endpoint
const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const aiConfig = require('../config/ai.config');

// POST /api/chat
// Body: { mode, provider, systemPrompt, messages: [{role, content}] }
router.post('/', async (req, res) => {
  try {
    const { systemPrompt, messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'messages array is required.' });
    }

    const activeMode         = global.aiModeOverride || aiConfig.mode;
    const activeOllamaModel  = global.ollamaModelOverride || aiConfig.ollama.model;
    const state              = global.cloudProviderState || {};

    let reply = '';

    // ── LOCAL / OLLAMA ────────────────────────────────────────────────────
    if (activeMode !== 'cloud') {
      const ollamaUrl = aiConfig.ollama.url || 'http://localhost:11434';
      const payload = {
        model:    activeOllamaModel,
        messages: systemPrompt
          ? [{ role: 'system', content: systemPrompt }, ...messages]
          : messages,
        stream:   false,
        options:  { temperature: 0.7, num_predict: 1024 },
      };
      const r = await axios.post(`${ollamaUrl}/api/chat`, payload, { timeout: 60000 });
      reply = r.data.message?.content || '';

    // ── CLOUD ─────────────────────────────────────────────────────────────
    } else {
      const { generateWithCloud } = require('../services/cloudService');

      // Build a single user message from the last message in history
      // (system prompt + full history is passed so the cloud service gets context)
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      if (!lastUserMsg) {
        return res.status(400).json({ success: false, message: 'No user message found.' });
      }

      // Embed prior conversation as context in the user prompt
      const history = messages.slice(0, -1);
      const contextBlock = history.length
        ? history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') + '\n\n'
        : '';

      const userPrompt = contextBlock + lastUserMsg.content;
      reply = await generateWithCloud(systemPrompt || 'You are a helpful study assistant.', userPrompt);
    }

    return res.json({ success: true, reply });

  } catch (err) {
    console.error('[Chat] Error:', err.message);

    // Friendly error messages for common failures
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, message: 'Cannot connect to Ollama. Make sure it is running.' });
    }
    if (err.code === 'ECONNABORTED') {
      return res.status(503).json({ success: false, message: 'AI request timed out. Try again.' });
    }
    return res.status(500).json({ success: false, message: err.message || 'AI chat failed.' });
  }
});

module.exports = router;
