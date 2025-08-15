require('dotenv').config();

module.exports = {
  // GoLogin API Configuration
  gologin: {
    apiToken: process.env.GOLOGIN_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODlmMDM5MGMxYTFjNGQxOGZkMDNiMmUiLCJ0eXBlIjoiZGV2Iiwiand0aWQiOiI2ODlmMDNkOTEyNmIwMjA3NzNiNWY4MmQifQ.ijk2DMdGDqdfqiMGlv6SWEM3_7fs7LIrGWhKHb_bngw',
    baseUrl: 'https://gologin.com/api',
    profileName: 'YouTube Bot Profile',
    // Reuse created profiles instead of creating/deleting each run
    reuseProfiles: true,
    // Directory to store per-account profile metadata
    profilesDir: './profiles'
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
    viewport: { width: 1920, height: 1080 },
    // If true, forces Puppeteer viewport to the value above; if false, leaves viewport as-is
    enforceViewport: false,
    // Window control: 'none' to not force OS window size, 'custom' to apply windowBounds below via CDP
    windowControl: 'none',
    // Only used when windowControl === 'custom'
    windowBounds: { width: 1280, height: 800, left: 0, top: 0 }
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