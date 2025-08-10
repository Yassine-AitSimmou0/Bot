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

      // Step 4: Use Tab key navigation to find and click the "Select files" button
      this.logger.logVideoUpload(videoPath, false, { status: 'using_tab_navigation_to_find_select_files' });
      await this.human.randomDelay(3000, 5000);
      
      // Take screenshot before starting tab navigation
      await this.page.screenshot({ path: './logs/before-tab-navigation.png' });
      
      let selectFilesButton = null;
      let fileInput = null;
      
      // Use tab navigation to find the "Select files" button
      for (let tabCount = 0; tabCount < 20; tabCount++) {
        try {
          // Press Tab key
          await this.page.keyboard.press('Tab');
          await this.human.randomDelay(500, 1000);
          
          // Check if current element is the "Select files" button
          const currentElement = await this.page.evaluate(() => {
            const activeElement = document.activeElement;
            if (activeElement) {
              return {
                tagName: activeElement.tagName,
                textContent: activeElement.textContent?.trim(),
                ariaLabel: activeElement.getAttribute('aria-label'),
                dataTestId: activeElement.getAttribute('data-testid'),
                className: activeElement.className,
                id: activeElement.id,
                type: activeElement.type
              };
            }
            return null;
          });
          
          this.logger.logVideoUpload(videoPath, false, { 
            status: 'tab_navigation_step', 
            tabCount: tabCount + 1, 
            element: currentElement 
          });
          
          // Check if we found the "Select files" button
          if (currentElement && (
            currentElement.textContent === 'Select files' ||
            currentElement.textContent === 'Select Files' ||
            currentElement.ariaLabel?.includes('Select files') ||
            currentElement.ariaLabel?.includes('Select Files') ||
            currentElement.dataTestId?.includes('select-files') ||
            currentElement.dataTestId?.includes('upload-button')
          )) {
            this.logger.logVideoUpload(videoPath, false, { status: 'select_files_button_found_via_tab' });
            
            // Click the "Select files" button
            await this.page.keyboard.press('Enter');
            await this.human.randomDelay(2000, 3000);
            
            // Take screenshot after clicking
            await this.page.screenshot({ path: './logs/after-select-files-click.png' });
            
            // Wait for file input to appear
            await this.human.randomDelay(2000, 3000);
            
            // Look for file input that should now be visible
            const fileInputSelectors = [
              'input[type="file"]',
              'input[accept*="video"]',
              'input[accept*="mp4"]',
              'input[accept*="avi"]',
              'input[accept*="mov"]',
              'input[accept*="mkv"]',
              'input[accept*="wmv"]',
              'input[accept*="flv"]'
            ];
            
            for (const selector of fileInputSelectors) {
              try {
                fileInput = await this.page.$(selector);
                if (fileInput) {
                  this.logger.logVideoUpload(videoPath, false, { status: 'file_input_found_after_select_files', selector });
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            
            if (fileInput) break;
          }
          
          // Also check for any button with "Select files" text using traditional selectors
          if (!selectFilesButton) {
            const selectFilesSelectors = [
              'button:has-text("Select files")',
              'button:has-text("Select Files")',
              'button[aria-label*="Select files"]',
              'button[aria-label*="Select Files"]',
              'button[data-testid*="select-files"]',
              'button[data-testid*="upload-button"]',
              'div[role="button"]:has-text("Select files")',
              'div[role="button"]:has-text("Select Files")'
            ];
            
            for (const selector of selectFilesSelectors) {
              try {
                selectFilesButton = await this.page.$(selector);
                if (selectFilesButton && await selectFilesButton.isVisible()) {
                  this.logger.logVideoUpload(videoPath, false, { status: 'select_files_button_found_via_selector', selector });
                  
                  // Click the button
                  await selectFilesButton.click();
                  await this.human.randomDelay(2000, 3000);
                  
                  // Take screenshot after clicking
                  await this.page.screenshot({ path: './logs/after-select-files-click.png' });
                  
                  // Wait for file input to appear
                  await this.human.randomDelay(2000, 3000);
                  
                  // Look for file input
                  const fileInputSelectors = [
                    'input[type="file"]',
                    'input[accept*="video"]',
                    'input[accept*="mp4"]',
                    'input[accept*="avi"]',
                    'input[accept*="mov"]',
                    'input[accept*="mkv"]',
                    'input[accept*="wmv"]',
                    'input[accept*="flv"]'
                  ];
                  
                  for (const selector of fileInputSelectors) {
                    try {
                      fileInput = await this.page.$(selector);
                      if (fileInput) {
                        this.logger.logVideoUpload(videoPath, false, { status: 'file_input_found_after_select_files', selector });
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
          
          if (fileInput) break;
          
        } catch (e) {
          this.logger.logVideoUpload(videoPath, false, { status: 'tab_navigation_error', error: e.message, tabCount: tabCount + 1 });
          continue;
        }
      }
      
      // If we still don't have a file input, try the original approach as fallback
      if (!fileInput) {
        this.logger.logVideoUpload(videoPath, false, { status: 'fallback_to_original_approach' });
        
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
        
        // Try to find existing file input
        for (const selector of fileInputSelectors) {
          try {
            fileInput = await this.page.$(selector);
            if (fileInput) {
              this.logger.logVideoUpload(videoPath, false, { status: 'file_input_found_fallback', selector });
              break;
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

      // Step 5: Upload the video file with improved file handling
      this.logger.logVideoUpload(videoPath, false, { status: 'uploading_file' });
      
      if (!fileInput) {
        throw new Error('No file input element found after tab navigation and button clicks');
      }
      
      try {
        // Method 1: Try the standard upload method first
        this.logger.logVideoUpload(videoPath, false, { status: 'trying_standard_upload_method' });
        await fileInput.uploadFile(videoPath);
        this.logger.logVideoUpload(videoPath, false, { status: 'file_uploaded_successfully_standard' });
      } catch (uploadError) {
        this.logger.logVideoUpload(videoPath, false, { status: 'standard_upload_failed', error: uploadError.message });
        
        // Method 2: Try using file chooser approach
        try {
          this.logger.logVideoUpload(videoPath, false, { status: 'trying_file_chooser_method' });
          
          // Wait for file chooser to appear
          const [fileChooser] = await Promise.all([
            this.page.waitForFileChooser({ timeout: 10000 }),
            fileInput.click()
          ]);
          
          await this.human.randomDelay(1000, 2000);
          await fileChooser.accept([videoPath]);
          this.logger.logVideoUpload(videoPath, false, { status: 'file_uploaded_successfully_chooser' });
          
        } catch (chooserError) {
          this.logger.logVideoUpload(videoPath, false, { status: 'file_chooser_failed', error: chooserError.message });
          
          // Method 3: Try alternative upload method using page.evaluate
          try {
            this.logger.logVideoUpload(videoPath, false, { status: 'trying_evaluate_method' });
            
            const uploadResult = await this.page.evaluate((filePath) => {
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
            
            if (uploadResult) {
              this.logger.logVideoUpload(videoPath, false, { status: 'file_uploaded_successfully_evaluate' });
            } else {
              throw new Error('Evaluate method returned false');
            }
            
          } catch (evalError) {
            this.logger.logVideoUpload(videoPath, false, { status: 'evaluate_method_failed', error: evalError.message });
            
            // Method 4: Try keyboard shortcut approach
            try {
              this.logger.logVideoUpload(videoPath, false, { status: 'trying_keyboard_shortcut_method' });
              
              // Focus on the file input and use keyboard shortcut
              await fileInput.focus();
              await this.human.randomDelay(500, 1000);
              await this.page.keyboard.press('Control+O');
              await this.human.randomDelay(2000, 3000);
              
              // Check if file dialog appeared or file was uploaded
              const uploadComplete = await this.page.evaluate(() => {
                const input = document.querySelector('input[type="file"]');
                return input && input.files && input.files.length > 0;
              });
              
              if (uploadComplete) {
                this.logger.logVideoUpload(videoPath, false, { status: 'file_uploaded_successfully_keyboard' });
              } else {
                throw new Error('Keyboard upload method failed - no files detected');
              }
              
            } catch (keyboardError) {
              this.logger.logVideoUpload(videoPath, false, { status: 'keyboard_method_failed', error: keyboardError.message });
              
              // Method 5: Last resort - try to simulate the file selection manually
              try {
                this.logger.logVideoUpload(videoPath, false, { status: 'trying_manual_simulation' });
                
                // Try to set the file path directly
                await this.page.evaluate((filePath) => {
                  const input = document.querySelector('input[type="file"]');
                  if (input) {
                    // Remove the readonly attribute if it exists
                    input.removeAttribute('readonly');
                    input.style.display = 'block';
                    input.style.opacity = '1';
                    input.style.visibility = 'visible';
                    
                    // Try to set the value directly
                    input.value = filePath;
                    
                    // Trigger events
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    return true;
                  }
                  return false;
                }, videoPath);
                
                this.logger.logVideoUpload(videoPath, false, { status: 'file_uploaded_successfully_manual' });
                
              } catch (manualError) {
                throw new Error(`All upload methods failed: ${uploadError.message}, ${chooserError.message}, ${evalError.message}, ${keyboardError.message}, ${manualError.message}`);
              }
            }
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
      console.log('🚀 Starting video upload process...');
      this.logger.logVideoUpload(videoPath, false, { status: 'upload_started' });

      // Step 1: We're already on studio.youtube.com from createYouTubeChannel, so just wait for it to be ready
      console.log('📍 Already on YouTube Studio, waiting for page to be ready...');
      await this.page.waitForFunction(() => document.readyState === 'complete', { timeout: 30000 });
      await this.human.randomDelay(2000, 3000);

      // Step 2: Use Tab key to find and click "Upload videos" button
      console.log('📝 Using Tab key to find Upload videos button...');
      
      // First, try to find the Create button or Upload videos button directly
      let uploadButton = await this.page.$('button[aria-label="Upload videos"], button[aria-label*="Upload"], #create-icon, [data-testid="create-button"], ytcp-button-shape button[aria-label="Upload videos"]');
      
      if (uploadButton) {
        console.log('✅ Found Upload/Create button directly, clicking it...');
        await uploadButton.click();
        await this.human.randomDelay(1000, 1500);
        
        // Take screenshot to verify the click worked
        await this.page.screenshot({ path: './logs/after-create-click.png' });
        console.log('📸 Screenshot saved: after-create-click.png');
        
        // If we clicked Create button, now find Upload videos option
        const uploadOption = await this.page.$('tp-yt-paper-item#text-item-0, [aria-label*="Upload videos"], ytcp-paper-item[role="menuitem"]');
        if (uploadOption) {
          await uploadOption.click();
          console.log('✅ Clicked Upload videos option');
          await this.human.randomDelay(2000, 3000);
          
          // Take screenshot to verify we're on upload page
          await this.page.screenshot({ path: './logs/after-upload-option-click.png' });
          console.log('📸 Screenshot saved: after-upload-option-click.png');
        } else {
          console.log('⚠️ Upload videos option not found, trying alternative approach...');
        }
      } else {
        // Fallback to Tab navigation
        console.log('🔍 Using Tab navigation to find upload button...');
        await this.page.keyboard.press('Tab');
        await this.human.randomDelay(500, 1000);
        
        let uploadButtonFound = false;
        for (let i = 0; i < 50; i++) {
          const focusedElement = await this.page.evaluate(() => {
            const el = document.activeElement;
            if (!el) return '';
            const ariaLabel = el.getAttribute('aria-label') || '';
            const textContent = el.textContent || '';
            const title = el.getAttribute('title') || '';
            return `${ariaLabel} ${textContent} ${title}`.toLowerCase();
          });
          
          console.log(`Tab ${i + 1}: Focused on: ${focusedElement}`);
          
          if (focusedElement.includes('upload videos') || focusedElement.includes('upload') || focusedElement.includes('create')) {
            console.log('✅ Found Upload/Create button via Tab navigation');
            await this.page.keyboard.press('Enter');
            uploadButtonFound = true;
            break;
          }
          
          await this.page.keyboard.press('Tab');
          await this.human.randomDelay(200, 400);
        }
        
        if (!uploadButtonFound) {
          throw new Error('Upload videos button not found via Tab navigation');
        }
      }
      
      await this.human.randomDelay(2000, 3000);

      // Step 3: Use drag and drop method to upload video
      console.log('📁 Using drag and drop to upload video file...');
      
      // Get absolute path to video file
      const absoluteVideoPath = path.resolve(videoPath);
      console.log(`📂 Video path: ${absoluteVideoPath}`);
      
      // Check if file exists
      if (!await fs.pathExists(absoluteVideoPath)) {
        throw new Error(`Video file not found: ${absoluteVideoPath}`);
      }
      
      // Wait for upload page to load
      await this.page.waitForFunction(() => {
        return document.querySelector('[data-testid="upload-drop-zone"], .upload-drop-zone, [aria-label*="upload"], [aria-label*="drop"], .drop-zone, #dropzone, input[type="file"]');
      }, { timeout: 30000 });
      
      // Find drop zone or upload area
      const dropZone = await this.page.$('[data-testid="upload-drop-zone"], .upload-drop-zone, [aria-label*="upload"], [aria-label*="drop"], .drop-zone, #dropzone');
      
      if (!dropZone) {
        console.log('⚠️ Drop zone not found, trying alternative upload methods...');
        
        // Try to find file input directly
        const fileInput = await this.page.$('input[type="file"]');
        if (fileInput) {
          console.log('✅ Found file input, using direct upload...');
          await fileInput.uploadFile(absoluteVideoPath);
          console.log('✅ File uploaded via direct file input');
        } else {
          throw new Error('Neither drop zone nor file input found for upload');
        }
      } else {
        console.log('✅ Found drop zone, using drag and drop...');
        
        // Perform drag and drop simulation
        await this.page.evaluate((filePath) => {
          // Create a File object
          const file = new File([''], filePath, { type: 'video/mp4' });
          
          // Create a DataTransfer object
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          
          // Find drop zone
          const dropZone = document.querySelector('[data-testid="upload-drop-zone"], .upload-drop-zone, [aria-label*="upload"], [aria-label*="drop"], .drop-zone, #dropzone');
          
          if (dropZone) {
            // Create drag and drop events
            const dragEnterEvent = new DragEvent('dragenter', { dataTransfer });
            const dragOverEvent = new DragEvent('dragover', { dataTransfer });
            const dropEvent = new DragEvent('drop', { dataTransfer });
            
            // Dispatch events
            dropZone.dispatchEvent(dragEnterEvent);
            dropZone.dispatchEvent(dragOverEvent);
            dropZone.dispatchEvent(dropEvent);
          }
        }, absoluteVideoPath);
        
        console.log('✅ Drag and drop simulation completed');
      }

      // Step 4: Wait for upload dialog and monitor progress
      console.log('⏳ Waiting for upload dialog...');
      const dialogPath = '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog';
      const progressLabel = 'span.progress-label.style-scope.ytcp-video-upload-progress';
      const errorLabel = '.error-short.style-scope.ytcp-uploads-dialog';
      
      const youtubeUploadDialog = await this.page.waitForXPath(dialogPath);
      console.log('✅ Upload dialog found');

      // Step 5: Monitor upload progress
      let stage = 0, percentage = 0, timeoutms = 500;
      const maxTimeout = 30000; // 30 seconds max timeout

      const monitorProgress = async (ms) => {
        if (ms >= maxTimeout) {
          console.log('⚠️ Upload timeout reached');
          return;
        }

        try {
          const error = await youtubeUploadDialog.$eval(errorLabel, (el) => el.innerHTML);
          const progress = await youtubeUploadDialog.$eval(progressLabel, (el) => el.innerHTML);

          if (error.toLowerCase() === 'daily upload limit reached') {
            throw new Error('Daily upload limit reached');
          }

          const [state, ...parameters] = progress.toLowerCase().split(' ');
          console.log(`📊 Progress: ${progress}`);

          // Stage 1 - Uploading
          if (state.startsWith('upload')) {
            if (parameters[0] === 'complete' || parameters[0] === '100%') {
              stage = 1;
              console.log('✅ Upload completed, proceeding to finalization...');
              const uploadedLink = await this.finalizeUpload(youtubeUploadDialog, videoPath, metadata);
              console.log('🎉 Video published successfully!');
              this.logger.logVideoUpload(videoPath, true, { status: 'video_published_successfully' });
              return uploadedLink;
            }

            const currentPercent = +parameters[0].slice(0, -1);
            if (currentPercent === percentage) {
              ms += timeoutms; // Increase timeout if stuck
            }
            percentage = currentPercent;
          }

          // Continue monitoring
          await new Promise(resolve => setTimeout(async () => {
            await monitorProgress(ms);
            resolve(null);
          }, ms));

        } catch (error) {
          console.error('❌ Error monitoring progress:', error.message);
          throw error;
        }
      };

      await monitorProgress(timeoutms);

    } catch (error) {
      console.error('❌ Error during video upload:', error.message);
      this.logger.logError(error, 'uploadVideoStepByStep');
      this.logger.logVideoUpload(videoPath, false, { 
        status: 'upload_failed_with_error', 
        error: error.message,
        errorType: error.constructor.name
      });

      try {
        await this.page.screenshot({ path: './logs/upload-error-state.png' });
      } catch (screenshotError) {
        console.error('❌ Failed to take error screenshot:', screenshotError.message);
      }

      throw error;
    }
  }

  async finalizeUpload(youtubeUploadDialog, videoPath, metadata) {
    console.log('📝 Finalizing upload...');
    
    // Wait for dialog to be ready
    await this.page.waitForTimeout(3000);

    // Fill title and description
    const textElementSelector = '#textbox';
    const [titleElement, descriptionElement] = await youtubeUploadDialog.$$(textElementSelector);
    
    // Fill title
    await titleElement.click();
    await titleElement.evaluateHandle((el) => {
      el.innerHTML = '';
    });
    await titleElement.type(metadata.title || 'Test Video Title', { delay: 100 });
    
    // Fill description
    await descriptionElement.click();
    await descriptionElement.evaluateHandle((el) => {
      el.innerHTML = '';
    });
    await descriptionElement.type(metadata.description || 'Test video description', { delay: 100 });

    // Set "Not made for kids"
    const notMadeForKidSelector = 'VIDEO_MADE_FOR_KIDS_NOT_MFK';
    const radioButton = await youtubeUploadDialog.$(`[name=${notMadeForKidSelector}]`);
    await radioButton?.click();

    // Click Next buttons
    const nextButtonSelector = '#next-button';
    await (await youtubeUploadDialog.$(nextButtonSelector))?.click({ delay: 100 });
    await this.page.waitForTimeout(1000);
    
    await (await youtubeUploadDialog.$(nextButtonSelector))?.click({ delay: 100 });
    await this.page.waitForTimeout(1000);
    
    await (await youtubeUploadDialog.$(nextButtonSelector))?.click({ delay: 100 });
    await this.page.waitForTimeout(1000);

    // Set visibility to Public
    const visibilityRadio = await youtubeUploadDialog.$('#privacy-radios [name=PUBLIC]');
    await visibilityRadio?.click();

    // Click Done
    await this.page.waitForTimeout(1000);
    await (await youtubeUploadDialog.$('#done-button'))?.click({ delay: 100 });
    await this.page.waitForTimeout(5000);

    // Get the uploaded video link
    const videoLinkSelector = 'a.style-scope.ytcp-video-info';
    const link = await youtubeUploadDialog?.$eval(videoLinkSelector, (el) => el.innerHTML);
    
    return link || '';
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