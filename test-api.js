const GoLoginAPI = require('./utils/gologin');

async function testGoLoginAPI() {
  console.log('🧪 Testing GoLogin API...\n');
  
  const gologin = new GoLoginAPI();
  
  try {
    // Check if API token exists
    if (!process.env.GOLOGIN_API_TOKEN) {
      console.log('❌ GOLOGIN_API_TOKEN not found in environment variables');
      console.log('💡 Please set your GoLogin API token in the .env file');
      return;
    }
    
    console.log('✅ API Token found');
    console.log(`📏 Token length: ${process.env.GOLOGIN_API_TOKEN.length} characters\n`);
    
    // Test API connectivity
    console.log('🔗 Testing API connectivity...');
    await gologin.testConnection();
    
    console.log('✅ API connection successful!');
    console.log('📊 API is working correctly\n');
    console.log('✅ Bot is ready to run!');
    
  } catch (error) {
    console.log('❌ API test failed:');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n💡 The API token is invalid or expired. Please check your GoLogin API token.');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Cannot connect to GoLogin API. Check your internet connection.');
    } else {
      console.log('\n💡 Please check your API token and try again.');
    }
  }
}

// Run the test
testGoLoginAPI().catch(console.error); 