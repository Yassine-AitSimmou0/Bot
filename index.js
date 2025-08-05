const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');
const { logger, createAccountLogger } = require('./utils/logger');
const GoLoginAPI = require('./utils/gologin');
const YouTubeAutomation = require('./utils/youtubeAutomation');
const ProfileLogger = require('./utils/profileLogger');

class YouTubeBot {
  constructor() {
    this.gologin = new GoLoginAPI();
    this.browser = null;
    this.page = null;
    this.accounts = [];
    this.currentAccountIndex = 0;
  }

  // Initialize the bot
  async initialize() {
    try {
      logger.info('Initializing YouTube Automation Bot...');
      
      // Load Gmail accounts
      await this.loadAccounts();
      
      // Create necessary directories
      await this.createDirectories();
      
      logger.info(`Loaded ${this.accounts.length} Gmail accounts`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize bot:', error.message);
      throw error;
    }
  }

  // Load Gmail accounts from file
  async loadAccounts() {
    try {
      const accountsFile = config.gmail.accountsFile;
      if (!await fs.pathExists(accountsFile)) {
        throw new Error(`Accounts file not found: ${accountsFile}`);
      }

      this.accounts = await fs.readJson(accountsFile);
      if (!Array.isArray(this.accounts) || this.accounts.length === 0) {
        throw new Error('No accounts found in accounts file');
      }

      logger.info(`Loaded ${this.accounts.length} accounts from ${accountsFile}`);
    } catch (error) {
      logger.error('Failed to load accounts:', error.message);
      throw error;
    }
  }

  // Create necessary directories
  async createDirectories() {
    const directories = [
      config.logging.logFolder,
      './profiles',
      config.youtube.videoFolder,
      './logs'
    ];

    for (const dir of directories) {
      await fs.ensureDir(dir);
    }
  }

  // Launch browser with GoLogin profile
  async launchBrowser(profileId) {
    try {
      // Use the official GoLogin SDK to launch the browser
      this.browser = await this.gologin.launchBrowser(profileId);
      this.page = await this.browser.newPage();
      
      // Set viewport and other browser settings
      await this.page.setViewport(config.browser.viewport);
      await this.page.setDefaultTimeout(config.browser.defaultTimeout);
      
      logger.info(`Browser launched successfully for profile ${profileId}`);
    } catch (error) {
      logger.error(`Failed to launch browser for profile ${profileId}:`, error.message);
      throw error;
    }
  }

  // Process a single Gmail account with retry logic
  async processAccount(account) {
    const maxRetries = 2;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const profileLogger = new ProfileLogger(account.email, `attempt_${attempt}`);
      let profileId = null;
      let success = false;

      try {
        logger.info(`[${account.email}] Attempt ${attempt}/${maxRetries}`);
        
        // Create GoLogin profile
        profileId = await this.gologin.createProfile(account.email);
        profileLogger.logStep('profileCreated', true, { profileId });
        
        // Launch browser with profile
        await this.launchBrowser(profileId);
        profileLogger.logStep('browserLaunched', true);
        
        // Initialize YouTube automation
        const youtubeBot = new YouTubeAutomation(this.page, profileLogger);
        
        // Login to Gmail with retry
        const loginSuccess = await this.retryOperation(
          () => youtubeBot.loginToGmail(account.email, account.password),
          'Gmail login',
          profileLogger
        );
        
        if (!loginSuccess) {
          throw new Error('Gmail login failed after retries');
        }
        profileLogger.logStep('gmailLogin', true);
        
        // Navigate to YouTube
        await this.retryOperation(
          () => youtubeBot.goToYouTube(),
          'YouTube navigation',
          profileLogger
        );
        profileLogger.logStep('youtubeNavigation', true);
        
        // Create YouTube channel
        await this.retryOperation(
          () => youtubeBot.createYouTubeChannel(),
          'Channel creation',
          profileLogger
        );
        profileLogger.logStep('channelCreated', true);
        
        // Upload videos
        const uploadedCount = await youtubeBot.uploadMultipleVideos();
        logger.info(`[${account.email}] Uploaded ${uploadedCount} videos successfully`);
        
        // Save session cookies
        await youtubeBot.saveCookies();
        
        success = true;
        profileLogger.complete(true);
        logger.info(`[${account.email}] Successfully completed processing`);
        return true;
        
      } catch (error) {
        lastError = error;
        profileLogger.logError(error, 'main_process');
        profileLogger.complete(false);
        logger.error(`[${account.email}] Attempt ${attempt} failed:`, error.message);
        
        // Save error information
        await this.saveErrorInfo(account.email, error.message, attempt);
      } finally {
        // Clean up
        if (this.browser) {
          try {
            await this.browser.close();
            this.browser = null;
            this.page = null;
          } catch (error) {
            profileLogger.logError(error, 'browser_cleanup');
          }
        }
        
        // Delete GoLogin profile
        if (profileId) {
          try {
            await this.gologin.deleteProfile(profileId);
            logger.info(`[${account.email}] Deleted GoLogin profile: ${profileId}`);
          } catch (error) {
            profileLogger.logError(error, 'profile_cleanup');
          }
        }
        
        // Clean up GoLogin resources
        try {
          await this.gologin.exit();
        } catch (error) {
          profileLogger.logError(error, 'gologin_cleanup');
        }
      }
      
      // Wait before retry (if not the last attempt)
      if (attempt < maxRetries) {
        const retryDelay = Math.floor(Math.random() * 60000) + 30000; // 30-90 seconds
        logger.info(`[${account.email}] Waiting ${Math.floor(retryDelay / 1000)} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    logger.error(`[${account.email}] All ${maxRetries} attempts failed. Last error:`, lastError.message);
    return false;
  }

  // Retry operation with exponential backoff
  async retryOperation(operation, operationName, profileLogger, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        profileLogger.logError(error, `${operationName}_attempt_${attempt}`);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff
        logger.warn(`[${profileLogger.email}] ${operationName} attempt ${attempt} failed, retrying in ${Math.floor(delay / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Save error information
  async saveErrorInfo(email, errorMessage, attempt = 1) {
    try {
      const errorFile = `./logs/errors_${email.replace('@', '_at_')}_attempt_${attempt}.json`;
      const errorInfo = {
        email,
        attempt,
        timestamp: new Date().toISOString(),
        error: errorMessage
      };
      
      await fs.writeJson(errorFile, errorInfo, { spaces: 2 });
    } catch (error) {
      logger.error('Failed to save error info:', error.message);
    }
  }

  // Run the main bot process
  async run() {
    try {
      logger.info('Starting YouTube Automation Bot...');
      
      // Initialize bot
      await this.initialize();
      
      let successCount = 0;
      let failureCount = 0;
      
      // Process each account
      for (let i = 0; i < this.accounts.length; i++) {
        const account = this.accounts[i];
        logger.info(`Processing account ${i + 1}/${this.accounts.length}: ${account.email}`);
        
        try {
          const success = await this.processAccount(account);
          if (success) {
            successCount++;
          } else {
            failureCount++;
          }
          
                     // Delay between accounts (5-10 minutes as per advice)
           if (i < this.accounts.length - 1) {
             const delayTime = Math.floor(Math.random() * 300000) + 300000; // 5-10 minutes
             logger.info(`Waiting ${Math.floor(delayTime / 60000)} minutes before next account...`);
             await new Promise(resolve => setTimeout(resolve, delayTime));
           }
          
        } catch (error) {
          logger.error(`Failed to process account ${account.email}:`, error.message);
          failureCount++;
        }
      }
      
      // Final summary
      logger.info('=== BOT COMPLETION SUMMARY ===');
      logger.info(`Total accounts processed: ${this.accounts.length}`);
      logger.info(`Successful: ${successCount}`);
      logger.info(`Failed: ${failureCount}`);
      logger.info(`Success rate: ${((successCount / this.accounts.length) * 100).toFixed(2)}%`);
      
    } catch (error) {
      logger.error('Bot execution failed:', error.message);
      throw error;
    }
  }

  // Stop the bot
  async stop() {
    try {
      logger.info('Stopping YouTube Automation Bot...');
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
      
      logger.info('Bot stopped successfully');
    } catch (error) {
      logger.error('Failed to stop bot:', error.message);
    }
  }
}

// Main execution
async function main() {
  const bot = new YouTubeBot();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });
  
  try {
    await bot.run();
  } catch (error) {
    logger.error('Bot execution failed:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = YouTubeBot; 