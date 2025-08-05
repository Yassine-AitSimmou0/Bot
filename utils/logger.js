const winston = require('winston');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');

// Ensure logs directory exists
fs.ensureDirSync(config.logging.logFolder);

// Create custom format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(config.logging.logFolder, config.logging.logFile),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Error file transport
    new winston.transports.File({
      filename: path.join(config.logging.logFolder, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Helper function to create account-specific loggers
function createAccountLogger(email) {
  const accountLogFile = path.join(config.logging.logFolder, `${email.replace('@', '_at_')}.log`);
  
  return winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    transports: [
      new winston.transports.File({
        filename: accountLogFile,
        maxsize: 5242880,
        maxFiles: 3
      })
    ]
  });
}

module.exports = {
  logger,
  createAccountLogger
}; 