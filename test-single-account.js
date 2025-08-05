const GoLoginAPI = require('./utils/gologin');
const { logger } = require('./utils/logger');
const fs = require('fs-extra');

async function testSingleAccount() {
  try {
    logger.info('🧪 Testing single account setup...');
    
    // Test 1: GoLogin API Connection
    logger.info('1️⃣ Testing GoLogin API connection...');
    const gologin = new GoLoginAPI();
    await gologin.testConnection();
    logger.info('✅ GoLogin API connection successful');
    
    // Test 2: Check single account
    logger.info('2️⃣ Checking single account setup...');
    const accounts = await fs.readJson('accounts.json');
    if (accounts.length === 1) {
      logger.info(`✅ Found 1 account: ${accounts[0].email}`);
    } else {
      throw new Error(`Expected 1 account, found ${accounts.length}`);
    }
    
    // Test 3: Check videos folder
    logger.info('3️⃣ Checking videos folder...');
    if (await fs.pathExists('./videos')) {
      const videoFiles = await fs.readdir('./videos');
      const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'];
      const videos = videoFiles.filter(file => 
        videoExtensions.some(ext => file.toLowerCase().endsWith(ext))
      );
      logger.info(`✅ Found ${videos.length} video files`);
      if (videos.length > 0) {
        logger.info(`  📹 First video: ${videos[0]}`);
      }
    } else {
      logger.warn('⚠️ Videos folder not found');
    }
    
    // Test 4: Profile creation test
    logger.info('4️⃣ Testing profile creation...');
    const testEmail = accounts[0].email;
    const profileId = await gologin.createProfile(testEmail);
    logger.info(`✅ Profile created: ${profileId}`);
    
    // Clean up
    await gologin.deleteProfile(profileId);
    await gologin.exit();
    
    logger.info('🎉 Single account test passed!');
    logger.info('✅ Ready to run with 1 account and 1 video');
    logger.info('');
    logger.info('🚀 To start the bot: npm start');
    
  } catch (error) {
    logger.error('❌ Single account test failed:', error.message);
    process.exit(1);
  }
}

testSingleAccount(); 