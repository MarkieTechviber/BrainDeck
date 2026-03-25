// server/services/cloudService.js
// Universal cloud AI provider — supports Claude, OpenAI, Groq, Mistral, Gemini, and any OpenAI-compatible endpoint
const axios = require('axios');

// Provider definitions: endpoint, default models, header format
const PROVIDERS = {
  claude: {
    name: 'Claude (Anthropic)',
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      'claude-opus-4-5',
      'claude-sonnet-4-20250514',
      'claude-haiku-4-5-20251001',
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307',
    ],
    type: 'claude',
  },
  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    type: 'openai',
  },
  groq: {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-8b-8192',
      'gemma2-9b-it',
      'mixtral-8x7b-32768',
    ],
    type: 'openai',
  },
  mistral: {
    name: 'Mistral AI',
    url: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-small-latest',
    models: ['mistral-large-latest', 'mistral-small-latest', 'open-mixtral-8x7b', 'open-mistral-7b'],
    type: 'openai',
  },
  gemini: {
    name: 'Google Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
    type: 'openai',
  },
  together: {
    name: 'Together AI',
    url: 'https://api.together.xyz/v1/chat/completions',
    defaultModel: 'meta-llama/Llama-3-70b-chat-hf',
    models: [
      'meta-llama/Llama-3-70b-chat-hf',
      'meta-llama/Llama-3-8b-chat-hf',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'Qwen/Qwen2-72B-Instruct',
    ],
    type: 'openai',
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openai/gpt-4o-mini',
    models: [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-flash-1.5',
      'meta-llama/llama-3.1-70b-instruct',
      'mistralai/mixtral-8x7b-instruct',
    ],
    type: 'openai',
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    url: '',
    defaultModel: '',
    models: [],
    type: 'openai',
  },
};

const generateWithCloud = async (systemPrompt, userPrompt) => {
  const state = global.cloudProviderState || {};
  const providerId = state.provider || 'claude';
  const apiKey = state.apiKey || '';
  const model = state.model || '';
  const customUrl = state.customUrl || '';

  if (!apiKey) {
    throw new Error('No API key configured. Open AI Settings and enter your API key.');
  }

  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);

  const endpoint = providerId === 'custom' ? customUrl : provider.url;
  if (!endpoint) throw new Error('No API endpoint configured.');

  const activeModel = model || provider.defaultModel;

  // ── Claude uses its own message format ──
  if (provider.type === 'claude') {
    return callClaude(endpoint, apiKey, activeModel, systemPrompt, userPrompt);
  }

  // ── All others use OpenAI-compatible format ──
  return callOpenAICompat(endpoint, apiKey, activeModel, systemPrompt, userPrompt, providerId);
};

async function callClaude(endpoint, apiKey, model, systemPrompt, userPrompt) {
  try {
    const response = await axios.post(endpoint, {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }, {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    return response.data.content?.[0]?.text || '';
  } catch (err) {
    throw new Error(`Claude API error: ${err.response?.data?.error?.message || err.message}`);
  }
}

async function callOpenAICompat(endpoint, apiKey, model, systemPrompt, userPrompt, providerId) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  // OpenRouter requires extra headers
  if (providerId === 'openrouter') {
    headers['HTTP-Referer'] = 'https://braindeck.app';
    headers['X-Title'] = 'BrainDeck';
  }

  try {
    const response = await axios.post(endpoint, {
      model,
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }, { timeout: 60000, headers });

    return response.data.choices?.[0]?.message?.content || '';
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    throw new Error(`${PROVIDERS[providerId]?.name || 'API'} error: ${msg}`);
  }
}

module.exports = { generateWithCloud, PROVIDERS };
