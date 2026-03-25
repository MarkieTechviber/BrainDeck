// server/utils/responseUtils.js

const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const sendError = (res, message = 'An error occurred', statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { sendSuccess, sendError };
