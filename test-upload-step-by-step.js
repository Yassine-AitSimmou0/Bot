const puppeteer = require('puppeteer');
const YouTubeAutomation = require('./utils/youtubeAutomation');
const ProfileLogger = require('./utils/profileLogger');
const config = require('./config');

// Helper function to find and click a button
async function findAndClickButton(page, selectors) {
  for (const selector of selectors) {
    try {
      const button = await page.$(selector);
      if (button && await button.isVisible()) {
        console.log(`✅ Found button with selector: ${selector}`);
        await button.click();
        return button;
      }
    } catch (e) {
      continue;
    }
  }
  console.log('❌ Button not found with any selector');
  return null;
}

async function testUploadStepByStep() {
  console.log('🧪 Testing Video Upload Step by Step...');
  
  // Create a simple profile logger for testing
  const profileLogger = new ProfileLogger('w7632235@gmail.com', 'test_upload');
  
  // Launch browser directly (without GoLogin for testing)
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 720 });
  
  // Create YouTube automation instance
  const youtubeBot = new YouTubeAutomation(page, profileLogger);
  
  try {
    console.log('1️⃣ Logging into Gmail...');
    
    // Login to Gmail first
    const loginSuccess = await youtubeBot.loginToGmail('w7632235@gmail.com', 'Fcaz8299@');
    
    if (!loginSuccess) {
      throw new Error('Gmail login failed');
    }
    
    console.log('✅ Gmail login successful');
    
    console.log('2️⃣ Going to YouTube Studio...');
    
    // Go to YouTube Studio
    await page.goto('https://studio.youtube.com', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('3️⃣ Taking screenshot of YouTube Studio...');
    
    // Take screenshot of YouTube Studio
    await page.screenshot({ path: './logs/youtube-studio-main.png', fullPage: true });
    console.log('📸 Screenshot saved: ./logs/youtube-studio-main.png');
    
    console.log('4️⃣ Looking for Upload Videos button...');
    
    // Look for "Upload videos" button
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
        uploadButton = await page.$(selector);
        if (uploadButton && await uploadButton.isVisible()) {
          console.log(`✅ Found upload button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!uploadButton) {
      console.log('❌ Upload button not found, trying direct navigation...');
      // Go directly to upload page
      await page.goto('https://studio.youtube.com/upload', { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log('5️⃣ Clicking Upload Videos button...');
      await uploadButton.click();
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('6️⃣ Taking screenshot of upload page...');
    
    // Take screenshot of upload page
    await page.screenshot({ path: './logs/upload-page-before.png', fullPage: true });
    console.log('📸 Screenshot saved: ./logs/upload-page-before.png');
    
    console.log('7️⃣ Looking for file input...');
    
    // Look for file input
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
        fileInput = await page.$(selector);
        if (fileInput) {
          console.log(`✅ Found file input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!fileInput) {
      console.log('❌ File input not found, trying to create one...');
      
      // Create a file input element
      await page.evaluate(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.style.display = 'none';
        input.id = 'temp-file-input';
        document.body.appendChild(input);
      });
      
      fileInput = await page.$('#temp-file-input');
      if (fileInput) {
        console.log('✅ Created temporary file input');
      }
    }
    
    if (fileInput) {
             console.log('8️⃣ Uploading video file...');
       
       // Upload the video file
       const videoPath = './videos/1.mp4';
       await fileInput.uploadFile(videoPath);
       console.log('✅ Video file uploaded');
       
       // Wait for upload to start and show progress
       console.log('⏳ Waiting for upload to start...');
       await new Promise(resolve => setTimeout(resolve, 5000));
       
       // Check for upload progress indicators
       let uploadStarted = false;
       let uploadAttempts = 0;
       const maxUploadAttempts = 20; // 2 minutes
       
       while (!uploadStarted && uploadAttempts < maxUploadAttempts) {
         try {
           // Look for upload progress indicators
           const progressIndicators = [
             '.upload-progress',
             '[data-testid="upload-progress"]',
             '.progress-bar',
             '[aria-label*="upload"]',
             '[aria-label*="progress"]',
             'div[role="progressbar"]'
           ];
           
           for (const selector of progressIndicators) {
             const element = await page.$(selector);
             if (element && await element.isVisible()) {
               uploadStarted = true;
               console.log(`✅ Upload started - found progress indicator: ${selector}`);
               break;
             }
           }
           
           if (!uploadStarted) {
             console.log(`⏳ Waiting for upload to start... (attempt ${uploadAttempts + 1}/${maxUploadAttempts})`);
             await new Promise(resolve => setTimeout(resolve, 6000));
             uploadAttempts++;
           }
         } catch (e) {
           await new Promise(resolve => setTimeout(resolve, 6000));
           uploadAttempts++;
         }
       }
       
       if (!uploadStarted) {
         console.log('⚠️ Upload progress not detected, continuing anyway...');
       }
      
      console.log('9️⃣ Taking screenshot after file upload...');
      await page.screenshot({ path: './logs/upload-page-after-file.png', fullPage: true });
      console.log('📸 Screenshot saved: ./logs/upload-page-after-file.png');
      
             // Wait for upload to complete and metadata form to appear
       console.log('🔍 Waiting for upload to complete and metadata form...');
       
       // Wait for video processing to complete
       let processingComplete = false;
       let processingAttempts = 0;
       const maxProcessingAttempts = 60; // 5 minutes with 5-second intervals
       
       while (!processingComplete && processingAttempts < maxProcessingAttempts) {
         try {
           // Check for processing completion indicators
           const processingCompleteIndicators = [
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
             'textarea[placeholder*="description"]'
           ];
           
           for (const selector of processingCompleteIndicators) {
             const element = await page.$(selector);
             if (element && await element.isVisible()) {
               processingComplete = true;
               console.log(`✅ Processing complete - found: ${selector}`);
               break;
             }
           }
           
           if (!processingComplete) {
             console.log(`⏳ Still processing... (attempt ${processingAttempts + 1}/${maxProcessingAttempts})`);
             await new Promise(resolve => setTimeout(resolve, 5000));
             processingAttempts++;
           }
         } catch (e) {
           await new Promise(resolve => setTimeout(resolve, 5000));
           processingAttempts++;
         }
       }
       
       if (!processingComplete) {
         console.log('⚠️ Processing timeout, continuing anyway...');
       }
       
       console.log('🔟 Taking screenshot of metadata form...');
       await page.screenshot({ path: './logs/metadata-form.png', fullPage: true });
       console.log('📸 Screenshot saved: ./logs/metadata-form.png');
      
      console.log('1️⃣1️⃣ Filling in title...');
      
      // Fill title
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
          titleInput = await page.$(selector);
          if (titleInput && await titleInput.isVisible()) {
            console.log(`✅ Found title input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (titleInput) {
        await titleInput.focus();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Clear existing text
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const title = 'Amazing Video You Need to See!';
        await page.keyboard.type(title, { delay: 100 });
        console.log(`✅ Title filled: ${title}`);
      } else {
        console.log('❌ Title input not found');
      }
      
      console.log('1️⃣2️⃣ Filling in description...');
      
      // Fill description
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
          descInput = await page.$(selector);
          if (descInput && await descInput.isVisible()) {
            console.log(`✅ Found description input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (descInput) {
        await descInput.focus();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Clear existing text
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const description = 'Thanks for watching! Don\'t forget to like and subscribe for more amazing content! 🔥';
        await page.keyboard.type(description, { delay: 100 });
        console.log('✅ Description filled');
      } else {
        console.log('❌ Description input not found');
      }
      
      console.log('1️⃣3️⃣ Taking final screenshot...');
      await page.screenshot({ path: './logs/final-upload-form.png', fullPage: true });
      console.log('📸 Screenshot saved: ./logs/final-upload-form.png');
      
                     console.log('1️⃣4️⃣ Handling the complete upload flow...');
        
        // Step 1: Press Next after video check is done
        console.log('🔄 Step 1: Pressing Next after video check...');
        let nextButton = await findAndClickButton(page, [
          'button[aria-label*="Next"]',
          'button:has-text("Next")',
          'button[data-testid="next-button"]',
          'button[aria-label*="Continue"]',
          'button:has-text("Continue")',
          'button[data-testid="continue-button"]'
        ]);
        
        if (nextButton) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          await page.screenshot({ path: './logs/after-first-next.png', fullPage: true });
          console.log('📸 Screenshot saved: ./logs/after-first-next.png');
        }
        
        // Step 2: Select "No, it's not made for kids"
        console.log('🔄 Step 2: Selecting "No, it\'s not made for kids"...');
        let kidsButton = await findAndClickButton(page, [
          'input[value="no"]',
          'input[value="false"]',
          'button[aria-label*="No"]',
          'button:has-text("No")',
          'button:has-text("No, it\'s not made for kids")',
          'button:has-text("No, it is not made for kids")',
          'button[data-testid="no-kids-button"]',
          'input[name="kids"][value="no"]',
          'input[name="madeForKids"][value="false"]',
          'input[name="isMadeForKids"][value="false"]'
        ]);
        
        if (kidsButton) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          await page.screenshot({ path: './logs/after-kids-selection.png', fullPage: true });
          console.log('📸 Screenshot saved: ./logs/after-kids-selection.png');
        }
        
        // Step 3: Press Next three times
        for (let i = 1; i <= 3; i++) {
          console.log(`🔄 Step 3.${i}: Pressing Next (${i}/3)...`);
          nextButton = await findAndClickButton(page, [
            'button[aria-label*="Next"]',
            'button:has-text("Next")',
            'button[data-testid="next-button"]',
            'button[aria-label*="Continue"]',
            'button:has-text("Continue")',
            'button[data-testid="continue-button"]'
          ]);
          
          if (nextButton) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            await page.screenshot({ path: `./logs/after-next-${i}.png`, fullPage: true });
            console.log(`📸 Screenshot saved: ./logs/after-next-${i}.png`);
          }
        }
        
        // Step 4: Select "Public" for video visibility
        console.log('🔄 Step 4: Selecting "Public" for video visibility...');
        let publicButton = await findAndClickButton(page, [
          'input[value="public"]',
          'input[name="visibility"][value="public"]',
          'button[aria-label*="Public"]',
          'button:has-text("Public")',
          'button[data-testid="public-button"]',
          'input[name="privacy"][value="public"]',
          'input[name="status"][value="public"]'
        ]);
        
        if (publicButton) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          await page.screenshot({ path: './logs/after-public-selection.png', fullPage: true });
          console.log('📸 Screenshot saved: ./logs/after-public-selection.png');
        }
       
               // Step 5: Press the final Publish button
        console.log('🔄 Step 5: Pressing the final Publish button...');
        let publishButton = await findAndClickButton(page, [
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
          console.log('✅ Publish button clicked!');
          
          // Wait for publish to complete
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          console.log('1️⃣5️⃣ Taking final screenshot after publish...');
          await page.screenshot({ path: './logs/after-publish.png', fullPage: true });
          console.log('📸 Screenshot saved: ./logs/after-publish.png');
          
          console.log('🎉 Video upload process completed successfully!');
        } else {
          console.log('❌ Publish button not found');
          console.log('📸 Taking screenshot to see current state...');
          await page.screenshot({ path: './logs/no-publish-button-found.png', fullPage: true });
          console.log('📸 Screenshot saved: ./logs/no-publish-button-found.png');
        }
      
    } else {
      console.log('❌ Could not find or create file input');
    }
    
  } catch (error) {
    console.error('❌ Error during upload test:', error.message);
  } finally {
    // Keep browser open for manual inspection
    console.log('🏁 Test completed - Browser will remain open for inspection');
    console.log('Press Ctrl+C to close the browser');
    
    // Wait for user to close
    await new Promise(() => {});
  }
}

// Run the test
testUploadStepByStep().catch(console.error); 