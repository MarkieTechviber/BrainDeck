// server/middleware/requestLogger.js
const morgan = require('morgan');

const requestLogger = morgan(':method :url :status :response-time ms - :res[content-length]');

module.exports = requestLogger;
