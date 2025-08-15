const { GologinApi } = require('gologin');
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const { logger } = require('./logger');
const config = require('../config');

class GoLoginAPI {
  constructor() {
    // Clear caches to ensure fresh token load
    delete require.cache[require.resolve('dotenv')];
    delete require.cache[require.resolve('../config')];
    
    // Load fresh environment and config
    require('dotenv').config({ override: true });
    const config = require('../config');
    
    this.apiToken = config.gologin.apiToken;
    this.gologin = GologinApi({
      token: this.apiToken
    });
    this.reuseProfiles = !!config.gologin.reuseProfiles;
    this.profilesDir = config.gologin.profilesDir || './profiles';
  }

  // Test API connection using the official SDK with fallback
  async testConnection() {
    try {
      // Test by creating a temporary profile and then deleting it
      const profile = await this.gologin.createProfileRandomFingerprint();
      const profileId = profile.id;
      
      // Skip proxy test for now due to API issues
      
      // Delete the test profile
      await this.gologin.deleteProfile(profileId);
      
      logger.info(`✅ GoLogin API connection successful - Test profile created and deleted`);
      return true;
    } catch (error) {
      logger.error('GoLogin API failed, will use fallback mode:', error.message);
      // Don't throw error - we'll use fallback mode
      return false;
    }
  }

  // Create a new GoLogin profile using the official SDK with fallback
  async createProfile(email) {
    try {
      if (this.reuseProfiles) {
        const savedPath = path.join(this.profilesDir, `${email.replace(/[@:]/g, '_')}.json`);
        if (await fs.pathExists(savedPath)) {
          const saved = await fs.readJson(savedPath);
          if (saved && saved.profileId) {
            logger.info(`Reusing existing GoLogin profile for ${email}: ${saved.profileId}`);
            return saved.profileId;
          }
        }
      }
      
      try {
        // Use the official SDK's random fingerprint creation
        const profile = await this.gologin.createProfileRandomFingerprint();
        const profileId = profile.id;
        
        // Skip proxy for now due to API issues
        // await this.gologin.addGologinProxyToProfile(profileId, 'US');

        logger.info(`Created GoLogin profile for ${email}: ${profileId}`);
        if (this.reuseProfiles) {
          const savedPath = path.join(this.profilesDir, `${email.replace(/[@:]/g, '_')}.json`);
          await fs.ensureDir(this.profilesDir);
          await fs.writeJson(savedPath, { email, profileId, createdAt: new Date().toISOString() }, { spaces: 2 });
        }
        return profileId;
      } catch (apiError) {
        // Test with latest token and provide detailed error info
        logger.warn(`GoLogin API failed for ${email}: ${apiError.message}`);
        console.log(`🔍 Testing API token: ${this.apiToken.substring(0, 20)}...`);
        console.log(`❌ API Error: ${apiError.message}`);
        
        if (apiError.message.includes('free API requests limit')) {
          console.log('💡 This appears to be a free tier limit issue');
        } else if (apiError.message.includes('403')) {
          console.log('💡 403 Forbidden - Token may be invalid or expired');
        } else if (apiError.message.includes('401')) {
          console.log('💡 401 Unauthorized - Token authentication failed');
        }
        
        // Fallback to local profile mode for testing
        const fallbackId = `fallback_${email.replace(/[@:]/g, '_')}_${Date.now()}`;
        logger.info(`Creating fallback profile for testing: ${fallbackId}`);
        return fallbackId;
      }
    } catch (error) {
      logger.error(`Failed to create profile for ${email}:`, error.message);
      throw error;
    }
  }

  // Delete profile using the official SDK
  async deleteProfile(profileId) {
    try {
      if (this.reuseProfiles) {
        // Skip deletion when reusing profiles
        logger.info(`Profile reuse enabled, not deleting profile ${profileId}`);
        return;
      }
      
      // Check if this is a fallback profile
      if (profileId.startsWith('fallback_')) {
        logger.info(`Fallback profile ${profileId} - no deletion needed`);
        return;
      }
      
      await this.gologin.deleteProfile(profileId);
      logger.info(`Deleted profile ${profileId}`);
    } catch (error) {
      logger.warn(`Failed to delete profile ${profileId}:`, error.message);
      // Don't throw error for deletion failures
    }
  }

  // Launch browser using the official SDK with fallback
  async launchBrowser(profileId) {
    try {
      // Check if this is a fallback profile
      if (profileId.startsWith('fallback_')) {
        logger.info(`Launching fallback browser for profile ${profileId}`);
        return await this.launchFallbackBrowser();
      }
      
      const { browser } = await this.gologin.launch({ profileId });
      logger.info(`Launched browser for profile ${profileId}`);
      return browser;
    } catch (error) {
      logger.warn(`Failed to launch GoLogin browser for profile ${profileId}, using fallback: ${error.message}`);
      return await this.launchFallbackBrowser();
    }
  }

  // Launch regular Puppeteer browser as fallback
  async launchFallbackBrowser() {
    try {
      const userDataDir = path.join(this.profilesDir, 'fallback_profile');
      await fs.ensureDir(userDataDir);
      
      const browser = await puppeteer.launch({
        headless: false,
        userDataDir,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null
      });
      
      logger.info('Launched fallback Puppeteer browser successfully');
      return browser;
    } catch (error) {
      logger.error('Failed to launch fallback browser:', error.message);
      throw error;
    }
  }

  // Clean up resources
  async exit() {
    try {
      await this.gologin.exit();
      logger.info('GoLogin resources cleaned up');
    } catch (error) {
      logger.error('Failed to clean up GoLogin resources:', error.message);
    }
  }
}

module.exports = GoLoginAPI; 