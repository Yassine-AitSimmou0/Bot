require('dotenv').config();

module.exports = {
  // GoLogin API Configuration
  gologin: {
    apiToken: process.env.GOLOGIN_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODlmMDM5MGMxYTFjNGQxOGZkMDNiMmUiLCJ0eXBlIjoiZGV2Iiwiand0aWQiOiI2ODlmMDNkOTEyNmIwMjA3NzNiNWY4MmQifQ.ijk2DMdGDqdfqiMGlv6SWEM3_7fs7LIrGWhKHb_bngw',
    baseUrl: 'https://gologin.com/api',
    profileName: 'YouTube Bot Profile',
    // Create fresh profiles for each run (better for multi-channel workflow)
    reuseProfiles: false,
    // Directory to store per-account profile metadata
    profilesDir: './profiles',
    // Proxy Configuration
    proxy: {
      enabled: true,
      // Use free US proxies when creating profiles
      useFreeProxies: true,
      // Default country for free proxies
      defaultCountry: 'us',
      // Proxy type: 'dataCenter', 'residential', 'mobile'
      proxyType: 'dataCenter',
      // Retry attempts for proxy assignment
      retryAttempts: 3
    }
  },

  // YouTube Configuration
  youtube: {
    uploadDelay: 30000, // 30 seconds between uploads
    videosPerChannel: 3, // Upload 3 videos per channel
    channelsPerAccount: 2, // Create 2 channels per Gmail account
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
    viewport: { width: 1366, height: 768 },
    // If true, forces Puppeteer viewport to the value above; if false, leaves viewport as-is
    enforceViewport: true,
    // Window control: 'none' to not force OS window size, 'custom' to apply windowBounds below via CDP
    windowControl: 'custom',
    // GoLogin browser window settings
    windowBounds: { width: 1366, height: 768, left: 100, top: 50 }
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