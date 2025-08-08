const puppeteer = require('puppeteer');
const GoLoginAPI = require('./utils/gologin');
const YouTubeAutomation = require('./utils/youtubeAutomation');
const ProfileLogger = require('./utils/profileLogger');

async function testUploadSkipChannel() {
  console.log('🧪 Testing Video Upload (Skip Channel Creation)...');
  
  const gologin = new GoLoginAPI();
  
  try {
    // Create a profile for testing
    console.log('1️⃣ Creating GoLogin profile...');
    const profileId = await gologin.createProfile('w7632235@gmail.com');
    console.log(`✅ Profile created: ${profileId}`);
    
    // Launch browser
    console.log('2️⃣ Launching browser...');
    const browser = await gologin.launchBrowser(profileId);
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Create profile logger
    const profileLogger = new ProfileLogger('w7632235@gmail.com', 'test_upload');
    
    // Initialize YouTube automation
    const youtubeBot = new YouTubeAutomation(page, profileLogger);
    
    console.log('3️⃣ Logging into Gmail...');
    
    // Login to Gmail
    const loginSuccess = await youtubeBot.loginToGmail('w7632235@gmail.com', 'Fcaz8299@');
    if (!loginSuccess) {
      throw new Error('Gmail login failed');
    }
    console.log('✅ Gmail login successful');
    
    console.log('4️⃣ Going to YouTube...');
    
    // Navigate to YouTube
    await youtubeBot.goToYouTube();
    console.log('✅ YouTube navigation successful');
    
    console.log('5️⃣ Skipping channel creation (channel already exists)...');
    console.log('✅ Channel creation skipped');
    
    console.log('6️⃣ Starting video upload...');
    
    // Upload videos (skip channel creation)
    const uploadedCount = await youtubeBot.uploadMultipleVideos();
    console.log(`✅ Uploaded ${uploadedCount} videos successfully`);
    
    console.log('🎉 Video upload process completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during upload test:', error.message);
  } finally {
    // Clean up
    try {
      await gologin.deleteProfile(profileId);
      console.log('🧹 GoLogin profile cleaned up');
    } catch (e) {
      console.log('⚠️ Could not clean up profile:', e.message);
    }
    
    console.log('🏁 Test completed');
  }
}

// Run the test
testUploadSkipChannel().catch(console.error);
