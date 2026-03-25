// server/server.js
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const path         = require('path');
const axios        = require('axios');
const cookieParser = require('cookie-parser');

const appConfig     = require('./config/app.config');
const passport      = require('./config/passport');
const session        = require('express-session');
const aiConfig      = require('./config/ai.config');
const requestLogger = require('./middleware/requestLogger');
const errorHandler  = require('./middleware/errorHandler');
const { PROVIDERS } = require('./services/cloudService');

const uploadRoutes  = require('./routes/upload');
const generateRoutes= require('./routes/generate');
const cardsRoutes   = require('./routes/cards');
const authRoutes    = require('./routes/auth');
const oauthRoutes   = require('./routes/oauth');
const deckRoutes    = require('./routes/decks');
const pushRoutes    = require('./routes/push');
const libraryRoutes = require('./routes/library');

const app = express();

// ── MySQL / Sequelize ──────────────────────
const { syncDB } = require('./models/index');
syncDB().then(() => {
  const { startScheduler } = require('./services/notificationScheduler');
  startScheduler();
});

// ── Middleware ─────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: appConfig.nodeEnv === 'production' ? appConfig.corsOrigin : '*',
  methods: ['GET','POST','PATCH','DELETE','PUT'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));
app.use(requestLogger);
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'braindeck-session-CHANGE-ME',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 5 * 60 * 1000 }, // 5min — just for OAuth handshake
}));
app.use(passport.initialize());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ─────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/auth',     oauthRoutes);
app.use('/api/decks',    deckRoutes);
app.use('/api/push',     pushRoutes);
app.use('/api/library',  libraryRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/cards',    cardsRoutes);

// ── Test Connection ────────────────────────────
app.post('/api/test-connection', async (req, res) => {
  const { provider, apiKey, model, customUrl } = req.body;
  if (!provider || !apiKey) {
    return res.status(400).json({ success: false, message: 'provider and apiKey are required.' });
  }

  const ENDPOINTS = {
    claude:     { url: 'https://api.anthropic.com/v1/messages',                                        type: 'claude'  },
    openai:     { url: 'https://api.openai.com/v1/chat/completions',                                   type: 'openai'  },
    groq:       { url: 'https://api.groq.com/openai/v1/chat/completions',                              type: 'openai'  },
    mistral:    { url: 'https://api.mistral.ai/v1/chat/completions',                                   type: 'openai'  },
    gemini:     { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',     type: 'openai'  },
    together:   { url: 'https://api.together.xyz/v1/chat/completions',                                 type: 'openai'  },
    openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions',                               type: 'openai'  },
    custom:     { url: customUrl || '',                                                                 type: 'openai'  },
  };

  const cfg = ENDPOINTS[provider];
  if (!cfg || !cfg.url) {
    return res.status(400).json({ success: false, message: 'Unknown provider or missing custom URL.' });
  }

  const DEFAULT_MODELS = {
    claude: 'claude-haiku-4-5-20251001', openai: 'gpt-4o-mini', groq: 'llama-3.1-8b-instant',
    mistral: 'mistral-small-latest', gemini: 'gemini-1.5-flash', together: 'meta-llama/Llama-3-8b-chat-hf',
    openrouter: 'openai/gpt-4o-mini', custom: model || 'gpt-3.5-turbo',
  };
  const testModel = model || DEFAULT_MODELS[provider] || 'gpt-3.5-turbo';

  try {
    let response;

    if (cfg.type === 'claude') {
      response = await axios.post(cfg.url, {
        model: testModel,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }],
      }, {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        timeout: 8000,
      });
    } else {
      response = await axios.post(cfg.url, {
        model: testModel,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }],
      }, {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 8000,
      });
    }

    if (response.status === 200) {
      const { PROVIDERS: P } = require('./services/cloudService');
      const pName = (P[provider] || {}).name || provider;
      return res.json({ success: true, message: `${pName} API key is valid.` });
    }
    return res.json({ success: false, message: `Unexpected status: ${response.status}` });

  } catch (err) {
    const status  = err.response?.status;
    const errData = err.response?.data;
    let message = 'Connection failed.';

    if (status === 401 || status === 403) message = 'Invalid API key — authentication failed.';
    else if (status === 429) message = 'Rate limit reached — but key is valid!';
    else if (status === 400) message = 'Bad request — but key is likely valid.';
    else if (err.code === 'ECONNABORTED') message = 'Request timed out — check your network.';
    else if (errData?.error?.message) message = errData.error.message;

    // 429 = rate limited but key works
    const isValid = status === 429 || status === 400;
    return res.json({ success: isValid, message });
  }
});


app.get('/api/health', (req, res) => {
  const state = global.cloudProviderState || {};
  res.json({ status:'OK', app: appConfig.appName, version:'1.0.0',
    environment: appConfig.nodeEnv, aiMode: global.aiModeOverride || aiConfig.mode,
    provider: state.provider || 'claude', 
    timestamp: new Date().toISOString() });
});

// ── AI Mode ────────────────────────────────
app.get('/api/ai-mode', (req, res) => {
  const state = global.cloudProviderState || {};
  res.json({ success:true, mode: global.aiModeOverride || aiConfig.mode,
    provider: state.provider || 'claude', model: state.model || '',
    ollamaModel: global.ollamaModelOverride || aiConfig.ollama.model, hasKey: !!(state.apiKey),
    providers: Object.entries(PROVIDERS).map(([id,p]) => ({ id, name:p.name, models:p.models, defaultModel:p.defaultModel })) });
});

app.post('/api/ai-mode', (req, res) => {
  const { mode, provider, apiKey, model, customUrl, ollamaModel } = req.body;
  if (!['local','cloud'].includes(mode)) return res.status(400).json({ success:false, message:'mode must be "local" or "cloud"' });
  if (mode === 'cloud') {
    const key = apiKey || (global.cloudProviderState?.apiKey) || '';
    if (!key) return res.status(400).json({ success:false, message:'Please enter an API key.' });
    global.cloudProviderState = { provider: provider||'claude', apiKey: key, model: model||'', customUrl: customUrl||'' };
  }
  global.aiModeOverride = mode;
  if (ollamaModel) global.ollamaModelOverride = ollamaModel;
  const state = global.cloudProviderState || {};
  res.json({ success:true, mode, provider: state.provider||'', model: state.model||'', ollamaModel: global.ollamaModelOverride || aiConfig.ollama.model });
});

app.get('/api/ollama/models', async (req, res) => {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  try {
    const r = await axios.get(`${ollamaUrl}/api/tags`, { timeout:4000 });
    res.json({ success:true, models: (r.data.models||[]).map(m=>({ name:m.name, size:m.size })), ollamaUrl });
  } catch { res.json({ success:false, models:[], error:'Ollama not reachable — is it running?' }); }
});

// ── Catch-all ──────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.use(errorHandler);

app.listen(appConfig.port, () => {
  console.log(`\n==========================================`);
  console.log(` ${appConfig.appName} Server Running`);
  console.log(`==========================================`);
  console.log(` Port : ${appConfig.port}  |  http://localhost:${appConfig.port}`);
  console.log(`==========================================\n`);
});

module.exports = app;
