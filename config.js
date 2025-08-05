require('dotenv').config();

module.exports = {
  // GoLogin API Configuration
  gologin: {
    apiToken: process.env.GOLOGIN_API_TOKEN,
    baseUrl: 'https://gologin.com/api',
    profileName: 'YouTube Bot Profile'
  },

  // YouTube Configuration
  youtube: {
    uploadDelay: 30000, // 30 seconds between uploads
    maxVideosPerChannel: 1, // Start with 1 video for testing
    videoFolder: './videos',
    metadataFile: './video-metadata.json'
  },

  // Gmail Configuration
  gmail: {
    accountsFile: './accounts.json',
    loginDelay: 2000,
    typingDelay: 100
  },

  // Browser Configuration
  browser: {
    headless: false,
    slowMo: 50,
    defaultTimeout: 30000,
    viewport: { width: 1920, height: 1080 }
  },

  // Logging Configuration
  logging: {
    level: 'info',
    logFolder: './logs',
    logFile: 'bot.log'
  },

  // Human Behavior Simulation
  humanBehavior: {
    minDelay: 1000,
    maxDelay: 3000,
    mouseMovementSpeed: 0.5,
    typingSpeed: { min: 50, max: 150 }
  }
}; 