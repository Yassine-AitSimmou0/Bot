// Script to check GoLogin account status and limits
const axios = require('axios');

async function checkGoLoginStatus() {
  const token = process.env.GOLOGIN_API_TOKEN;
  
  if (!token) {
    console.log('❌ No token found in .env file');
    return;
  }

  console.log('🔍 Checking GoLogin account status...');
  console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
  
  try {
    // Check account info
    const userResponse = await axios.get('https://api.gologin.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Account Status:');
    console.log('Email:', userResponse.data.email);
    console.log('Plan:', userResponse.data.plan || 'Free');
    console.log('');

    // Try to get profiles to test API
    const profilesResponse = await axios.get('https://api.gologin.com/browser', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 API Test Results:');
    console.log('✅ API is working');
    console.log(`📁 You have ${profilesResponse.data.length} profiles`);
    console.log('');
    console.log('🎉 GoLogin API is ready to use!');
    
  } catch (error) {
    console.log('❌ GoLogin API Error:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message || error.message);
    console.log('');
    
    if (error.response?.status === 401) {
      console.log('💡 Solution: Your token is invalid. You need a valid GoLogin subscription.');
      console.log('   Visit: https://gologin.com/pricing');
    } else if (error.response?.status === 429) {
      console.log('💡 Solution: Rate limit exceeded. Upgrade your plan for higher limits.');
      console.log('   Current limit: 300 requests/minute (Free plan)');
      console.log('   Paid plans: 1,200 requests/minute');
    } else if (error.response?.status === 402) {
      console.log('💡 Solution: Payment required. Subscribe to a paid plan.');
      console.log('   Visit: https://gologin.com/pricing');
    }
  }
}

checkGoLoginStatus();
