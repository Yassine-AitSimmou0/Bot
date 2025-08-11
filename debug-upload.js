const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

async function debugUpload() {
  console.log('🔍 DEBUG: Starting upload process analysis...');
  
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
  
  try {
    // Step 1: Go to YouTube Studio
    console.log('📍 Step 1: Navigating to YouTube Studio...');
    await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot of initial state
    await page.screenshot({ path: './logs/debug-step1-initial.png' });
    console.log('📸 Screenshot saved: debug-step1-initial.png');
    
    // Step 2: Find and analyze all buttons on the page
    console.log('🔍 Step 2: Analyzing all buttons on the page...');
    const buttons = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button, [role="button"], [data-testid*="button"], [aria-label*="button"]'));
      return allButtons.map((btn, index) => ({
        index,
        tagName: btn.tagName,
        text: btn.textContent?.trim() || '',
        ariaLabel: btn.getAttribute('aria-label') || '',
        dataTestId: btn.getAttribute('data-testid') || '',
        className: btn.className || '',
        id: btn.id || '',
        visible: btn.offsetParent !== null,
        rect: btn.getBoundingClientRect()
      }));
    });
    
    console.log('📋 Found buttons:');
    buttons.forEach((btn, i) => {
      if (btn.visible && (btn.text || btn.ariaLabel)) {
        console.log(`  ${i}: "${btn.text}" | aria-label: "${btn.ariaLabel}" | testid: "${btn.dataTestId}"`);
      }
    });
    
    // Step 3: Look specifically for Create/Upload buttons
    console.log('🎯 Step 3: Looking for Create/Upload buttons...');
    const createButtons = buttons.filter(btn => 
      btn.visible && (
        btn.text.toLowerCase().includes('create') ||
        btn.text.toLowerCase().includes('upload') ||
        btn.ariaLabel.toLowerCase().includes('create') ||
        btn.ariaLabel.toLowerCase().includes('upload') ||
        btn.dataTestId.toLowerCase().includes('create') ||
        btn.dataTestId.toLowerCase().includes('upload')
      )
    );
    
    console.log('✅ Create/Upload buttons found:');
    createButtons.forEach((btn, i) => {
      console.log(`  ${i}: "${btn.text}" | aria-label: "${btn.ariaLabel}" | testid: "${btn.dataTestId}"`);
    });
    
    // Step 4: Try clicking the first Create button
    if (createButtons.length > 0) {
      const firstButton = createButtons[0];
      console.log(`🖱️ Step 4: Clicking button "${firstButton.text}"...`);
      
      await page.evaluate((index) => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], [data-testid*="button"], [aria-label*="button"]'));
        const visibleButtons = buttons.filter(btn => btn.offsetParent !== null);
        if (visibleButtons[index]) {
          visibleButtons[index].click();
        }
      }, firstButton.index);
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: './logs/debug-step4-after-create-click.png' });
      console.log('📸 Screenshot saved: debug-step4-after-create-click.png');
      
      // Step 5: Analyze what appeared after clicking
      console.log('🔍 Step 5: Analyzing what appeared after clicking...');
      const afterClickElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements
          .filter(el => el.offsetParent !== null && (el.textContent?.trim() || el.getAttribute('aria-label')))
          .map(el => ({
            tagName: el.tagName,
            text: el.textContent?.trim() || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            dataTestId: el.getAttribute('data-testid') || '',
            className: el.className || '',
            id: el.id || ''
          }))
          .filter(item => item.text || item.ariaLabel)
          .slice(0, 20); // Limit to first 20 visible elements
      });
      
      console.log('📋 Elements after clicking:');
      afterClickElements.forEach((el, i) => {
        console.log(`  ${i}: ${el.tagName} - "${el.text}" | aria-label: "${el.ariaLabel}" | testid: "${el.dataTestId}"`);
      });
      
      // Step 6: Look for Upload videos option
      console.log('📁 Step 6: Looking for "Upload videos" option...');
      const uploadOptions = afterClickElements.filter(el => 
        el.text.toLowerCase().includes('upload') ||
        el.ariaLabel.toLowerCase().includes('upload') ||
        el.dataTestId.toLowerCase().includes('upload')
      );
      
      console.log('✅ Upload options found:');
      uploadOptions.forEach((option, i) => {
        console.log(`  ${i}: "${option.text}" | aria-label: "${option.ariaLabel}" | testid: "${option.dataTestId}"`);
      });
      
      // Step 7: Try clicking Upload videos option
      if (uploadOptions.length > 0) {
        const uploadOption = uploadOptions[0];
        console.log(`🖱️ Step 7: Clicking "${uploadOption.text}"...`);
        
        // Try to find and click the upload option
        const uploadOptionSelector = uploadOption.dataTestId ? 
          `[data-testid="${uploadOption.dataTestId}"]` :
          uploadOption.ariaLabel ? 
            `[aria-label="${uploadOption.ariaLabel}"]` :
            `*:has-text("${uploadOption.text}")`;
        
        try {
          await page.click(uploadOptionSelector);
          console.log('✅ Upload option clicked successfully');
        } catch (error) {
          console.log(`❌ Failed to click upload option: ${error.message}`);
          
          // Try alternative approach
          console.log('🔄 Trying alternative click approach...');
          await page.evaluate((text) => {
            const elements = Array.from(document.querySelectorAll('*'));
            const targetElement = elements.find(el => 
              el.textContent?.includes(text) || 
              el.getAttribute('aria-label')?.includes(text)
            );
            if (targetElement) {
              targetElement.click();
            }
          }, uploadOption.text);
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        await page.screenshot({ path: './logs/debug-step7-after-upload-click.png' });
        console.log('📸 Screenshot saved: debug-step7-after-upload-click.png');
        
        // Step 8: Check for file upload interface
        console.log('📁 Step 8: Checking for file upload interface...');
        const fileInputs = await page.$$('input[type="file"]');
        console.log(`📁 Found ${fileInputs.length} file input elements`);
        
        if (fileInputs.length > 0) {
          console.log('✅ File upload interface found!');
          
          // Check if we have a test video
          const testVideoPath = path.join(__dirname, 'videos', '1.mp4');
          if (await fs.pathExists(testVideoPath)) {
            console.log('🎬 Test video found, attempting upload...');
            
            try {
              await fileInputs[0].uploadFile(testVideoPath);
              console.log('✅ File uploaded successfully!');
              
              await new Promise(resolve => setTimeout(resolve, 5000));
              await page.screenshot({ path: './logs/debug-step8-after-file-upload.png' });
              console.log('📸 Screenshot saved: debug-step8-after-file-upload.png');
              
              // Step 9: Check for upload progress
              console.log('⏳ Step 9: Checking for upload progress...');
              const progressElements = await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('*'));
                return elements
                  .filter(el => el.offsetParent !== null)
                  .map(el => el.textContent?.trim())
                  .filter(text => text && (
                    text.includes('Upload') ||
                    text.includes('Processing') ||
                    text.includes('Progress') ||
                    text.includes('%')
                  ));
              });
              
              console.log('📊 Progress indicators found:');
              progressElements.forEach((text, i) => {
                console.log(`  ${i}: "${text}"`);
              });
              
            } catch (uploadError) {
              console.log(`❌ File upload failed: ${uploadError.message}`);
            }
          } else {
            console.log('❌ Test video not found at videos/1.mp4');
          }
        } else {
          console.log('❌ No file upload interface found');
        }
      } else {
        console.log('❌ No upload options found');
      }
    } else {
      console.log('❌ No Create/Upload buttons found');
    }
    
  } catch (error) {
    console.log(`❌ Debug error: ${error.message}`);
  } finally {
    console.log('🔍 Debug analysis complete. Check the screenshots in logs/ folder.');
    await browser.close();
  }
}

// Run the debug
debugUpload().catch(console.error);
