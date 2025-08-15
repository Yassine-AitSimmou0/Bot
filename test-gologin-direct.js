// Direct GoLogin API test
const { GologinApi } = require('gologin');
require('dotenv').config();

async function testGoLoginDirect() {
  console.log('🔍 Testing GoLogin API directly...');
  
  const token = process.env.GOLOGIN_API_TOKEN;
  console.log(`Token (first 20 chars): ${token.substring(0, 20)}...`);
  
  try {
    // Initialize GoLogin with your token
    const gologin = GologinApi({
      token: token
    });
    
    console.log('✅ GoLogin SDK initialized');
    
    // Test 1: Try to create a profile
    console.log('🔄 Testing profile creation...');
    const profile = await gologin.createProfileRandomFingerprint();
    console.log(`✅ Profile created successfully: ${profile.id}`);
    
    // Test 2: Try to launch browser
    console.log('🔄 Testing browser launch...');
    const { browser } = await gologin.launch({ profileId: profile.id });
    console.log('✅ Browser launched successfully');
    
    // Test 3: Close browser
    await browser.close();
    console.log('✅ Browser closed');
    
    // Test 4: Delete profile
    console.log('🔄 Cleaning up profile...');
    await gologin.deleteProfile(profile.id);
    console.log('✅ Profile deleted');
    
    // Clean up
    await gologin.exit();
    
    console.log('\n🎉 SUCCESS: GoLogin API is working perfectly!');
    console.log('✅ Your token is valid and has sufficient permissions');
    console.log('✅ Ready to run the YouTube automation bot');
    
  } catch (error) {
    console.log('\n❌ GOLOGIN API ERROR:');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n💡 SOLUTION: Token is unauthorized');
      console.log('   - Check if your GoLogin account is active');
      console.log('   - Verify the token is copied correctly');
    } else if (error.message.includes('403')) {
      console.log('\n💡 SOLUTION: Access forbidden');
      console.log('   - Your account may not have API access');
      console.log('   - Check your GoLogin subscription plan');
    } else if (error.message.includes('free API requests limit')) {
      console.log('\n💡 SOLUTION: Free tier exhausted');
      console.log('   - Upgrade to a paid GoLogin plan');
      console.log('   - Visit: https://gologin.com/pricing');
    } else {
      console.log('\n💡 SOLUTION: Unknown error');
      console.log('   - Contact GoLogin support');
      console.log('   - Check network connectivity');
    }
  }
}

testGoLoginDirect();
