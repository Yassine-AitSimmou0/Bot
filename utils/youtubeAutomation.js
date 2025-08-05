const path = require('path');
const fs = require('fs-extra');
const HumanBehavior = require('./humanBehavior');
const config = require('../config');

class YouTubeAutomation {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
    this.human = new HumanBehavior(page);
  }

  // Navigate to YouTube
  async goToYouTube() {
    try {
      this.logger.info('Navigating to YouTube...');
      await this.page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded' });
      await this.human.waitForPageLoad();
      this.logger.info('Successfully navigated to YouTube');
    } catch (error) {
      this.logger.error('Failed to navigate to YouTube:', error.message);
      throw error;
    }
  }

  // Login to Gmail/Google account
  async loginToGmail(email, password) {
    try {
      this.logger.info(`Logging in to Gmail: ${email}`);
      
      // Go to Gmail login
      await this.page.goto('https://accounts.google.com/signin', { waitUntil: 'domcontentloaded' });
      await this.human.waitForPageLoad();

      // Check for captcha
      if (await this.human.checkForCaptcha()) {
        this.logger.warn('CAPTCHA detected during login!');
        
        // Log captcha if using ProfileLogger
        if (this.logger.logCaptcha) {
          this.logger.logCaptcha();
        }
        
        // Wait for manual intervention or implement captcha solving
        await this.human.randomDelay(10000, 20000);
      }

      // Enter email
      await this.human.fillFormField('input[type="email"]', email);
      await this.human.randomDelay(1000, 2000);
      
      // Click Next button for email
      const nextButton = await this.page.$('button[type="submit"], #identifierNext');
      if (nextButton) {
        await this.human.humanClick(nextButton);
      } else {
        await this.page.keyboard.press('Enter');
      }
      
      // Wait for password field
      await this.human.waitForElement('input[type="password"], input[name="password"]', 10000);
      await this.human.randomDelay(1000, 2000);

      // Enter password
      await this.human.fillFormField('input[type="password"], input[name="password"]', password);
      await this.human.randomDelay(1000, 2000);
      
      // Click Next button for password
      const passwordNextButton = await this.page.$('button[type="submit"], #passwordNext');
      if (passwordNextButton) {
        await this.human.humanClick(passwordNextButton);
      } else {
        await this.page.keyboard.press('Enter');
      }

      // Wait for login to complete
      await this.human.waitForPageLoad();
      await this.human.randomDelay(3000, 5000);
      
      // Verify login success
      const currentUrl = this.page.url();
      this.logger.info(`Current URL after login: ${currentUrl}`);
      
      // Check for successful login indicators
      const isLoggedIn = currentUrl.includes('myaccount.google.com') || 
                        currentUrl.includes('gmail.com') ||
                        currentUrl.includes('accounts.google.com') ||
                        await this.page.$('img[alt*="Profile"], .gb_d, .gb_e') !== null;
      
      if (isLoggedIn) {
        this.logger.info('Successfully logged in to Gmail');
        return true;
      } else {
        this.logger.error('Login failed - unexpected URL:', currentUrl);
        return false;
      }
    } catch (error) {
      this.logger.error('Failed to login to Gmail:', error.message);
      throw error;
    }
  }

  // Create YouTube channel
  async createYouTubeChannel() {
    try {
      this.logger.info('Creating YouTube channel...');
      
      // Go to YouTube Studio
      await this.page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
      await this.human.waitForPageLoad();

      // Check if channel already exists
      const channelExists = await this.page.$('a[href*="/channel/"]');
      if (channelExists) {
        this.logger.info('YouTube channel already exists');
        return true;
      }

      // Look for "Create channel" button
      const createChannelSelectors = [
        '[data-testid="create-channel-button"]',
        '.create-channel-button',
        'button[aria-label*="Create channel"]',
        'a[href*="create-channel"]'
      ];

      let createButton = null;
      for (const selector of createChannelSelectors) {
        createButton = await this.page.$(selector);
        if (createButton) break;
      }

      if (!createButton) {
        this.logger.info('No create channel button found - channel may already exist');
        return true;
      }

      await this.human.humanClick(createButton);
      await this.human.waitForPageLoad();

      // Handle channel creation form if it appears
      const channelNameInput = await this.page.$('input[name="channelName"]');
      if (channelNameInput) {
        const channelName = `Channel ${Date.now()}`;
        await this.human.fillFormField('input[name="channelName"]', channelName);
        await this.human.humanClick('button[type="submit"], button[aria-label*="Create"]');
        await this.human.waitForPageLoad();
      }

      this.logger.info('YouTube channel created successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to create YouTube channel:', error.message);
      throw error;
    }
  }

  // Upload video to YouTube
  async uploadVideo(videoPath, metadata = {}) {
    try {
      this.logger.info(`Uploading video: ${path.basename(videoPath)}`);
      
      // Go to YouTube Studio upload page
      await this.page.goto('https://studio.youtube.com/upload', { waitUntil: 'domcontentloaded' });
      await this.human.waitForPageLoad();

      // Upload file
      const fileInput = await this.page.$('input[type="file"]');
      if (!fileInput) {
        throw new Error('File input not found');
      }

      await this.human.uploadFile('input[type="file"]', videoPath);
      
      // Wait for upload to start
      await this.human.waitForElement('.upload-progress', 30000);
      this.logger.info('Video upload started');

      // Wait for upload to complete
      await this.page.waitForSelector('.upload-complete', { timeout: 300000 }); // 5 minutes
      this.logger.info('Video upload completed');

      // Fill in video details
      if (metadata.title) {
        await this.human.fillFormField('input[name="title"]', metadata.title);
      }

      if (metadata.description) {
        await this.human.fillFormField('textarea[name="description"]', metadata.description);
      }

      if (metadata.tags && metadata.tags.length > 0) {
        const tagsInput = await this.page.$('input[placeholder*="tag"]');
        if (tagsInput) {
          await this.human.fillFormField('input[placeholder*="tag"]', metadata.tags.join(', '));
        }
      }

      // Set visibility (default to private for safety)
      const visibilitySelector = metadata.visibility === 'public' ? 
        'input[value="public"]' : 'input[value="private"]';
      await this.human.humanClick(visibilitySelector);

      // Publish video
      await this.human.humanClick('button[type="submit"], button[aria-label*="Publish"]');
      await this.human.waitForPageLoad();

      this.logger.info(`Video uploaded successfully: ${path.basename(videoPath)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to upload video ${path.basename(videoPath)}:`, error.message);
      throw error;
    }
  }

  // Upload multiple videos
  async uploadMultipleVideos(videoFolder = config.youtube.videoFolder, maxVideos = config.youtube.maxVideosPerChannel) {
    try {
      this.logger.info(`Starting upload of up to ${maxVideos} videos`);

      // Get video files
      const videoFiles = await this.getVideoFiles(videoFolder);
      if (videoFiles.length === 0) {
        this.logger.warn('No video files found in folder:', videoFolder);
        return 0;
      }

      let uploadedCount = 0;
      for (let i = 0; i < Math.min(maxVideos, videoFiles.length); i++) {
        const videoPath = videoFiles[i];
        const metadata = await this.getVideoMetadata(videoPath);

        try {
          await this.uploadVideo(videoPath, metadata);
          uploadedCount++;
          
          // Log successful upload if using ProfileLogger
          if (this.logger.logVideoUpload) {
            this.logger.logVideoUpload(videoPath, true, { metadata });
          }
          
          // Delay between uploads
          if (i < Math.min(maxVideos, videoFiles.length) - 1) {
            this.logger.info(`Waiting ${config.youtube.uploadDelay / 1000} seconds before next upload...`);
            await this.human.randomDelay(config.youtube.uploadDelay, config.youtube.uploadDelay + 5000);
          }
        } catch (error) {
          this.logger.error(`Failed to upload video ${i + 1}:`, error.message);
          
          // Log failed upload if using ProfileLogger
          if (this.logger.logVideoUpload) {
            this.logger.logVideoUpload(videoPath, false, { error: error.message });
          }
          
          // Continue with next video
        }
      }

      this.logger.info(`Successfully uploaded ${uploadedCount} videos`);
      return uploadedCount;
    } catch (error) {
      this.logger.error('Failed to upload multiple videos:', error.message);
      throw error;
    }
  }

  // Get video files from folder
  async getVideoFiles(folderPath) {
    try {
      const files = await fs.readdir(folderPath);
      const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'];
      
      return files
        .filter(file => videoExtensions.some(ext => file.toLowerCase().endsWith(ext)))
        .map(file => path.join(folderPath, file));
    } catch (error) {
      this.logger.error('Failed to read video folder:', error.message);
      return [];
    }
  }

  // Get video metadata from JSON file
  async getVideoMetadata(videoPath) {
    try {
      const metadataFile = config.youtube.metadataFile;
      if (await fs.pathExists(metadataFile)) {
        const metadata = await fs.readJson(metadataFile);
        const videoName = path.basename(videoPath, path.extname(videoPath));
        return metadata[videoName] || {};
      }
    } catch (error) {
      this.logger.warn('Failed to load video metadata:', error.message);
    }
    
    // Return default metadata
    return {
      title: `Video ${Date.now()}`,
      description: 'Uploaded by YouTube Automation Bot',
      tags: ['automation', 'bot'],
      visibility: 'private'
    };
  }

  // Save session cookies
  async saveCookies() {
    try {
      const cookies = await this.page.context().cookies();
      const cookieFile = `./profiles/cookies_${Date.now()}.json`;
      await fs.ensureDir('./profiles');
      await fs.writeJson(cookieFile, cookies);
      this.logger.info('Session cookies saved');
      return cookieFile;
    } catch (error) {
      this.logger.error('Failed to save cookies:', error.message);
    }
  }

  // Load session cookies
  async loadCookies(cookieFile) {
    try {
      if (await fs.pathExists(cookieFile)) {
        const cookies = await fs.readJson(cookieFile);
        await this.page.context().addCookies(cookies);
        this.logger.info('Session cookies loaded');
        return true;
      }
    } catch (error) {
      this.logger.error('Failed to load cookies:', error.message);
    }
    return false;
  }
}

module.exports = YouTubeAutomation; 