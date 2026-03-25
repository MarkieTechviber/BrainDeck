// server/middleware/errorHandler.js
const { sendError } = require('../utils/responseUtils');

const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File size exceeds the maximum allowed limit (20MB).', 413);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return sendError(res, 'Unexpected file field in upload.', 400);
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred.'
    : (err.message || 'Internal server error');

  return sendError(res, message, statusCode);
};

module.exports = errorHandler;
