const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');
const { logger } = require('./utils/logger');
const GoLoginAPI = require('./utils/gologin');
const YouTubeAutomation = require('./utils/youtubeAutomation');
const ProfileLogger = require('./utils/profileLogger');

async function testAutomaticUpload() {
  const gologin = new GoLoginAPI();
  let browser = null;
  let page = null;
  let profileId = null;

  try {
    console.log('🤖 Testing automatic video upload from videos folder...');
    
    // Check videos folder
    const videoFolder = './videos';
    const videoFiles = await fs.readdir(videoFolder);
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'];
    const videos = videoFiles.filter(file => 
      videoExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );
    
    console.log(`📁 Found ${videos.length} videos in ${videoFolder}:`);
    videos.forEach((video, index) => {
      console.log(`  ${index + 1}. ${video}`);
    });
    
    if (videos.length === 0) {
      console.log('❌ No videos found in videos folder. Please add some videos first.');
      return;
    }
    
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
    const profileLogger = new ProfileLogger(account.email, 'automatic_upload_test');
    const youtubeBot = new YouTubeAutomation(page, profileLogger);
    
    // Login to Gmail
    console.log('🔐 Logging into Gmail...');
    await youtubeBot.loginToGmail(account.email, account.password);
    console.log('✅ Gmail login successful');
    
    // Create YouTube channel
    console.log('📺 Creating YouTube channel...');
    await youtubeBot.createYouTubeChannel();
    console.log('✅ YouTube channel created');
    
    // Test automatic upload
    console.log('\n🚀 Starting automatic video upload...');
    const uploadedCount = await youtubeBot.uploadMultipleVideos();
    
    console.log(`\n🎉 AUTOMATIC UPLOAD TEST COMPLETED!`);
    console.log(`📊 Results: ${uploadedCount} videos uploaded successfully`);
    
    if (uploadedCount > 0) {
      console.log('✅ SUCCESS: Bot can automatically upload videos from videos folder!');
    } else {
      console.log('❌ FAILED: No videos were uploaded successfully');
    }
    
  } catch (error) {
    console.error('❌ Automatic upload test failed:', error.message);
    if (page) {
      await page.screenshot({ path: './logs/automatic-upload-error.png' });
      console.log('📸 Error screenshot saved: automatic-upload-error.png');
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

// Run the automatic upload test
testAutomaticUpload().catch(console.error);
