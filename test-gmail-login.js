// Test Gmail login specifically
const puppeteer = require('puppeteer');
const fs = require('fs-extra');

async function testGmailLogin() {
  console.log('🧪 Testing Gmail login specifically...');
  
  const accounts = await fs.readJson('./accounts.json');
  const account = accounts[0];
  
  console.log(`📧 Testing with: ${account.email}`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null
    });
    
    const page = await browser.newPage();
    
    // Step 1: Navigate to Gmail
    console.log('🌐 Navigating to Gmail...');
    await page.goto('https://mail.google.com/', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Check current page
    const url = page.url();
    const title = await page.title();
    console.log(`📍 Current URL: ${url}`);
    console.log(`📄 Page title: ${title}`);
    
    // Step 3: Take screenshot
    await page.screenshot({ path: './logs/gmail-test.png' });
    console.log('📸 Screenshot saved: gmail-test.png');
    
    // Step 4: Check for login elements
    const allInputs = await page.$$('input');
    console.log(`🔍 Found ${allInputs.length} input fields`);
    
    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      const type = await input.evaluate(el => el.type);
      const name = await input.evaluate(el => el.name);
      const id = await input.evaluate(el => el.id);
      const placeholder = await input.evaluate(el => el.placeholder);
      console.log(`  Input ${i + 1}: type="${type}" name="${name}" id="${id}" placeholder="${placeholder}"`);
    }
    
    // Step 5: Look for email field
    const emailField = await page.$('#identifierId, input[type="email"], input[name="identifier"]');
    if (emailField) {
      console.log('✅ Found email field!');
      
      // Try to type email
      await emailField.focus();
      await page.keyboard.type(account.email, { delay: 100 });
      console.log('✅ Email typed successfully');
      
      // Look for Next button
      const nextButton = await page.$('#identifierNext');
      if (nextButton) {
        console.log('✅ Found Next button');
        await nextButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check for password field
        const passwordField = await page.$('input[type="password"]');
        if (passwordField) {
          console.log('✅ Reached password page - Gmail login is working!');
        } else {
          console.log('❌ Password field not found');
        }
      } else {
        console.log('❌ Next button not found');
      }
    } else {
      console.log('❌ Email field not found');
      
      // Check if we're on a verification page
      const pageText = await page.evaluate(() => document.body.innerText);
      if (pageText.includes('Verify it\'s you')) {
        console.log('🔐 Detected verification page');
        console.log('💡 This requires manual intervention or 2FA setup');
      }
    }
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testGmailLogin();
