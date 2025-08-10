const config = require('./config');
const YouTubeAutomation = require('./utils/youtubeAutomation');
const { logger } = require('./utils/logger');
const GoLoginAPI = require('./utils/gologin');

// Simple logger wrapper for testing
const testLogger = {
  logStep: (step, success, data) => {
    console.log(`📊 Step ${step}: ${success ? '✅' : '❌'}`, data || '');
  },
  logVideoUpload: (videoPath, success, data) => {
    console.log(`📤 Video Upload ${success ? '✅' : '❌'}:`, data || '');
  },
  logError: (error, context) => {
    console.error(`❌ Error in ${context}:`, error.message);
  },
  logCaptcha: () => {
    console.log('🤖 reCAPTCHA detected');
  }
};

// Simple delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testUploadVideo() {
  let gologin = null;
  let browser = null;
  
  try {
    console.log('🚀 Starting YouTube upload test with GoLogin...');
    
    // Initialize GoLogin API
    gologin = new GoLoginAPI();
    
    // Test API connection first
    await gologin.testConnection();
    console.log('✅ GoLogin API connection successful');
    
    // Create a test profile
    const profileId = await gologin.createProfile('test-upload@example.com');
    console.log('✅ GoLogin profile created:', profileId);
    
    // Launch browser
    browser = await gologin.launchBrowser(profileId);
    console.log('✅ Browser launched successfully');
    
    // Get the page
    const pages = await browser.pages();
    const page = pages[0];
    
    // Create YouTube automation instance with test logger
    const youtubeBot = new YouTubeAutomation(page, testLogger);
    
    // First, we need to login to Gmail
    console.log('🔐 Logging into Gmail...');
    const accounts = require('./accounts.json');
    const account = accounts[0]; // Use first account
    
    await youtubeBot.loginToGmail(account.email, account.password);
    console.log('✅ Gmail login completed');
    
    // Navigate to YouTube Studio
    console.log('📱 Navigating to YouTube Studio...');
    await page.goto('https://studio.youtube.com', { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    // Wait a moment for page to load
    await delay(5000);
    
    // Test the upload function
    const videoPath = './videos/1.mp4';
    const title = 'Test Video - Amazing Content!';
    const description = 'This is a test video uploaded via automation. Thanks for watching! 🔥';
    
    console.log('📤 Starting video upload...');
    const result = await youtubeBot.uploadVideo(page, videoPath, title, description);
    
    if (result) {
      console.log('✅ Video uploaded successfully!');
    } else {
      console.log('❌ Video upload failed');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Clean up
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
    if (gologin) {
      try {
        await gologin.exit();
        console.log('🗑️ GoLogin resources cleaned up');
      } catch (e) {
        console.log('⚠️ Could not clean up GoLogin resources:', e.message);
      }
    }
  }
}

// Run the test
testUploadVideo().catch(console.error);
