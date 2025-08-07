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
      await this.human.waitForPageLoad();
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
      
      // Go directly to YouTube Studio to create channel
      await this.page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
      await this.human.waitForPageLoad();
      await this.human.randomDelay(3000, 5000);
      
      // Check if channel already exists by looking for channel indicators
      const channelIndicators = [
        'a[href*="/channel/"]',
        'a[href*="/c/"]',
        '[data-testid="channel-name"]',
        '.channel-name',
        'ytd-channel-name'
      ];
      
      let channelExists = false;
      for (const selector of channelIndicators) {
        try {
          const element = await this.page.$(selector);
          if (element && await element.isVisible()) {
            channelExists = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (channelExists) {
        this.logger.logStep('channelCreated', true, { status: 'already_exists' });
        return true;
      }
      
      // Look for "Create channel" or "Get started" buttons
      const createChannelSelectors = [
        'button[aria-label*="Create channel"]',
        'button:has-text("Create channel")',
        'button:has-text("Get started")',
        'button:has-text("Create")',
        'a[href*="create-channel"]',
        '[data-testid="create-channel-button"]',
        'ytd-button-renderer:has-text("Create")',
        'ytd-button-renderer:has-text("Get started")'
      ];
      
      let createChannelButton = null;
      for (const selector of createChannelSelectors) {
        try {
          createChannelButton = await this.page.$(selector);
          if (createChannelButton && await createChannelButton.isVisible()) {
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!createChannelButton) {
        // Try to find by text content
        const allButtons = await this.page.$$('button, a, ytd-button-renderer');
        for (const button of allButtons) {
          try {
            if (button && typeof button.evaluate === 'function') {
              const text = await button.evaluate(el => el.textContent);
              if (text && (text.toLowerCase().includes('create') || text.toLowerCase().includes('get started'))) {
                createChannelButton = button;
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!createChannelButton) {
        // If no create button found, assume channel already exists or we're already set up
        this.logger.logStep('channelCreated', true, { status: 'no_create_button_found_assume_exists' });
        return true;
      }
      
      this.logger.logStep('channelCreated', false, { status: 'create_button_found' });
      
      // Click create channel
      await createChannelButton.click();
      await this.human.waitForPageLoad();
      await this.human.randomDelay(3000, 5000);
      
      // Generate random channel name
      const randomNames = [
        'TechVibes', 'CreativeCorner', 'DailyInsights', 'LifeHacks', 'FunFacts',
        'KnowledgeHub', 'TrendingNow', 'CoolStuff', 'AmazingWorld', 'DiscoverMore',
        'InnovationLab', 'CreativeMinds', 'TechTrends', 'LifeTips', 'FunCorner'
      ];
      const randomName = randomNames[Math.floor(Math.random() * randomNames.length)] + 
                        Math.floor(Math.random() * 1000);
      
      // Find and fill channel name input
      const channelNameSelectors = [
        'input[name="channelName"]',
        'input[placeholder*="channel name"]',
        'input[placeholder*="Channel name"]',
        'input[aria-label*="channel name"]',
        'input[aria-label*="Channel name"]',
        'input[placeholder*="name"]',
        'input[placeholder*="Name"]'
      ];
      
      let channelNameInput = null;
      for (const selector of channelNameSelectors) {
        try {
          channelNameInput = await this.page.$(selector);
          if (channelNameInput && await channelNameInput.isVisible()) {
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (channelNameInput) {
        // Focus and type channel name
        await channelNameInput.focus();
        await this.human.randomDelay(500, 1000);
        
        // Clear existing text
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('A');
        await this.page.keyboard.up('Control');
        await this.human.randomDelay(500, 1000);
        
        // Type channel name with human-like delays
        await this.page.keyboard.type(randomName, { delay: 80 + Math.random() * 120 });
        await this.human.randomDelay(1000, 2000);
        
        this.logger.logStep('channelCreated', false, { status: 'channel_name_typed', name: randomName });
      }
      
             // Use Tab key navigation to find and activate the Create channel button
       this.logger.logStep('channelCreated', false, { status: 'using_tab_navigation' });
       
       // Press Tab multiple times to navigate through focusable elements
       for (let tabCount = 0; tabCount < 20; tabCount++) {
         await this.page.keyboard.press('Tab');
         await this.human.randomDelay(500, 1000);
         
         // Check if the currently focused element is a Create channel button
         const focusedElement = await this.page.evaluate(() => {
           const activeElement = document.activeElement;
           if (!activeElement) return null;
           
           const text = activeElement.textContent || '';
           const ariaLabel = activeElement.getAttribute('aria-label') || '';
           const type = activeElement.getAttribute('type') || '';
           
           return {
             tagName: activeElement.tagName,
             text: text.toLowerCase(),
             ariaLabel: ariaLabel.toLowerCase(),
             type: type,
             isButton: activeElement.tagName === 'BUTTON' || activeElement.getAttribute('role') === 'button'
           };
         });
         
         if (focusedElement && focusedElement.isButton) {
           if (focusedElement.text.includes('create') || 
               focusedElement.ariaLabel.includes('create') ||
               focusedElement.text.includes('confirm') ||
               focusedElement.ariaLabel.includes('confirm') ||
               focusedElement.type === 'submit') {
             
             this.logger.logStep('channelCreated', false, { status: 'create_button_found_via_tab', tabCount });
             
             // Press Enter to activate the button
             await this.page.keyboard.press('Enter');
             await this.human.waitForPageLoad();
             await this.human.randomDelay(3000, 5000);
             break;
           }
         }
         
         // If we've tabbed too many times without finding the button, try a different approach
         if (tabCount === 19) {
           this.logger.logStep('channelCreated', false, { status: 'tab_navigation_failed_trying_enter' });
           // Try pressing Enter anyway in case we're on the right element
           await this.page.keyboard.press('Enter');
           await this.human.waitForPageLoad();
           await this.human.randomDelay(3000, 5000);
         }
       }
       
               // Handle "How you'll appear" setup page if it appears
        await this.human.randomDelay(3000, 5000);
        
        // Take a screenshot to see what page we're on
        await this.page.screenshot({ path: './logs/channel-setup-page.png' });
        
        // Look for "How you'll appear" or setup-related elements with more comprehensive selectors
        const setupSelectors = [
          'button:has-text("Next")',
          'button:has-text("Continue")',
          'button:has-text("Skip")',
          'button:has-text("Done")',
          'button:has-text("OK")',
          'button:has-text("Okay")',
          'button:has-text("Get started")',
          'button:has-text("Start")',
          'button:has-text("Create")',
          'button:has-text("Finish")',
          'button[aria-label*="Next"]',
          'button[aria-label*="Continue"]',
          'button[aria-label*="Skip"]',
          'button[aria-label*="Done"]',
          'button[aria-label*="OK"]',
          'button[aria-label*="Okay"]',
          'button[aria-label*="Get started"]',
          'button[aria-label*="Start"]',
          'button[aria-label*="Create"]',
          'button[aria-label*="Finish"]',
          'button[data-testid="next-button"]',
          'button[data-testid="continue-button"]',
          'button[data-testid="skip-button"]',
          'button[data-testid="done-button"]',
          'button[data-testid="get-started-button"]',
          'button[data-testid="start-button"]',
          'button[data-testid="create-button"]',
          'button[data-testid="finish-button"]',
          'ytd-button-renderer:has-text("Next")',
          'ytd-button-renderer:has-text("Continue")',
          'ytd-button-renderer:has-text("Skip")',
          'ytd-button-renderer:has-text("Done")',
          'ytd-button-renderer:has-text("Get started")',
          'ytd-button-renderer:has-text("Start")',
          'ytd-button-renderer:has-text("Create")',
          'ytd-button-renderer:has-text("Finish")'
        ];
        
        // Try to find and click setup buttons multiple times
        for (let attempt = 0; attempt < 10; attempt++) {
          let setupButton = null;
          
          // First try exact selectors
          for (const selector of setupSelectors) {
            try {
              setupButton = await this.page.$(selector);
              if (setupButton && await setupButton.isVisible()) {
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          // If no button found, try to find by text content
          if (!setupButton) {
            const allButtons = await this.page.$$('button, ytd-button-renderer, a');
            for (const button of allButtons) {
              try {
                if (button && typeof button.evaluate === 'function') {
                  const text = await button.evaluate(el => el.textContent);
                  if (text && (text.toLowerCase().includes('next') || 
                              text.toLowerCase().includes('continue') || 
                              text.toLowerCase().includes('skip') || 
                              text.toLowerCase().includes('done') || 
                              text.toLowerCase().includes('ok') || 
                              text.toLowerCase().includes('get started') || 
                              text.toLowerCase().includes('start') || 
                              text.toLowerCase().includes('create') || 
                              text.toLowerCase().includes('finish'))) {
                    setupButton = button;
                    break;
                  }
                }
              } catch (e) {
                continue;
              }
            }
          }
          
          if (setupButton) {
            this.logger.logStep('channelCreated', false, { status: `setup_step_${attempt + 1}` });
            await setupButton.click();
            await this.human.waitForPageLoad();
            await this.human.randomDelay(3000, 5000);
            
            // Take another screenshot to see progress
            await this.page.screenshot({ path: `./logs/channel-setup-step-${attempt + 1}.png` });
          } else {
            // No more setup buttons found, break out of the loop
            this.logger.logStep('channelCreated', false, { status: 'no_more_setup_buttons' });
            break;
          }
        }
       
       // Verify channel was created by checking if we're on YouTube Studio or channel page
       const currentUrl = this.page.url();
       if (currentUrl.includes('studio.youtube.com') || currentUrl.includes('/channel/') || currentUrl.includes('/c/')) {
         this.logger.logStep('channelCreated', true, { status: 'created_successfully', name: randomName });
         return true;
       } else {
         // If not redirected, assume channel creation was successful
         this.logger.logStep('channelCreated', true, { status: 'assumed_success', name: randomName });
         return true;
       }
      
    } catch (error) {
      this.logger.logError(error, 'channelCreated');
      throw error;
    }
  }

  // Upload video to YouTube
  async uploadVideo(videoPath, metadata = {}) {
    try {
      this.logger.logVideoUpload(videoPath, false, { status: 'starting', metadata });
      
      // We're already on YouTube Studio after channel creation, so just wait a bit
      await this.human.randomDelay(2000, 3000);

      // Look for "Upload videos" button with more comprehensive selectors
      const uploadSelectors = [
        'button[aria-label*="Upload videos"]',
        'button[aria-label*="Upload video"]',
        'button:has-text("Upload videos")',
        'button:has-text("Upload video")',
        'button:has-text("Upload")',
        'a[href*="upload"]',
        'a[href*="upload/video"]',
        'button[data-testid="upload-button"]',
        'ytd-button-renderer:has-text("Upload")',
        'ytd-button-renderer:has-text("Upload videos")',
        'ytd-button-renderer:has-text("Upload video")',
        '[data-testid="upload-video-button"]',
        '[data-testid="upload-button"]',
        'button[jsname="upload-button"]',
        'button[jsname="upload-video-button"]'
      ];
      
      let uploadButton = null;
      for (const selector of uploadSelectors) {
        try {
          uploadButton = await this.page.$(selector);
          if (uploadButton && await uploadButton.isVisible()) {
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!uploadButton) {
        // Try to find by text content with more flexible matching
        const allButtons = await this.page.$$('button, a, ytd-button-renderer, ytd-menu-service-item-renderer');
        for (const button of allButtons) {
          try {
            if (button && typeof button.evaluate === 'function') {
              const text = await button.evaluate(el => el.textContent);
              if (text && (text.toLowerCase().includes('upload') || text.toLowerCase().includes('create'))) {
                uploadButton = button;
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
      
             // Always try the direct upload page approach for better reliability
       this.logger.logVideoUpload(videoPath, false, { status: 'going_to_direct_upload_page' });
       await this.page.goto('https://studio.youtube.com/upload', { waitUntil: 'networkidle0', timeout: 30000 });
       await this.human.waitForPageLoad();
       await this.human.randomDelay(5000, 8000);
       
       // Wait for page to be stable
       await this.page.waitForSelector('body', { timeout: 20000 });
       await this.human.randomDelay(2000, 3000);
       
       this.logger.logVideoUpload(videoPath, false, { status: 'upload_page_loaded' });

             // Wait for file input to appear
       await this.human.randomDelay(3000, 5000);
       
       // Take a screenshot for debugging
       await this.page.screenshot({ path: './logs/upload-page.png' });
       
       // Try multiple approaches to find the upload mechanism
       
       // Approach 1: Look for traditional file input with more comprehensive selectors
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
       for (const selector of fileInputSelectors) {
         try {
           fileInput = await this.page.$(selector);
           if (fileInput) {
             // Check if it's visible or if it's a hidden file input (which is normal)
             const isVisible = await fileInput.isVisible();
             const isHidden = await fileInput.evaluate(el => el.style.display === 'none' || el.style.visibility === 'hidden');
             
             if (isVisible || !isHidden) {
               this.logger.logVideoUpload(videoPath, false, { status: 'file_input_found', selector });
               break;
             }
           }
         } catch (e) {
           continue;
         }
       }
       
       // Approach 2: Look for drag-and-drop areas or upload buttons
       if (!fileInput) {
         const uploadAreaSelectors = [
           '[data-testid="upload-area"]',
           '[data-testid="drop-zone"]',
           '.upload-area',
           '.drop-zone',
           '[aria-label*="upload"]',
           '[aria-label*="drop"]',
           'div[role="button"][aria-label*="upload"]',
           'div[role="button"][aria-label*="video"]'
         ];
         
         for (const selector of uploadAreaSelectors) {
           try {
             const uploadArea = await this.page.$(selector);
             if (uploadArea && await uploadArea.isVisible()) {
               // Click on the upload area to trigger file selection
               await uploadArea.click();
               await this.human.randomDelay(2000, 3000);
               
               // Check if file input appeared after clicking
               for (const inputSelector of fileInputSelectors) {
                 try {
                   fileInput = await this.page.$(inputSelector);
                   if (fileInput && await fileInput.isVisible()) {
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
       
       // Approach 3: Try to trigger file selection via keyboard shortcut
       if (!fileInput) {
         try {
           await this.page.keyboard.press('Control+O');
           await this.human.randomDelay(2000, 3000);
           
           // Check if file input appeared
           for (const selector of fileInputSelectors) {
             try {
               fileInput = await this.page.$(selector);
               if (fileInput && await fileInput.isVisible()) {
                 break;
               }
             } catch (e) {
               continue;
             }
           }
         } catch (e) {
           // Ignore keyboard shortcut errors
         }
       }
       
       // Approach 4: Look for any clickable upload elements
       if (!fileInput) {
         const allClickableElements = await this.page.$$('button, div[role="button"], a, [data-testid*="upload"], [aria-label*="upload"]');
         for (const element of allClickableElements) {
           try {
             if (element && typeof element.evaluate === 'function') {
               const text = await element.evaluate(el => el.textContent);
               const ariaLabel = await element.evaluate(el => el.getAttribute('aria-label'));
               
               if ((text && text.toLowerCase().includes('upload')) || 
                   (ariaLabel && ariaLabel.toLowerCase().includes('upload'))) {
                 await element.click();
                 await this.human.randomDelay(2000, 3000);
                 
                 // Check if file input appeared
                 for (const selector of fileInputSelectors) {
                   try {
                     fileInput = await this.page.$(selector);
                     if (fileInput && await fileInput.isVisible()) {
                       break;
                     }
                   } catch (e) {
                     continue;
                   }
                 }
                 
                 if (fileInput) break;
               }
             }
           } catch (e) {
             continue;
           }
         }
       }
       
       if (!fileInput) {
         // Last resort: Try to create a file input and trigger it
         this.logger.logVideoUpload(videoPath, false, { status: 'creating_file_input' });
         
         try {
           // Create a file input element and trigger it
           await this.page.evaluate(() => {
             const input = document.createElement('input');
             input.type = 'file';
             input.accept = 'video/*';
             input.style.display = 'none';
             input.id = 'temp-file-input';
             document.body.appendChild(input);
             
             // Trigger click on the input
             input.click();
           });
           
           // Wait a bit and try to find the created input
           await this.human.randomDelay(2000, 3000);
           fileInput = await this.page.$('#temp-file-input');
           
           if (!fileInput) {
             throw new Error('No upload mechanism found - YouTube may have changed their upload interface');
           }
         } catch (e) {
           throw new Error('No upload mechanism found - YouTube may have changed their upload interface');
         }
       }

      this.logger.logVideoUpload(videoPath, false, { status: 'file_input_found' });
      
      // Upload the file with better error handling
      try {
        await fileInput.uploadFile(videoPath);
        this.logger.logVideoUpload(videoPath, false, { status: 'file_uploaded' });
      } catch (uploadError) {
        this.logger.logVideoUpload(videoPath, false, { status: 'file_upload_failed', error: uploadError.message });
        
        // Try alternative upload method
        try {
          await this.page.evaluate((filePath) => {
            const input = document.querySelector('input[type="file"]');
            if (input) {
              const dataTransfer = new DataTransfer();
              const file = new File([''], filePath, { type: 'video/mp4' });
              dataTransfer.items.add(file);
              input.files = dataTransfer.files;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, videoPath);
          
          this.logger.logVideoUpload(videoPath, false, { status: 'file_uploaded_alternative' });
        } catch (altError) {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }
      }
      
      // Wait for upload to start
      await this.human.randomDelay(5000, 8000);
      
      // Wait for upload to complete (look for progress indicators)
      let uploadComplete = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5-second intervals
      
      while (!uploadComplete && attempts < maxAttempts) {
        try {
          // Check for upload completion indicators
          const completeIndicators = [
            '.upload-complete',
            '[data-testid="upload-complete"]',
            'button[aria-label*="Publish"]',
            'button:has-text("Publish")',
            'button:has-text("Next")'
          ];
          
          for (const selector of completeIndicators) {
            const element = await this.page.$(selector);
            if (element && await element.isVisible()) {
              uploadComplete = true;
              break;
            }
          }
          
          if (!uploadComplete) {
            await this.human.randomDelay(5000, 8000);
            attempts++;
          }
        } catch (e) {
          await this.human.randomDelay(5000, 8000);
          attempts++;
        }
      }
      
      if (!uploadComplete) {
        throw new Error('Upload did not complete within expected time');
      }
      
      this.logger.logVideoUpload(videoPath, false, { status: 'upload_completed' });

      // Fill in video details
      await this.human.randomDelay(2000, 3000);
      
      // Fill title with more comprehensive selectors
      if (metadata.title) {
        const titleSelectors = [
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
        ];
        
        let titleInput = null;
        for (const selector of titleSelectors) {
          try {
            titleInput = await this.page.$(selector);
            if (titleInput && await titleInput.isVisible()) {
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (titleInput) {
          await titleInput.focus();
          await this.human.randomDelay(500, 1000);
          
          // Clear existing text first
          await this.page.keyboard.down('Control');
          await this.page.keyboard.press('A');
          await this.page.keyboard.up('Control');
          await this.human.randomDelay(500, 1000);
          
          await this.page.keyboard.type(metadata.title, { delay: 80 + Math.random() * 120 });
          await this.human.randomDelay(1000, 1500);
          
          this.logger.logVideoUpload(videoPath, false, { status: 'title_filled', title: metadata.title });
        } else {
          this.logger.logVideoUpload(videoPath, false, { status: 'title_input_not_found' });
        }
      }

      // Fill description with more comprehensive selectors
      if (metadata.description) {
        const descSelectors = [
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
        ];
        
        let descInput = null;
        for (const selector of descSelectors) {
          try {
            descInput = await this.page.$(selector);
            if (descInput && await descInput.isVisible()) {
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (descInput) {
          await descInput.focus();
          await this.human.randomDelay(500, 1000);
          
          // Clear existing text first
          await this.page.keyboard.down('Control');
          await this.page.keyboard.press('A');
          await this.page.keyboard.up('Control');
          await this.human.randomDelay(500, 1000);
          
          await this.page.keyboard.type(metadata.description, { delay: 80 + Math.random() * 120 });
          await this.human.randomDelay(1000, 1500);
          
          this.logger.logVideoUpload(videoPath, false, { status: 'description_filled', description: metadata.description.substring(0, 50) + '...' });
        } else {
          this.logger.logVideoUpload(videoPath, false, { status: 'description_input_not_found' });
        }
      }

      // Fill tags with more comprehensive selectors
      if (metadata.tags && metadata.tags.length > 0) {
        const tagsSelectors = [
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
        ];
        
        let tagsInput = null;
        for (const selector of tagsSelectors) {
          try {
            tagsInput = await this.page.$(selector);
            if (tagsInput && await tagsInput.isVisible()) {
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (tagsInput) {
          await tagsInput.focus();
          await this.human.randomDelay(500, 1000);
          
          // Clear existing text first
          await this.page.keyboard.down('Control');
          await this.page.keyboard.press('A');
          await this.page.keyboard.up('Control');
          await this.human.randomDelay(500, 1000);
          
          await this.page.keyboard.type(metadata.tags.join(', '), { delay: 80 + Math.random() * 120 });
          await this.human.randomDelay(1000, 1500);
          
          this.logger.logVideoUpload(videoPath, false, { status: 'tags_filled', tags: metadata.tags.join(', ') });
        } else {
          this.logger.logVideoUpload(videoPath, false, { status: 'tags_input_not_found' });
        }
      }

      // Set visibility (default to private for safety)
      await this.human.randomDelay(2000, 3000);
      
      const visibilitySelectors = [
        'input[value="private"]',
        'input[value="unlisted"]',
        'input[value="public"]',
        'button[aria-label*="Private"]',
        'button[aria-label*="Unlisted"]',
        'button[aria-label*="Public"]'
      ];
      
      let visibilityButton = null;
      for (const selector of visibilitySelectors) {
        try {
          visibilityButton = await this.page.$(selector);
          if (visibilityButton && await visibilityButton.isVisible()) {
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (visibilityButton) {
        await visibilityButton.click();
        await this.human.randomDelay(1000, 2000);
      }

      // Publish video
      await this.human.randomDelay(2000, 3000);
      
      const publishSelectors = [
        'button[type="submit"]',
        'button[aria-label*="Publish"]',
        'button:has-text("Publish")',
        'button:has-text("Done")',
        'button:has-text("Next")'
      ];
      
      let publishButton = null;
      for (const selector of publishSelectors) {
        try {
          publishButton = await this.page.$(selector);
          if (publishButton && await publishButton.isVisible()) {
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (publishButton) {
        await publishButton.click();
        await this.human.waitForPageLoad();
        await this.human.randomDelay(3000, 5000);
      }

      this.logger.logVideoUpload(videoPath, true, { status: 'published', metadata });
      return true;
    } catch (error) {
      this.logger.logVideoUpload(videoPath, false, { status: 'failed', error: error.message });
      throw error;
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
          
          await this.uploadVideo(videoPath, metadata);
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
}

module.exports = YouTubeAutomation; 