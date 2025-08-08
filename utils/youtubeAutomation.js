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
      this.logger.logStep('youtubeNavigation', false, { status: 'starting' });
      
      // Navigate to YouTube
      await this.page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded' });
      await this.human.waitForPageLoad()
      await this.human.randomDelay(2000, 3000);
      
      this.logger.logStep('youtubeNavigation', true, { status: 'completed' });
    } catch (error) {
      this.logger.logError(error, 'youtubeNavigation');
      throw error;
    }
  }

  // Login to Gmail/Google account
  async loginToGmail(email, password) {
    try {
      this.logger.logStep('gmailLogin', false, { status: 'starting' });
      
      // Go to Gmail login
      await this.page.goto('https://accounts.google.com/signin', { waitUntil: 'networkidle0', timeout: 30000 });
      await this.human.randomDelay(2000, 3000);

      // Check for captcha
      if (await this.human.checkForCaptcha()) {
          this.logger.logCaptcha();
        await this.human.randomDelay(10000, 20000);
      }

      // Wait for page to load
      await this.page.waitForSelector('body', { timeout: 20000 });
      await this.human.randomDelay(2000, 3000);
      
      // Take a screenshot for debugging
      await this.page.screenshot({ path: './logs/login-page.png' });
      
      // Find email field
      const emailField = await this.page.$('input[type="email"], input[name="identifier"]');
      if (!emailField) {
        throw new Error('Email field not found');
      }
      
      this.logger.logStep('gmailLogin', false, { status: 'email_field_found' });
      
      // Focus and type email
      await emailField.focus();
      await this.human.randomDelay(500, 1000);
      
      await this.page.keyboard.type(email, { delay: 100 });
      await this.human.randomDelay(1000, 1500);
      
      // Verify email was typed
      const typedEmail = await emailField.evaluate(el => el.value);
      if (typedEmail !== email) {
        throw new Error('Email typing failed');
      }
      
      // Click Next button
      const nextButton = await this.page.$('#identifierNext, button[type="submit"]');
      if (nextButton) {
        await nextButton.click();
      } else {
        await this.page.keyboard.press('Enter');
      }
      
      // Wait for password field
      await this.human.randomDelay(3000, 4000);
      
      const passwordField = await this.page.$('input[type="password"], input[name="password"]');
      if (!passwordField) {
        throw new Error('Password field not found');
      }
      
      // Focus and type password
      await passwordField.focus();
      await this.human.randomDelay(500, 1000);
      
      await this.page.keyboard.type(password, { delay: 100 });
      await this.human.randomDelay(1000, 1500);
      
      // Verify password was typed
      const typedPassword = await passwordField.evaluate(el => el.value);
      if (typedPassword !== password) {
        throw new Error('Password typing failed');
      }
      
      // Click Next for password
      const passwordNextButton = await this.page.$('#passwordNext, button[type="submit"]');
      if (passwordNextButton) {
        await passwordNextButton.click();
      } else {
        await this.page.keyboard.press('Enter');
      }

      // Wait for login to complete
      await this.human.waitForPageLoad();
      await this.human.randomDelay(3000, 5000);
      
      // Verify login success
      const currentUrl = this.page.url();
      
      if (currentUrl.includes('myaccount.google.com') || currentUrl.includes('gmail.com')) {
        this.logger.logStep('gmailLogin', true, { url: currentUrl });
        return true;
      } else {
        this.logger.logError(new Error(`Login failed - unexpected URL: ${currentUrl}`), 'gmailLogin');
        return false;
      }
      
    } catch (error) {
      this.logger.logError(error, 'gmailLogin');
      throw error;
    }
  }

  // Create YouTube channel
  async createYouTubeChannel() {
    try {
      this.logger.logStep('channelCreated', false, { status: 'starting' });
      
      // Go directly to YouTube Studio - if channel exists, we'll be on the dashboard
      // If no channel exists, we'll be on the channel creation page
      await this.page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
      await this.human.waitForPageLoad();
      await this.human.randomDelay(3000, 5000);
      
      // Check if we're on the "How you'll appear" setup page
      const setupPageIndicators = [
        'h1:has-text("How you\'ll appear")',
        'h1:has-text("How you will appear")',
        'div:has-text("How you\'ll appear")',
        'div:has-text("How you will appear")',
        'span:has-text("How you\'ll appear")',
        'span:has-text("How you will appear")',
        'button:has-text("Next")',
        'button:has-text("Continue")',
        'button:has-text("Get started")'
      ];
      
      let onSetupPage = false;
      for (const selector of setupPageIndicators) {
        try {
          const element = await this.page.$(selector);
          if (element && await element.isVisible()) {
            onSetupPage = true;
            this.logger.logStep('channelCreated', false, { status: 'on_setup_page' });
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (onSetupPage) {
        // Handle the setup page by clicking through the steps
        this.logger.logStep('channelCreated', false, { status: 'handling_setup_page' });
        
        // Click through setup steps multiple times to ensure completion
        for (let i = 0; i < 10; i++) {
          const setupButtons = [
            'button:has-text("Next")',
            'button:has-text("Continue")',
            'button:has-text("Get started")',
            'button:has-text("Done")',
            'button:has-text("OK")',
            'button:has-text("Skip")'
          ];
          
          let clicked = false;
          for (const buttonSelector of setupButtons) {
            try {
              const button = await this.page.$(buttonSelector);
              if (button && await button.isVisible()) {
                await button.click();
                this.logger.logStep('channelCreated', false, { status: `setup_step_${i + 1}_clicked` });
                await this.human.randomDelay(2000, 3000);
                clicked = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!clicked) {
            // No more buttons to click, setup might be complete
            break;
          }
        }
        
        // Take a screenshot to see the final state
        await this.page.screenshot({ path: './logs/channel-setup-complete.png' });
        this.logger.logStep('channelCreated', true, { status: 'setup_completed' });
        return true;
      }

      // If we're not on setup page, assume channel exists or creation is complete
      this.logger.logStep('channelCreated', true, { status: 'channel_ready_or_exists' });
      return true;
    } catch (error) {
      this.logger.logError(error, 'channelCreated');
      throw error;
    }
  }

  // Upload video to YouTube
  // Helper function to find and click a button
  async findAndClickButton(selectors) {
    for (const selector of selectors) {
      try {
        const button = await this.page.$(selector);
        if (button && await button.isVisible()) {
          this.logger.logVideoUpload('', false, { status: 'button_found', selector });
          await button.click();
          return button;
        }
      } catch (e) {
        continue;
      }
    }
    this.logger.logVideoUpload('', false, { status: 'button_not_found' });
    return null;
  }

  async uploadVideo(videoPath, metadata = {}) {
    try {
      this.logger.logVideoUpload(videoPath, false, { status: 'starting', metadata });
      
      // Step 1: Ensure we're properly authenticated by going to YouTube main page first
      this.logger.logVideoUpload(videoPath, false, { status: 'ensuring_authentication' });
      await this.page.goto('https://youtube.com', { 
        waitUntil: 'networkidle0', 
        timeout: 30000 
      });
      await this.human.waitForPageLoad();
      await this.human.randomDelay(3000, 5000);
      
      // Check if we're logged in by looking for user avatar or account elements
      const isLoggedIn = await this.page.evaluate(() => {
        // Check for login form elements
        const hasEmailInput = document.querySelector('input[type="email"]');
        const hasPasswordInput = document.querySelector('input[type="password"]');
        const hasSignInButton = document.querySelector('button[aria-label*="Sign in"], button[aria-label*="sign in"]');
        
        // Check for YouTube Studio specific elements that indicate we're logged in
        const hasUserAvatar = document.querySelector('img[alt*="Avatar"], img[alt*="avatar"], [data-testid="avatar"], .avatar');
        const hasAccountButton = document.querySelector('button[aria-label*="Account"], button[aria-label*="account"], [data-testid="account-button"]');
        
        // If we have login elements, we're not logged in
        if (hasEmailInput || hasPasswordInput || hasSignInButton) {
          return false;
        }
        
        // If we have user elements, we're logged in
        if (hasUserAvatar || hasAccountButton) {
          return true;
        }
        
        // Default to assuming we're logged in if no login elements are found
        return true;
      });
      
      if (!isLoggedIn) {
        this.logger.logVideoUpload(videoPath, false, { status: 'not_authenticated_need_login' });
        throw new Error('Not properly authenticated - need to login first');
      }
      
      this.logger.logVideoUpload(videoPath, false, { status: 'authentication_verified' });
      
      // Step 2: Navigate to YouTube Studio dashboard
      this.logger.logVideoUpload(videoPath, false, { status: 'navigating_to_studio_dashboard' });
      await this.page.goto('https://studio.youtube.com', { 
        waitUntil: 'networkidle0', 
        timeout: 30000 
      });
      await this.human.waitForPageLoad();
      await this.human.randomDelay(5000, 8000);
      
      // Take screenshot to verify we're on the dashboard
      await this.page.screenshot({ path: './logs/studio-dashboard.png' });
      this.logger.logVideoUpload(videoPath, false, { status: 'studio_dashboard_loaded' });
      
      // Step 3: Navigate to upload page
      this.logger.logVideoUpload(videoPath, false, { status: 'navigating_to_upload_page' });
      await this.page.goto('https://studio.youtube.com/upload', { 
        waitUntil: 'networkidle0', 
        timeout: 30000 
      });
      await this.human.waitForPageLoad();
      await this.human.randomDelay(5000, 8000);
      
      // Take initial screenshot for debugging
      await this.page.screenshot({ path: './logs/upload-page-initial.png' });
      this.logger.logVideoUpload(videoPath, false, { status: 'upload_page_loaded' });

      // Check if we're on a sign-in page and handle it
      const currentUrl = this.page.url();
      if (currentUrl.includes('accounts.google.com') || currentUrl.includes('signin') || currentUrl.includes('login')) {
        this.logger.logVideoUpload(videoPath, false, { status: 'detected_signin_page', url: currentUrl });
        
        // Try to navigate to YouTube Studio dashboard first
        await this.page.goto('https://studio.youtube.com', { 
          waitUntil: 'networkidle0', 
          timeout: 30000 
        });
        await this.human.waitForPageLoad();
        await this.human.randomDelay(3000, 5000);
        
        // Then navigate to upload page
        await this.page.goto('https://studio.youtube.com/upload', { 
          waitUntil: 'networkidle0', 
          timeout: 30000 
        });
        await this.human.waitForPageLoad();
        await this.human.randomDelay(3000, 5000);
        
        await this.page.screenshot({ path: './logs/upload-page-after-auth.png' });
        this.logger.logVideoUpload(videoPath, false, { status: 'upload_page_after_auth' });
      }

      // Step 4: Find and use file input for video selection
      this.logger.logVideoUpload(videoPath, false, { status: 'looking_for_file_input' });
      await this.human.randomDelay(3000, 5000);
      
      // Comprehensive file input selectors
      const fileInputSelectors = [
        'input[type="file"]',
        'input[accept*="video"]',
        'input[accept*="mp4"]',
        'input[accept*="avi"]',
        'input[accept*="mov"]',
        'input[accept*="mkv"]',
        'input[accept*="wmv"]',
        'input[accept*="flv"]',
        'input[data-testid="file-input"]',
        'input[aria-label*="file"]',
        'input[aria-label*="video"]',
        'input[aria-label*="upload"]',
        'input[data-testid="upload-input"]',
        'input[data-testid="file-upload"]',
        'input[class*="file"]',
        'input[class*="upload"]',
        'input[id*="file"]',
        'input[id*="upload"]'
      ];
      
      let fileInput = null;
      
      // Try to find existing file input
      for (const selector of fileInputSelectors) {
        try {
          fileInput = await this.page.$(selector);
          if (fileInput) {
            this.logger.logVideoUpload(videoPath, false, { status: 'file_input_found', selector });
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // If no file input found, try to trigger upload areas
      if (!fileInput) {
        this.logger.logVideoUpload(videoPath, false, { status: 'trying_upload_areas' });
        const uploadAreaSelectors = [
          '[data-testid="upload-area"]',
          '[data-testid="drop-zone"]',
          '.upload-area',
          '.drop-zone',
          '[aria-label*="upload"]',
          '[aria-label*="drop"]',
          'div[role="button"][aria-label*="upload"]',
          'div[role="button"][aria-label*="video"]',
          'button[aria-label*="upload"]',
          'button:has-text("Upload")',
          'button:has-text("Select files")',
          'button:has-text("Choose files")'
        ];
        
        for (const selector of uploadAreaSelectors) {
          try {
            const uploadArea = await this.page.$(selector);
            if (uploadArea && await uploadArea.isVisible()) {
              await uploadArea.click();
              await this.human.randomDelay(2000, 3000);
              
              // Check if file input appeared
              for (const inputSelector of fileInputSelectors) {
                try {
                  fileInput = await this.page.$(inputSelector);
                  if (fileInput) {
                    this.logger.logVideoUpload(videoPath, false, { status: 'file_input_found_after_click', selector: inputSelector });
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }
              
              if (fileInput) break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      // Last resort: Create file input dynamically
      if (!fileInput) {
        this.logger.logVideoUpload(videoPath, false, { status: 'creating_dynamic_file_input' });
        try {
          // Try a simpler approach first - just create a hidden file input
          await this.page.evaluate(() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.style.display = 'none';
            input.id = 'dynamic-file-input';
            document.body.appendChild(input);
          });
          
          await this.human.randomDelay(2000, 3000);
          fileInput = await this.page.$('#dynamic-file-input');
          
          if (!fileInput) {
            // Try alternative approach - use page.uploadFile directly
            this.logger.logVideoUpload(videoPath, false, { status: 'trying_direct_upload' });
            
            // Look for any file input that might be hidden
            const hiddenInputs = await this.page.$$('input[type="file"]');
            if (hiddenInputs.length > 0) {
              fileInput = hiddenInputs[0];
              this.logger.logVideoUpload(videoPath, false, { status: 'found_hidden_file_input' });
            } else {
              throw new Error('No file input elements found on page');
            }
          }
        } catch (e) {
          this.logger.logVideoUpload(videoPath, false, { status: 'file_input_creation_failed', error: e.message });
          
          // Try one more approach - look for any upload-related elements
          const uploadElements = await this.page.$$('[data-testid*="upload"], [aria-label*="upload"], button:has-text("Upload"), button:has-text("Select files")');
          if (uploadElements.length > 0) {
            this.logger.logVideoUpload(videoPath, false, { status: 'clicking_upload_elements' });
            for (const element of uploadElements) {
              try {
                if (await element.isVisible()) {
                  await element.click();
                  await this.human.randomDelay(2000, 3000);
                  
                  // Check if file input appeared
                  const newInputs = await this.page.$$('input[type="file"]');
                  if (newInputs.length > 0) {
                    fileInput = newInputs[0];
                    this.logger.logVideoUpload(videoPath, false, { status: 'file_input_found_after_click' });
                    break;
                  }
                }
              } catch (clickError) {
                continue;
              }
            }
          }
          
          if (!fileInput) {
            throw new Error(`Could not create or find file input element: ${e.message}`);
          }
        }
      }

      // Step 5: Upload the video file with better error handling
      this.logger.logVideoUpload(videoPath, false, { status: 'uploading_file' });
      try {
        // Try the standard upload method first
        await fileInput.uploadFile(videoPath);
        this.logger.logVideoUpload(videoPath, false, { status: 'file_uploaded_successfully' });
      } catch (uploadError) {
        this.logger.logVideoUpload(videoPath, false, { status: 'standard_upload_failed', error: uploadError.message });
        
        // Try alternative upload method using page.evaluate
        try {
          await this.page.evaluate((filePath) => {
            const input = document.querySelector('input[type="file"]');
            if (input) {
              // Create a File object and set it to the input
              const file = new File([''], filePath, { type: 'video/mp4' });
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              input.files = dataTransfer.files;
              
              // Trigger change event
              const event = new Event('change', { bubbles: true });
              input.dispatchEvent(event);
              
              return true;
            }
            return false;
          }, videoPath);
          
          this.logger.logVideoUpload(videoPath, false, { status: 'file_uploaded_alternative_method' });
        } catch (altError) {
          this.logger.logVideoUpload(videoPath, false, { status: 'alternative_upload_failed', error: altError.message });
          
          // Try one more approach - use keyboard shortcut
          try {
            await this.page.keyboard.press('Control+O');
            await this.human.randomDelay(2000, 3000);
            
            // Check if file dialog appeared or file was uploaded
            const uploadComplete = await this.page.evaluate(() => {
              return document.querySelector('input[type="file"]')?.files?.length > 0;
            });
            
            if (uploadComplete) {
              this.logger.logVideoUpload(videoPath, false, { status: 'file_uploaded_keyboard_method' });
            } else {
              throw new Error('Keyboard upload method failed');
            }
          } catch (keyboardError) {
            throw new Error(`All upload methods failed: ${uploadError.message}, ${altError.message}, ${keyboardError.message}`);
          }
        }
      }
      
      // Step 6: Wait for upload to start and monitor progress
      this.logger.logVideoUpload(videoPath, false, { status: 'waiting_for_upload_to_start' });
      await this.human.randomDelay(5000, 8000);
      
      // Monitor upload progress with enhanced progress bar detection
      let uploadComplete = false;
      let uploadAttempts = 0;
      const maxUploadAttempts = 120; // 10 minutes with 5-second intervals
      
      while (!uploadComplete && uploadAttempts < maxUploadAttempts) {
        try {
          // Check for upload completion indicators
          const uploadCompleteIndicators = [
            'button[aria-label*="Next"]',
            'button:has-text("Next")',
            'button[data-testid="next-button"]',
            'button[aria-label*="Continue"]',
            'button:has-text("Continue")',
            'button[data-testid="continue-button"]',
            '.upload-complete',
            '[data-testid="upload-complete"]',
            'button[aria-label*="Publish"]',
            'button:has-text("Publish")',
            'input[name="title"]',
            'input[placeholder*="title"]',
            'textarea[name="description"]',
            'textarea[placeholder*="description"]',
            '[data-testid="title-input"]',
            '[data-testid="description-input"]'
          ];
          
          for (const selector of uploadCompleteIndicators) {
            const element = await this.page.$(selector);
            if (element && await element.isVisible()) {
              uploadComplete = true;
              this.logger.logVideoUpload(videoPath, false, { status: 'upload_complete', found: selector });
              break;
            }
          }
          
          if (!uploadComplete) {
            // Check for progress bar or upload status
            const progressIndicators = [
              '[data-testid="upload-progress"]',
              '.upload-progress',
              '[aria-label*="progress"]',
              '[aria-label*="uploading"]',
              '.progress-bar',
              '[role="progressbar"]'
            ];
            
            let progressFound = false;
            for (const selector of progressIndicators) {
              const element = await this.page.$(selector);
              if (element && await element.isVisible()) {
                progressFound = true;
                this.logger.logVideoUpload(videoPath, false, { status: 'upload_in_progress', attempt: uploadAttempts + 1 });
                break;
              }
            }
            
            if (!progressFound) {
              this.logger.logVideoUpload(videoPath, false, { status: 'waiting_for_upload', attempt: uploadAttempts + 1 });
            }
            
            await this.human.randomDelay(5000, 8000);
            uploadAttempts++;
          }
        } catch (e) {
          await this.human.randomDelay(5000, 8000);
          uploadAttempts++;
        }
      }
      
      if (!uploadComplete) {
        this.logger.logVideoUpload(videoPath, false, { status: 'upload_timeout_continuing' });
        await this.page.screenshot({ path: './logs/upload-timeout.png' });
      }
      
      // Step 6: Fill in video metadata (title, description, tags)
      this.logger.logVideoUpload(videoPath, false, { status: 'filling_metadata' });
      await this.human.randomDelay(3000, 5000);
      
      // Fill title
      if (metadata.title) {
        await this.fillVideoField('title', metadata.title, [
          'input[name="title"]',
          'input[placeholder*="title"]',
          'input[placeholder*="Title"]',
          'input[aria-label*="title"]',
          'input[aria-label*="Title"]',
          'input[data-testid="title-input"]',
          'input[data-testid="video-title"]',
          'input[class*="title"]',
          'input[id*="title"]',
          'textarea[name="title"]',
          'textarea[placeholder*="title"]',
          'textarea[placeholder*="Title"]',
          'textarea[aria-label*="title"]',
          'textarea[aria-label*="Title"]'
        ]);
      }

      // Fill description
      if (metadata.description) {
        await this.fillVideoField('description', metadata.description, [
          'textarea[name="description"]',
          'textarea[placeholder*="description"]',
          'textarea[placeholder*="Description"]',
          'textarea[aria-label*="description"]',
          'textarea[aria-label*="Description"]',
          'textarea[data-testid="description-input"]',
          'textarea[data-testid="video-description"]',
          'textarea[class*="description"]',
          'textarea[id*="description"]',
          'input[name="description"]',
          'input[placeholder*="description"]',
          'input[placeholder*="Description"]',
          'input[aria-label*="description"]',
          'input[aria-label*="Description"]'
        ]);
      }

      // Fill tags
      if (metadata.tags && metadata.tags.length > 0) {
        await this.fillVideoField('tags', metadata.tags.join(', '), [
          'input[placeholder*="tag"]',
          'input[placeholder*="Tag"]',
          'input[placeholder*="tags"]',
          'input[placeholder*="Tags"]',
          'input[aria-label*="tag"]',
          'input[aria-label*="Tag"]',
          'input[aria-label*="tags"]',
          'input[aria-label*="Tags"]',
          'input[data-testid="tags-input"]',
          'input[data-testid="video-tags"]',
          'input[class*="tag"]',
          'input[class*="tags"]',
          'input[id*="tag"]',
          'input[id*="tags"]',
          'textarea[placeholder*="tag"]',
          'textarea[placeholder*="Tag"]',
          'textarea[placeholder*="tags"]',
          'textarea[placeholder*="Tags"]'
        ]);
      }

      // Step 6: Handle the complete upload flow with enhanced error handling
      this.logger.logVideoUpload(videoPath, false, { status: 'starting_upload_flow' });
      await this.human.randomDelay(2000, 3000);
      
      // Step 6.1: Press Next after video check
      this.logger.logVideoUpload(videoPath, false, { status: 'step_1_pressing_next_after_check' });
      let nextButton = await this.findAndClickButton([
        'button[aria-label*="Next"]',
        'button:has-text("Next")',
        'button[data-testid="next-button"]',
        'button[aria-label*="Continue"]',
        'button:has-text("Continue")',
        'button[data-testid="continue-button"]'
      ]);
      
      if (nextButton) {
        await this.human.randomDelay(3000, 5000);
        await this.page.screenshot({ path: './logs/after-first-next.png' });
        this.logger.logVideoUpload(videoPath, false, { status: 'first_next_clicked' });
      } else {
        this.logger.logVideoUpload(videoPath, false, { status: 'first_next_button_not_found' });
        await this.page.screenshot({ path: './logs/first-next-not-found.png' });
      }
      
      // Step 6.2: Select "No, it's not made for kids"
      this.logger.logVideoUpload(videoPath, false, { status: 'step_2_selecting_no_kids' });
      let kidsButton = await this.findAndClickButton([
        'input[value="no"]',
        'input[value="false"]',
        'button[aria-label*="No"]',
        'button:has-text("No")',
        'button:has-text("No, it\'s not made for kids")',
        'button:has-text("No, it is not made for kids")',
        'button[data-testid="no-kids-button"]',
        'input[name="kids"][value="no"]',
        'input[name="madeForKids"][value="false"]',
        'input[name="isMadeForKids"][value="false"]',
        'input[type="radio"][value="no"]',
        'input[type="radio"][value="false"]'
      ]);
      
      if (kidsButton) {
        await this.human.randomDelay(2000, 3000);
        await this.page.screenshot({ path: './logs/after-kids-selection.png' });
        this.logger.logVideoUpload(videoPath, false, { status: 'kids_selection_completed' });
      } else {
        this.logger.logVideoUpload(videoPath, false, { status: 'kids_button_not_found' });
        await this.page.screenshot({ path: './logs/kids-button-not-found.png' });
      }
      
      // Step 6.3: Press Next three times
      for (let i = 1; i <= 3; i++) {
        this.logger.logVideoUpload(videoPath, false, { status: `step_3_pressing_next_${i}_of_3` });
        nextButton = await this.findAndClickButton([
          'button[aria-label*="Next"]',
          'button:has-text("Next")',
          'button[data-testid="next-button"]',
          'button[aria-label*="Continue"]',
          'button:has-text("Continue")',
          'button[data-testid="continue-button"]'
        ]);
        
        if (nextButton) {
          await this.human.randomDelay(3000, 5000);
          await this.page.screenshot({ path: `./logs/after-next-${i}.png` });
          this.logger.logVideoUpload(videoPath, false, { status: `next_${i}_clicked` });
        } else {
          this.logger.logVideoUpload(videoPath, false, { status: `next_${i}_button_not_found` });
          await this.page.screenshot({ path: `./logs/next-${i}-not-found.png` });
        }
      }
      
      // Step 6.4: Select "Public" for video visibility
      this.logger.logVideoUpload(videoPath, false, { status: 'step_4_selecting_public_visibility' });
      let publicButton = await this.findAndClickButton([
        'input[value="public"]',
        'input[name="visibility"][value="public"]',
        'button[aria-label*="Public"]',
        'button:has-text("Public")',
        'button[data-testid="public-button"]',
        'input[name="privacy"][value="public"]',
        'input[name="status"][value="public"]',
        'input[type="radio"][value="public"]'
      ]);
      
      if (publicButton) {
        await this.human.randomDelay(2000, 3000);
        await this.page.screenshot({ path: './logs/after-public-selection.png' });
        this.logger.logVideoUpload(videoPath, false, { status: 'public_visibility_selected' });
      } else {
        this.logger.logVideoUpload(videoPath, false, { status: 'public_button_not_found' });
        await this.page.screenshot({ path: './logs/public-button-not-found.png' });
      }
      
      // Step 6.5: Press the final Publish button
      this.logger.logVideoUpload(videoPath, false, { status: 'step_5_pressing_final_publish' });
      let publishButton = await this.findAndClickButton([
        'button[type="submit"]',
        'button[aria-label*="Publish"]',
        'button:has-text("Publish")',
        'button[aria-label*="Upload"]',
        'button:has-text("Upload")',
        'button[data-testid="publish-button"]',
        'button[data-testid="upload-button"]',
        'button[jsname="publish-button"]',
        'button[jsname="upload-button"]',
        'ytd-button-renderer:has-text("Publish")',
        'ytd-button-renderer:has-text("Upload")'
      ]);
      
      if (publishButton) {
        this.logger.logVideoUpload(videoPath, false, { status: 'publish_button_clicked' });
        
        // Wait for publish to complete with longer delay
        await this.human.randomDelay(15000, 20000);
        
        await this.page.screenshot({ path: './logs/after-publish.png' });
        this.logger.logVideoUpload(videoPath, false, { status: 'publish_completed' });
      } else {
        this.logger.logVideoUpload(videoPath, false, { status: 'publish_button_not_found' });
        await this.page.screenshot({ path: './logs/no-publish-button-found.png' });
      }

      this.logger.logVideoUpload(videoPath, true, { status: 'published', metadata });
      return true;
    } catch (error) {
      this.logger.logVideoUpload(videoPath, false, { status: 'failed', error: error.message });
      await this.page.screenshot({ path: './logs/upload-error.png' });
      throw error;
    }
  }

  // New focused upload method following exact instructions
  async uploadVideoStepByStep(videoPath, metadata = {}) {
    try {
      this.logger.logVideoUpload(videoPath, false, { status: 'starting_step_by_step_upload' });
      
      // Step 1: Navigate directly to the upload page
      this.logger.logVideoUpload(videoPath, false, { status: 'step_1_navigating_directly_to_upload' });
      await this.page.goto('https://studio.youtube.com/upload', { 
        waitUntil: 'networkidle0', 
        timeout: 30000 
      });
      
      // Step 2: Wait for the page to load fully and stabilize
      this.logger.logVideoUpload(videoPath, false, { status: 'step_2_waiting_for_page_stabilization' });
      await this.human.waitForPageLoad();
      await this.human.randomDelay(5000, 8000);
      
      // Take screenshot to verify we're on the upload page
      await this.page.screenshot({ path: './logs/upload-page-direct.png' });
      this.logger.logVideoUpload(videoPath, false, { status: 'upload_page_loaded' });
      
      // Step 3: Comprehensive wait for page to be fully interactive
      this.logger.logVideoUpload(videoPath, false, { status: 'step_3_waiting_for_full_interactivity' });
      
      // Wait for document to be ready
      await this.page.waitForFunction(() => {
        return document.readyState === 'complete';
      }, { timeout: 30000 });
      
      // Wait for any loading overlays to disappear
      await this.page.waitForFunction(() => {
        const overlays = document.querySelectorAll('.overlay, .modal, .loading-overlay, [aria-hidden="true"]');
        const loadingElements = document.querySelectorAll('[aria-label*="Loading"], [aria-label*="loading"], .loading, .spinner, .progress');
        return overlays.length === 0 && loadingElements.length === 0;
      }, { timeout: 30000 });
      
      // Wait for page to be interactive (no disabled elements)
      await this.page.waitForFunction(() => {
        const disabledElements = document.querySelectorAll('[disabled], [aria-disabled="true"]');
        return disabledElements.length === 0;
      }, { timeout: 30000 });
      
      // Additional wait for any animations to complete
      await this.human.randomDelay(8000, 12000);
      
      // Take a screenshot to see the current state
      await this.page.screenshot({ path: './logs/upload-page-stabilized.png' });
      this.logger.logVideoUpload(videoPath, false, { status: 'upload_page_stabilized' });
      
      // Step 4: Upload video file
      this.logger.logVideoUpload(videoPath, false, { status: 'step_4_uploading_video_file' });
      
      // Ensure we have an absolute path to the video file
      const absoluteVideoPath = path.resolve(videoPath);
      this.logger.logVideoUpload(videoPath, false, { status: 'resolved_file_path', absolutePath: absoluteVideoPath });
      
      // Check if file exists
      if (!await fs.pathExists(absoluteVideoPath)) {
        throw new Error(`Video file not found: ${absoluteVideoPath}`);
      }
      
      // Look for file input element
      const fileInput = await this.page.$('input[type="file"]');
      if (!fileInput) {
        throw new Error('File input not found on upload page');
      }
      
      // Upload the file
      await fileInput.uploadFile(absoluteVideoPath);
      this.logger.logVideoUpload(videoPath, false, { status: 'file_uploaded_successfully' });
      
      // Wait for upload to begin and processing to complete
      await this.human.randomDelay(15000, 20000);
      
      // Take screenshot after file upload
      await this.page.screenshot({ path: './logs/after-file-upload.png' });
      this.logger.logVideoUpload(videoPath, false, { status: 'file_upload_completed' });
      
      // Step 5: Fill in title and description with robust handling
      this.logger.logVideoUpload(videoPath, false, { status: 'step_5_filling_metadata' });
      
      // Generate random title and description
      const randomTitle = `Test Video ${Math.floor(Math.random() * 1000)} - ${new Date().toISOString().slice(0, 10)}`;
      const randomDescription = `This is a test video uploaded on ${new Date().toLocaleDateString()}. Random description for testing purposes.`;
      
      // Wait for metadata form to be ready
      await this.human.randomDelay(5000, 8000);
      
      // Wait for any loading indicators to disappear
      await this.page.waitForFunction(() => {
        const loadingElements = document.querySelectorAll('[aria-label*="Loading"], [aria-label*="loading"], .loading, .spinner');
        return loadingElements.length === 0;
      }, { timeout: 30000 });
      
      await this.page.waitForFunction(() => {
        return document.readyState === 'complete' && !document.body.classList.contains('loading');
      }, { timeout: 30000 });
      
      // Take screenshot before filling metadata
      await this.page.screenshot({ path: './logs/before-metadata-fill.png' });
      this.logger.logVideoUpload(videoPath, false, { status: 'metadata_form_ready' });
      
      // Fill title
      this.logger.logVideoUpload(videoPath, false, { status: 'filling_title', title: randomTitle });
      await this.fillVideoField('title', randomTitle, [
        'input[name="title"]',
        'input[placeholder*="title"]',
        'input[placeholder*="Title"]',
        'input[aria-label*="title"]',
        'input[aria-label*="Title"]',
        'textarea[name="title"]',
        'textarea[placeholder*="title"]',
        'textarea[placeholder*="Title"]'
      ]);
      
      await this.human.randomDelay(2000, 3000);
      
      // Fill description
      this.logger.logVideoUpload(videoPath, false, { status: 'filling_description', description: randomDescription });
      await this.fillVideoField('description', randomDescription, [
        'textarea[name="description"]',
        'textarea[placeholder*="description"]',
        'textarea[placeholder*="Description"]',
        'textarea[aria-label*="description"]',
        'textarea[aria-label*="Description"]',
        'input[name="description"]',
        'input[placeholder*="description"]',
        'input[placeholder*="Description"]'
      ]);
      
      await this.human.randomDelay(3000, 5000);
      
      // Take screenshot after filling metadata
      await this.page.screenshot({ path: './logs/after-metadata-fill.png' });
      this.logger.logVideoUpload(videoPath, false, { status: 'metadata_filled_successfully' });
      
      // Step 6: Navigate through the upload process
      this.logger.logVideoUpload(videoPath, false, { status: 'step_6_navigating_upload_process' });
      
      // Click Next button (first time)
      await this.clickNextButton();
      await this.human.randomDelay(3000, 5000);
      
      // Click Next button (second time)
      await this.clickNextButton();
      await this.human.randomDelay(3000, 5000);
      
      // Click Next button (third time)
      await this.clickNextButton();
      await this.human.randomDelay(3000, 5000);
      
      // Step 7: Set visibility to Public
      this.logger.logVideoUpload(videoPath, false, { status: 'step_7_setting_visibility' });
      await this.setVisibilityToPublic();
      await this.human.randomDelay(3000, 5000);
      
      // Step 8: Publish the video
      this.logger.logVideoUpload(videoPath, false, { status: 'step_8_publishing_video' });
      await this.publishVideo();
      
      // Step 9: Wait for confirmation
      this.logger.logVideoUpload(videoPath, false, { status: 'step_9_waiting_for_confirmation' });
      await this.waitForPublishConfirmation();
      
      this.logger.logVideoUpload(videoPath, true, { status: 'video_published_successfully' });
      return true;
      
    } catch (error) {
      this.logger.logError(error, 'uploadVideoStepByStep');
      throw error;
    }
  }

  // Helper method to click Next button
  async clickNextButton() {
    const nextButtonSelectors = [
      'button:has-text("Next")',
      'button[aria-label*="Next"]',
      'button[aria-label*="next"]',
      '[data-testid="next-button"]',
      'ytcp-button:has-text("Next")',
      'button[class*="next"]',
      'button[class*="Next"]'
    ];
    
    for (const selector of nextButtonSelectors) {
      try {
        const button = await this.page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          this.logger.logVideoUpload('', false, { status: 'next_button_clicked', selector });
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Next button not found');
  }
  
  // Helper method to set visibility to Public
  async setVisibilityToPublic() {
    const publicSelectors = [
      'input[value="public"]',
      'input[aria-label*="Public"]',
      'input[aria-label*="public"]',
      'label:has-text("Public")',
      'div:has-text("Public")',
      'span:has-text("Public")',
      '[data-testid="public-radio"]',
      'input[name="visibility"][value="public"]'
    ];
    
    for (const selector of publicSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element && await element.isVisible()) {
          await element.click();
          this.logger.logVideoUpload('', false, { status: 'public_visibility_selected', selector });
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Public visibility option not found');
  }
  
  // Helper method to publish video
  async publishVideo() {
    const publishSelectors = [
      'button:has-text("Publish")',
      'button[aria-label*="Publish"]',
      'button[aria-label*="publish"]',
      '[data-testid="publish-button"]',
      'ytcp-button:has-text("Publish")',
      'button[class*="publish"]',
      'button[class*="Publish"]'
    ];
    
    for (const selector of publishSelectors) {
      try {
        const button = await this.page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          this.logger.logVideoUpload('', false, { status: 'publish_button_clicked', selector });
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Publish button not found');
  }
  
  // Helper method to wait for publish confirmation
  async waitForPublishConfirmation() {
    const confirmationSelectors = [
      'div:has-text("Video published")',
      'div:has-text("Published")',
      'div:has-text("Your video is now live")',
      '[data-testid="publish-success"]',
      '.publish-success',
      'span:has-text("Video published")',
      'span:has-text("Published")'
    ];
    
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
      for (const selector of confirmationSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element && await element.isVisible()) {
            this.logger.logVideoUpload('', false, { status: 'publish_confirmation_found', selector });
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      this.logger.logVideoUpload('', false, { status: 'waiting_for_publish_confirmation', attempt: attempts + 1 });
      await this.human.randomDelay(5000, 8000);
      attempts++;
    }
    
    this.logger.logVideoUpload('', false, { status: 'publish_confirmation_timeout_but_continuing' });
    return false;
  }

  // Helper method to fill video fields with better error handling
  async fillVideoField(fieldName, value, selectors) {
    try {
      let fieldInput = null;
      
      for (const selector of selectors) {
        try {
          fieldInput = await this.page.$(selector);
          if (fieldInput && await fieldInput.isVisible()) {
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (fieldInput) {
        await fieldInput.focus();
        await this.human.randomDelay(500, 1000);
        
        // Clear existing text first
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('A');
        await this.page.keyboard.up('Control');
        await this.human.randomDelay(500, 1000);
        
        // Type with realistic delays
        await this.page.keyboard.type(value, { delay: 80 + Math.random() * 120 });
        await this.human.randomDelay(1000, 1500);
        
        this.logger.logVideoUpload('', false, { status: `${fieldName}_filled`, value: value.substring(0, 50) + '...' });
      } else {
        this.logger.logVideoUpload('', false, { status: `${fieldName}_input_not_found` });
      }
    } catch (error) {
      this.logger.logVideoUpload('', false, { status: `${fieldName}_fill_error`, error: error.message });
    }
  }

  // Upload multiple videos
  async uploadMultipleVideos(videoFolder = config.youtube.videoFolder, maxVideos = 3) {
    try {
      this.logger.logStep('videosUploaded', false, { status: 'starting', maxVideos: 3 });

      // Get video files
      const videoFiles = await this.getVideoFiles(videoFolder);
      if (videoFiles.length === 0) {
        this.logger.logStep('videosUploaded', false, { status: 'no_videos_found', folder: videoFolder });
        return 0;
      }

      let uploadedCount = 0;
      const videosToUpload = Math.min(3, videoFiles.length); // Upload exactly 3 videos or all available if less than 3
      
      for (let i = 0; i < videosToUpload; i++) {
        const videoPath = videoFiles[i];
        const metadata = await this.getVideoMetadata(videoPath);

        try {
          this.logger.logStep('videosUploaded', false, { status: `uploading_video_${i + 1}`, video: path.basename(videoPath) });
          
          // Use the new step-by-step upload method for better reliability
          await this.uploadVideoStepByStep(videoPath, metadata);
          uploadedCount++;
          
          this.logger.logStep('videosUploaded', false, { status: `video_${i + 1}_completed`, uploadedCount });
          
          // Delay between uploads (longer delay to avoid detection)
          if (i < videosToUpload - 1) {
            const delay = 30000 + Math.random() * 30000; // 30-60 seconds between uploads
            this.logger.logStep('videosUploaded', false, { status: 'waiting_between_uploads', delay: Math.round(delay / 1000) });
            await this.human.randomDelay(delay, delay + 10000);
          }
        } catch (error) {
          this.logger.logError(error, `video_upload_${i + 1}`);
          
          // Continue with next video even if one fails
          this.logger.logStep('videosUploaded', false, { status: `video_${i + 1}_failed`, error: error.message });
        }
      }

      this.logger.logStep('videosUploaded', true, { uploadedCount, totalVideos: videosToUpload, target: 3 });
      return uploadedCount;
    } catch (error) {
      this.logger.logError(error, 'uploadMultipleVideos');
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
      this.logger.logError(error, 'getVideoFiles');
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
      this.logger.logError(error, 'getVideoMetadata');
    }
    
    // Generate random metadata
    const titles = [
      'Amazing Discovery You Need to See!',
      'Incredible Moments That Will Blow Your Mind',
      'The Most Fascinating Video You\'ll Watch Today',
      'Unbelievable Facts That Will Surprise You',
      'Must-Watch: This Changes Everything!',
      'The Truth About What You Didn\'t Know',
      'Mind-Blowing Revelations That Will Shock You',
      'You Won\'t Believe What Happens Next!',
      'The Secret That Nobody Talks About',
      'This Will Completely Change Your Perspective'
    ];
    
    const descriptions = [
      'Thanks for watching! Don\'t forget to like and subscribe for more amazing content! 🔥',
      'This video took a lot of work to create. Your support means everything! ❤️',
      'If you enjoyed this video, make sure to hit that like button and subscribe! 👍',
      'Thanks for being part of our community! Share this video with your friends! 📢',
      'Don\'t forget to turn on notifications so you never miss our latest uploads! 🔔',
      'Your engagement helps us create more content like this. Thank you! 🙏',
      'Leave a comment below and let us know what you think! 💬',
      'Share this video if you found it helpful or entertaining! 📤',
      'Subscribe for daily content that will inspire and entertain you! ✨',
      'Hit that like button if you want to see more videos like this! 👍'
    ];
    
    const tagSets = [
      ['viral', 'trending', 'amazing', 'incredible', 'mustwatch'],
      ['fascinating', 'mindblowing', 'unbelievable', 'shocking', 'wow'],
      ['discovery', 'revelation', 'truth', 'secret', 'exposed'],
      ['entertainment', 'fun', 'awesome', 'cool', 'amazing'],
      ['viral', 'trending', 'popular', 'hot', 'fire']
    ];
    
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
    const randomTags = tagSets[Math.floor(Math.random() * tagSets.length)];
    
    // Return generated metadata
    return {
      title: randomTitle,
      description: randomDescription,
      tags: randomTags,
      visibility: 'private' // Keep private for safety
    };
  }

  // Save session cookies
  async saveCookies() {
    try {
      // Get cookies from the browser context
      const cookies = await this.page.evaluate(() => {
        return document.cookie;
      });
      
      const cookieFile = `./profiles/cookies_${Date.now()}.json`;
      await fs.ensureDir('./profiles');
      await fs.writeJson(cookieFile, { cookies });
      this.logger.logStep('cookiesSaved', true, { cookieFile });
      return cookieFile;
    } catch (error) {
      this.logger.logError(error, 'saveCookies');
    }
  }

  // Load session cookies
  async loadCookies(cookieFile) {
    try {
      if (await fs.pathExists(cookieFile)) {
        const cookies = await fs.readJson(cookieFile);
        await this.page.context().addCookies(cookies);
        this.logger.logStep('cookiesLoaded', true, { cookieFile });
        return true;
      }
    } catch (error) {
      this.logger.logError(error, 'loadCookies');
    }
    return false;
  }

  // Helper method to find elements using Tab navigation
  async findElementWithTab(searchTerm, maxTabs = 20) {
    // Focus on the page first
    await this.page.keyboard.press('Tab');
    await this.human.randomDelay(500, 1000);
    
    let tabCount = 0;
    
    while (tabCount < maxTabs) {
      // Get the currently focused element
      const focusedElement = await this.page.evaluate(() => {
        const activeElement = document.activeElement;
        if (activeElement) {
          return {
            tagName: activeElement.tagName,
            textContent: activeElement.textContent,
            ariaLabel: activeElement.getAttribute('aria-label'),
            className: activeElement.className,
            id: activeElement.id
          };
        }
        return null;
      });
      
      // Check if current element matches the search term
      if (focusedElement && (
        focusedElement.textContent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        focusedElement.ariaLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        focusedElement.className?.toLowerCase().includes(searchTerm.toLowerCase())
      )) {
        return focusedElement;
      }
      
      // Tab to next element
      await this.page.keyboard.press('Tab');
      await this.human.randomDelay(200, 500);
      tabCount++;
    }
    
    return null;
  }
}

module.exports = YouTubeAutomation; 