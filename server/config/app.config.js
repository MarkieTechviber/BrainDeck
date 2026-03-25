// server/config/app.config.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'BrainDeck',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
