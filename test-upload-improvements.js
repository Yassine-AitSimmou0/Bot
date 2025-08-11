const puppeteer = require('puppeteer');
const YouTubeAutomation = require('./utils/youtubeAutomation');
const ProfileLogger = require('./utils/profileLogger');
const config = require('./config');

async function testUploadImprovements() {
  console.log('🧪 Testing improved upload functionality...');
  
  // Test with a sample account
  const testAccount = {
    email: 'test@example.com',
    password: 'testpassword'
  };
  
  const profileLogger = new ProfileLogger(testAccount.email, 'test_upload_improvements');
  
  try {
    // Launch browser
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Initialize YouTube automation
    const youtubeBot = new YouTubeAutomation(page, profileLogger);
    
    console.log('✅ Browser launched successfully');
    console.log('✅ YouTube automation initialized');
    
    // Test the new findUploadButtonWithKeyboard method
    console.log('🔍 Testing findUploadButtonWithKeyboard method...');
    
    // Navigate to YouTube Studio upload page
    await page.goto('https://studio.youtube.com/upload', { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    console.log('✅ Navigated to YouTube Studio upload page');
    
    // Test the improved method
    const uploadButton = await youtubeBot.findUploadButtonWithKeyboard();
    
    if (uploadButton) {
      console.log('✅ Upload button found successfully!');
      console.log('📋 Button details:', uploadButton);
    } else {
      console.log('❌ Upload button not found');
    }
    
    // Test the improved findElementWithTab method
    console.log('🔍 Testing improved findElementWithTab method...');
    const element = await youtubeBot.findElementWithTab('upload', 10);
    
    if (element) {
      console.log('✅ Element found with improved tab navigation!');
      console.log('📋 Element details:', element);
    } else {
      console.log('❌ Element not found with tab navigation');
    }
    
    await browser.close();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testUploadImprovements().catch(console.error);
