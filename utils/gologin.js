const { GologinApi } = require('gologin');
const { logger } = require('./logger');
const config = require('../config');

class GoLoginAPI {
  constructor() {
    this.apiToken = config.gologin.apiToken;
    this.gologin = GologinApi({
      token: this.apiToken
    });
  }

  // Test API connection using the official SDK
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
      logger.error('Failed to test GoLogin API connection:', error.message);
      throw error;
    }
  }

  // Create a new GoLogin profile using the official SDK
  async createProfile(email) {
    try {
      // Use the official SDK's random fingerprint creation
      const profile = await this.gologin.createProfileRandomFingerprint();
      const profileId = profile.id;
      
      // Skip proxy for now due to API issues
      // await this.gologin.addGologinProxyToProfile(profileId, 'US');

      logger.info(`Created GoLogin profile for ${email}: ${profileId}`);
      return profileId;
    } catch (error) {
      logger.error(`Failed to create GoLogin profile for ${email}:`, error.message);
      throw error;
    }
  }

  // Delete profile using the official SDK
  async deleteProfile(profileId) {
    try {
      await this.gologin.deleteProfile(profileId);
      logger.info(`Deleted profile ${profileId}`);
    } catch (error) {
      logger.error(`Failed to delete profile ${profileId}:`, error.message);
      throw error;
    }
  }

  // Launch browser using the official SDK
  async launchBrowser(profileId) {
    try {
      const { browser } = await this.gologin.launch({ profileId });
      logger.info(`Launched browser for profile ${profileId}`);
      return browser;
    } catch (error) {
      logger.error(`Failed to launch browser for profile ${profileId}:`, error.message);
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