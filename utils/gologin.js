const { GologinApi } = require('gologin');
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
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
      if (error.message.includes('free API requests limit') || error.message.includes('subscribe')) {
        logger.warn('GoLogin API limit reached, Gmail typing will use fallback mode for better compatibility');
        return 'typing_fallback'; // Special mode: GoLogin works but use fallback for typing
      }
      logger.error('GoLogin API failed, will use fallback mode:', error.message);
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
        
        // Add free US proxy if enabled in config
        const config = require('../config');
        if (config.gologin.proxy.enabled && config.gologin.proxy.useFreeProxies) {
          await this.addFreeProxyToProfile(profileId, email);
        }

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

  // Add free US proxy to a GoLogin profile
  async addFreeProxyToProfile(profileId, email) {
    const config = require('../config');
    const maxRetries = config.gologin.proxy.retryAttempts || 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[${email}] Adding free ${config.gologin.proxy.defaultCountry.toUpperCase()} proxy to profile (attempt ${attempt}/${maxRetries})`);
        
        // Use GoLogin SDK to add free proxy
        await this.gologin.addGologinProxyToProfile(
          profileId, 
          config.gologin.proxy.defaultCountry, 
          config.gologin.proxy.proxyType
        );
        
        logger.info(`[${email}] ✅ Successfully added free US proxy to profile ${profileId}`);
        return true;
        
      } catch (proxyError) {
        logger.warn(`[${email}] Proxy assignment attempt ${attempt} failed: ${proxyError.message}`);
        
        if (attempt === maxRetries) {
          // Log warning but don't fail the entire profile creation
          logger.warn(`[${email}] ⚠️ Failed to add proxy after ${maxRetries} attempts. Profile will continue without proxy.`);
          logger.warn(`[${email}] Proxy error details: ${proxyError.message}`);
          
          // Check for specific error types
          if (proxyError.message.includes('free API requests limit') || proxyError.message.includes('limit exceeded')) {
            logger.warn(`[${email}] 💡 Free proxy limit reached. Consider upgrading GoLogin plan for more proxies.`);
          } else if (proxyError.message.includes('country not available') || proxyError.message.includes('us')) {
            logger.warn(`[${email}] 💡 US proxies may not be available in free tier. Profile will work without proxy.`);
          } else if (proxyError.message.includes('403') || proxyError.message.includes('401')) {
            logger.warn(`[${email}] 💡 Authentication issue with proxy API. Check GoLogin API token permissions.`);
          }
          
          return false;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
    
    return false;
  }

  // Test proxy connectivity for a profile
  async testProxyConnection(profileId, email) {
    try {
      logger.info(`[${email}] Testing proxy connection for profile ${profileId}`);
      
      // Launch browser with the profile
      const { browser } = await this.gologin.launch({ profileId });
      const page = await browser.newPage();
      
      try {
        // Navigate to IP checking service
        await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle2', timeout: 15000 });
        
        // Get the IP information
        const ipInfo = await page.evaluate(() => {
          const pre = document.querySelector('pre');
          return pre ? JSON.parse(pre.textContent) : null;
        });
        
        if (ipInfo && ipInfo.origin) {
          logger.info(`[${email}] ✅ Proxy connection successful. IP: ${ipInfo.origin}`);
          return { success: true, ip: ipInfo.origin };
        } else {
          logger.warn(`[${email}] ⚠️ Could not detect IP address`);
          return { success: false, error: 'No IP detected' };
        }
        
      } finally {
        await browser.close();
      }
      
    } catch (error) {
      logger.warn(`[${email}] Proxy test failed: ${error.message}`);
      return { success: false, error: error.message };
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
      
      const config = require('../config');
      
      // Launch with window sizing options
      const launchOptions = {
        profileId,
        args: [
          `--window-size=${config.browser.windowBounds.width},${config.browser.windowBounds.height}`,
          `--window-position=${config.browser.windowBounds.left},${config.browser.windowBounds.top}`,
          '--start-maximized',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      };
      
      const { browser } = await this.gologin.launch(launchOptions);
      logger.info(`Launched GoLogin browser for profile ${profileId} with window size ${config.browser.windowBounds.width}x${config.browser.windowBounds.height}`);
      return browser;
    } catch (error) {
      logger.warn(`Failed to launch GoLogin browser for profile ${profileId}, using fallback: ${error.message}`);
      return await this.launchFallbackBrowser();
    }
  }

  // Launch regular Puppeteer browser as fallback
  async launchFallbackBrowser() {
    try {
      const config = require('../config');
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
          `--window-size=${config.browser.windowBounds.width},${config.browser.windowBounds.height}`,
          `--window-position=${config.browser.windowBounds.left},${config.browser.windowBounds.top}`,
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null
      });
      
      logger.info(`Launched fallback Puppeteer browser with window size ${config.browser.windowBounds.width}x${config.browser.windowBounds.height}`);
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