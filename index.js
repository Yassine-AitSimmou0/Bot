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
    this.stopRequested = false;
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
      
      // Set viewport and other browser settings (optional, configurable)
      if (config.browser.enforceViewport) {
        await this.page.setViewport(config.browser.viewport);
      }
      await this.page.setDefaultTimeout(config.browser.defaultTimeout);

      // Optionally control native window size via CDP
      if (config.browser.windowControl === 'custom') {
        try {
          const client = await this.page.target().createCDPSession();
          const { width, height, left, top } = config.browser.windowBounds;
          await client.send('Browser.setWindowBounds', {
            windowId: 1,
            bounds: { left, top, width, height, windowState: 'normal' }
          });
        } catch (e) {
          logger.warn(`Could not set custom window bounds: ${e.message}`);
        }
      }
      
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
      // Check if stop was requested
      if (this.stopRequested) {
        logger.info(`[${account.email}] Stop requested, halting account processing`);
        return false;
      }
      
      const profileLogger = new ProfileLogger(account.email, `attempt_${attempt}`);
      let profileId = null;
      let success = false;
      let uploadSuccess = false;

      try {
        logger.info(`[${account.email}] Attempt ${attempt}/${maxRetries}`);
        
        // Create or reuse GoLogin profile
        const envProfileId = process.env.GOLOGIN_PROFILE_ID;
        if (account.profileId) {
          profileId = account.profileId;
          logger.info(`[${account.email}] Reusing provided GoLogin profile: ${profileId}`);
          profileLogger.logStep('profileReused', true, { profileId });
        } else if (envProfileId) {
          profileId = envProfileId;
          logger.info(`[${account.email}] Reusing GoLogin profile from env: ${profileId}`);
          profileLogger.logStep('profileReused_env', true, { profileId });
        } else {
          profileId = await this.gologin.createProfile(account.email);
          profileLogger.logStep('profileCreated', true, { profileId });
        }
        
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
        
        // Process multiple channels per account
        let totalUploadedVideos = 0;
        
        for (let channelIndex = 1; channelIndex <= config.youtube.channelsPerAccount; channelIndex++) {
          logger.info(`[${account.email}] Creating and processing channel ${channelIndex}/${config.youtube.channelsPerAccount}`);
          
          // Create YouTube channel
          await this.retryOperation(
            () => youtubeBot.createYouTubeChannel(channelIndex),
            `Channel ${channelIndex} creation`,
            profileLogger
          );
          profileLogger.logStep(`channel${channelIndex}Created`, true);
          
          // Upload videos to this channel
          try {
            const uploadedCount = await youtubeBot.uploadMultipleVideos(config.youtube.videosPerChannel);
            logger.info(`[${account.email}] Channel ${channelIndex}: Uploaded ${uploadedCount}/${config.youtube.videosPerChannel} videos`);
            
            totalUploadedVideos += uploadedCount;
            profileLogger.logStep(`channel${channelIndex}VideosUploaded`, true, { uploadedCount });
            
          } catch (uploadError) {
            profileLogger.logStep(`channel${channelIndex}VideosUploaded`, false, { error: uploadError.message });
            logger.error(`[${account.email}] Channel ${channelIndex} video upload failed:`, uploadError.message);
          }
          
          // Small delay between channels
          if (channelIndex < config.youtube.channelsPerAccount) {
            logger.info(`[${account.email}] Waiting before creating next channel...`);
            await this.human.randomDelay(5000, 10000);
          }
        }
        
        // Mark as success if any videos were uploaded
        if (totalUploadedVideos > 0) {
          uploadSuccess = true;
          logger.info(`[${account.email}] Total uploaded videos across all channels: ${totalUploadedVideos}`);
        } else {
          logger.warn(`[${account.email}] No videos were uploaded across any channels`);
        }
        
        // Save session cookies
        await youtubeBot.saveCookies();
        
        success = true;
        profileLogger.complete(true);
        
        if (uploadSuccess) {
          logger.info(`[${account.email}] Successfully completed processing with video uploads`);
        } else {
          logger.info(`[${account.email}] Completed processing but no videos were uploaded`);
        }
        
        return uploadSuccess; // Return true only if videos were uploaded successfully
        
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
        
        // Delete GoLogin profile (skipped when reuseProfiles is enabled or when provided by account/env)
        if (profileId) {
          try {
            await this.gologin.deleteProfile(profileId);
            if (!config.gologin.reuseProfiles && !account.profileId && !process.env.GOLOGIN_PROFILE_ID) {
              logger.info(`[${account.email}] Deleted GoLogin profile: ${profileId}`);
            }
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
        // Check if stop was requested
        if (this.stopRequested) {
          logger.info('Stop requested, halting bot execution');
          break;
        }
        
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
          if (i < this.accounts.length - 1 && !this.stopRequested) {
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
      this.stopRequested = true;
      
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