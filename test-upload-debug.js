const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');
const { logger } = require('./utils/logger');
const GoLoginAPI = require('./utils/gologin');
const YouTubeAutomation = require('./utils/youtubeAutomation');
const ProfileLogger = require('./utils/profileLogger');

async function testUploadDebug() {
  const gologin = new GoLoginAPI();
  let browser = null;
  let page = null;
  let profileId = null;

  try {
    console.log('🔍 Starting upload debug test...');
    
    // Load account
    const accounts = await fs.readJson('./accounts.json');
    const account = accounts[0];
    console.log(`📧 Using account: ${account.email}`);
    
    // Create GoLogin profile
    console.log('🔄 Creating GoLogin profile...');
    profileId = await gologin.createProfile(account.email);
    console.log(`✅ Profile created: ${profileId}`);
    
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await gologin.launchBrowser(profileId);
    page = await browser.newPage();
    await page.setViewport(config.browser.viewport);
    await page.setDefaultTimeout(config.browser.defaultTimeout);
    console.log('✅ Browser launched');
    
    // Initialize YouTube automation
    const profileLogger = new ProfileLogger(account.email, 'debug_test');
    const youtubeBot = new YouTubeAutomation(page, profileLogger);
    
    // Login to Gmail
    console.log('🔐 Logging into Gmail...');
    await youtubeBot.loginToGmail(account.email, account.password);
    console.log('✅ Gmail login successful');
    
    // Create YouTube channel
    console.log('📺 Creating YouTube channel...');
    await youtubeBot.createYouTubeChannel();
    console.log('✅ YouTube channel created');
    
    // Check if video exists
    const videoPath = './videos/1.mp4';
    if (!await fs.pathExists(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
    console.log(`📹 Video file found: ${videoPath}`);
    
    // Navigate to studio
    console.log('🏢 Navigating to YouTube Studio...');
    await page.goto('https://studio.youtube.com', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('✅ Navigated to YouTube Studio');
    
    // Take screenshot of initial state
    await page.screenshot({ path: './logs/debug-studio-initial.png' });
    console.log('📸 Screenshot saved: debug-studio-initial.png');
    
    // Look for Create button
    console.log('🔍 Looking for Create button...');
    let createButton = await page.$('button[aria-label*="Create"]');
    
    if (!createButton) {
      createButton = await page.$('[data-testid="create-button"]');
    }
    
    if (!createButton) {
      // Try to find by text content
      const buttons = await page.$$('button');
      for (const button of buttons) {
        try {
          const text = await button.evaluate(el => el.textContent?.trim());
          if (text === 'Create' || text?.includes('Create')) {
            createButton = button;
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!createButton) {
      console.log('❌ Create button not found');
      await page.screenshot({ path: './logs/debug-create-button-not-found.png' });
      
      // List all buttons on the page
      const buttons = await page.$$('button');
      console.log(`📋 Found ${buttons.length} buttons on the page`);
      
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        try {
          const text = await buttons[i].evaluate(el => el.textContent?.trim());
          const ariaLabel = await buttons[i].evaluate(el => el.getAttribute('aria-label'));
          console.log(`Button ${i + 1}: text="${text}", aria-label="${ariaLabel}"`);
        } catch (e) {
          console.log(`Button ${i + 1}: [error reading button]`);
        }
      }
      return;
    }
    
    console.log('✅ Create button found');
    await createButton.click();
    console.log('✅ Clicked Create button');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot after clicking Create
    await page.screenshot({ path: './logs/debug-after-create-click.png' });
    console.log('📸 Screenshot saved: debug-after-create-click.png');
    
    // Look for Upload videos option
    console.log('🔍 Looking for Upload videos option...');
    let uploadOption = await page.$('div[aria-label*="Upload videos"]');
    
    if (!uploadOption) {
      uploadOption = await page.$('a[aria-label*="Upload videos"]');
    }
    
    if (!uploadOption) {
      uploadOption = await page.$('tp-yt-paper-item#text-item-0');
    }
    
    if (!uploadOption) {
      // Try to find by text content
      const elements = await page.$$('div, a, button, tp-yt-paper-item, ytcp-paper-item');
      for (const element of elements) {
        try {
          const text = await element.evaluate(el => el.textContent?.trim());
          if (text === 'Upload videos' || text?.includes('Upload videos')) {
            uploadOption = element;
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!uploadOption) {
      console.log('❌ Upload videos option not found');
      await page.screenshot({ path: './logs/debug-upload-option-not-found.png' });
      
      // List all elements that might contain "Upload videos"
      const elements = await page.$$('div, a, button, tp-yt-paper-item, ytcp-paper-item');
      console.log(`📋 Found ${elements.length} potential elements`);
      
      for (let i = 0; i < Math.min(elements.length, 20); i++) {
        try {
          const text = await elements[i].evaluate(el => el.textContent?.trim());
          const ariaLabel = await elements[i].evaluate(el => el.getAttribute('aria-label'));
          if (text && text.includes('Upload')) {
            console.log(`Element ${i + 1}: text="${text}", aria-label="${ariaLabel}"`);
          }
        } catch (e) {
          // Ignore errors
        }
      }
      return;
    }
    
    console.log('✅ Upload videos option found');
    await uploadOption.click();
    console.log('✅ Clicked Upload videos option');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Take screenshot of upload page
    await page.screenshot({ path: './logs/debug-upload-page.png' });
    console.log('📸 Screenshot saved: debug-upload-page.png');
    
    // Look for file input
    console.log('🔍 Looking for file input...');
    let fileInput = await page.$('input[type="file"]');
    
    if (!fileInput) {
      console.log('❌ File input not found');
      await page.screenshot({ path: './logs/debug-file-input-not-found.png' });
      
      // Look for upload buttons
      const uploadButtons = await page.$$('button');
      console.log(`📋 Found ${uploadButtons.length} buttons`);
      
      for (let i = 0; i < uploadButtons.length; i++) {
        try {
          const text = await uploadButtons[i].evaluate(el => el.textContent?.trim());
          if (text && (text.includes('Upload') || text.includes('SELECT FILES') || text.includes('Select files'))) {
            console.log(`Upload button ${i + 1}: "${text}"`);
          }
        } catch (e) {
          console.log(`Upload button ${i + 1}: [error reading button]`);
        }
      }
      return;
    }
    
    console.log('✅ File input found');
    
    // Check if file input is visible
    let isVisible = await fileInput.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    });
    console.log(`📊 File input visible: ${isVisible}`);
    
    // If file input is not visible, try to click upload buttons to make it visible
    if (!isVisible) {
      console.log('🔍 File input not visible, looking for upload buttons...');
      
      const uploadButtons = await page.$$('button');
      let uploadButtonClicked = false;
      
      for (const button of uploadButtons) {
        try {
          const text = await button.evaluate(el => el.textContent?.trim());
          if (text && (text.includes('Upload') || text.includes('SELECT FILES') || text.includes('Select files'))) {
            console.log(`🖱️ Clicking upload button: "${text}"`);
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            uploadButtonClicked = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (uploadButtonClicked) {
        // Take screenshot after clicking upload button
        await page.screenshot({ path: './logs/debug-after-upload-button-click.png' });
        console.log('📸 Screenshot saved: debug-after-upload-button-click.png');
        
        // Wait a bit more for the popup to fully load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Look for the new popup interface with "Select files" button
        console.log('🔍 Looking for "Select files" button in popup...');
        const selectFilesButtons = await page.$$('button');
        let selectFilesButtonFound = false;
        
        for (const button of selectFilesButtons) {
          try {
            const text = await button.evaluate(el => el.textContent?.trim());
            if (text && (text.includes('Select files') || text.includes('SELECT FILES') || text.includes('Choose files'))) {
              console.log(`🎯 Found "Select files" button: "${text}"`);
              await button.click();
              console.log('✅ Clicked "Select files" button');
              await new Promise(resolve => setTimeout(resolve, 2000));
              selectFilesButtonFound = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!selectFilesButtonFound) {
          console.log('🔍 Looking for drag-and-drop area...');
          // Look for drag-and-drop areas
          const dropZones = await page.$$('[data-testid="upload-drop-zone"], .upload-drop-zone, [aria-label*="drop"], div[role="button"]');
          
          for (const dropZone of dropZones) {
            try {
              const text = await dropZone.evaluate(el => el.textContent?.trim());
              const ariaLabel = await dropZone.evaluate(el => el.getAttribute('aria-label'));
              console.log(`📁 Found potential drop zone: text="${text}", aria-label="${ariaLabel}"`);
              
              if (text && (text.includes('drag') || text.includes('drop') || text.includes('upload'))) {
                console.log('🎯 Found drag-and-drop area, trying to upload file...');
                
                // Try to upload file to the drop zone
                await dropZone.uploadFile(videoPath);
                console.log('✅ File uploaded to drop zone');
                selectFilesButtonFound = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
        
        // Check if file input is now visible
        fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          isVisible = await fileInput.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
          });
          console.log(`📊 File input visible after popup interaction: ${isVisible}`);
        }
        
        // Take screenshot of current state
        await page.screenshot({ path: './logs/debug-after-popup-interaction.png' });
        console.log('📸 Screenshot saved: debug-after-popup-interaction.png');
      }
    }
    
    if (isVisible) {
      console.log('📤 Uploading video file...');
      await fileInput.uploadFile(videoPath);
      console.log('✅ Video file uploaded');
      
      // Wait for upload to start
      await new Promise(resolve => setTimeout(resolve, 10000));
      await page.screenshot({ path: './logs/debug-upload-progress.png' });
      console.log('📸 Screenshot saved: debug-upload-progress.png');
      
      console.log('✅ Upload test completed successfully!');
    } else {
      console.log('❌ File input is still not visible after trying popup interaction');
      await page.screenshot({ path: './logs/debug-file-input-still-hidden.png' });
      console.log('📸 Screenshot saved: debug-file-input-still-hidden.png');
      
      // List all buttons and elements on the page for debugging
      console.log('🔍 Listing all buttons and elements for debugging...');
      const allButtons = await page.$$('button');
      const allDivs = await page.$$('div[role="button"], div[data-testid]');
      
      console.log(`📋 Found ${allButtons.length} buttons and ${allDivs.length} interactive divs`);
      
      for (let i = 0; i < Math.min(allButtons.length, 15); i++) {
        try {
          const text = await allButtons[i].evaluate(el => el.textContent?.trim());
          const ariaLabel = await allButtons[i].evaluate(el => el.getAttribute('aria-label'));
          if (text) {
            console.log(`Button ${i + 1}: "${text}" (aria-label: "${ariaLabel}")`);
          }
        } catch (e) {
          console.log(`Button ${i + 1}: [error reading button]`);
        }
      }
      
      for (let i = 0; i < Math.min(allDivs.length, 10); i++) {
        try {
          const text = await allDivs[i].evaluate(el => el.textContent?.trim());
          const ariaLabel = await allDivs[i].evaluate(el => el.getAttribute('aria-label'));
          const dataTestId = await allDivs[i].evaluate(el => el.getAttribute('data-testid'));
          if (text || ariaLabel || dataTestId) {
            console.log(`Div ${i + 1}: text="${text}", aria-label="${ariaLabel}", data-testid="${dataTestId}"`);
          }
        } catch (e) {
          console.log(`Div ${i + 1}: [error reading div]`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    if (page) {
      await page.screenshot({ path: './logs/debug-error.png' });
      console.log('📸 Error screenshot saved: debug-error.png');
    }
  } finally {
    // Clean up
    if (browser) {
      await browser.close();
    }
    
    if (profileId) {
      try {
        await gologin.deleteProfile(profileId);
        console.log('🧹 Profile cleaned up');
      } catch (error) {
        console.log('⚠️ Failed to clean up profile:', error.message);
      }
    }
    
    try {
      await gologin.exit();
    } catch (error) {
      console.log('⚠️ Failed to exit GoLogin:', error.message);
    }
  }
}

// Run the debug test
testUploadDebug().catch(console.error);
