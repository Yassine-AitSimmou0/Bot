// Comprehensive GoLogin API test
const axios = require('axios');
require('dotenv').config();

async function comprehensiveGoLoginTest() {
  console.log('🔍 Comprehensive GoLogin API Test');
  console.log('=================================');
  
  const token = process.env.GOLOGIN_API_TOKEN;
  console.log(`Token: ${token.substring(0, 30)}...`);
  console.log('');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };
  
  // Test 1: Basic API connectivity
  console.log('TEST 1: Basic API Connectivity');
  console.log('------------------------------');
  try {
    const response = await axios.get('https://api.gologin.com/browser', {
      headers,
      timeout: 10000
    });
    console.log('✅ API is reachable');
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📦 Profiles found: ${response.data.length}`);
  } catch (error) {
    console.log('❌ API Error:');
    console.log(`   Status: ${error.response?.status || 'No response'}`);
    console.log(`   Message: ${error.response?.data?.message || error.message}`);
    console.log(`   Headers: ${JSON.stringify(error.response?.headers || {})}`);
  }
  console.log('');
  
  // Test 2: User account info
  console.log('TEST 2: User Account Information');
  console.log('--------------------------------');
  try {
    const response = await axios.get('https://api.gologin.com/user', {
      headers,
      timeout: 10000
    });
    console.log('✅ User info retrieved');
    console.log(`📧 Email: ${response.data.email || 'Not provided'}`);
    console.log(`📋 Plan: ${response.data.plan || 'Unknown'}`);
    console.log(`💳 Subscription: ${response.data.subscription || 'Unknown'}`);
    console.log(`🔢 User ID: ${response.data.id || 'Unknown'}`);
  } catch (error) {
    console.log('❌ User Info Error:');
    console.log(`   Status: ${error.response?.status || 'No response'}`);
    console.log(`   Message: ${error.response?.data?.message || error.message}`);
  }
  console.log('');
  
  // Test 3: Token validation
  console.log('TEST 3: Token Validation');
  console.log('------------------------');
  try {
    const response = await axios.get('https://api.gologin.com/user/dev', {
      headers,
      timeout: 10000
    });
    console.log('✅ Token is valid for dev operations');
    console.log(`📋 Dev tokens: ${response.data.length}`);
  } catch (error) {
    console.log('❌ Token Validation Error:');
    console.log(`   Status: ${error.response?.status || 'No response'}`);
    console.log(`   Message: ${error.response?.data?.message || error.message}`);
    
    if (error.response?.status === 401) {
      console.log('💡 Token is unauthorized - invalid or expired');
    } else if (error.response?.status === 403) {
      console.log('💡 Token lacks permissions - may need subscription');
    } else if (error.response?.status === 429) {
      console.log('💡 Rate limit exceeded - free tier exhausted');
    }
  }
  console.log('');
  
  // Test 4: Try different API endpoints
  console.log('TEST 4: Alternative Endpoints');
  console.log('-----------------------------');
  const endpoints = [
    'https://api.gologin.com/proxy',
    'https://api.gologin.com/tags',
    'https://gologin.com/api/browser'  // Alternative base URL
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, {
        headers,
        timeout: 5000
      });
      console.log(`✅ ${endpoint}: Status ${response.status}`);
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.response?.status || 'Failed'} - ${error.response?.data?.message || error.message}`);
    }
  }
  console.log('');
  
  // Test 5: Raw HTTP test
  console.log('TEST 5: Raw Token Analysis');
  console.log('--------------------------');
  try {
    // Decode JWT token (basic info)
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('📋 Token payload:');
      console.log(`   Subject: ${payload.sub || 'Unknown'}`);
      console.log(`   Type: ${payload.type || 'Unknown'}`);
      console.log(`   JWT ID: ${payload.jwtid || 'Unknown'}`);
      console.log(`   Issued: ${payload.iat ? new Date(payload.iat * 1000).toISOString() : 'Unknown'}`);
      console.log(`   Expires: ${payload.exp ? new Date(payload.exp * 1000).toISOString() : 'No expiration'}`);
      
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.log('⚠️ TOKEN IS EXPIRED!');
      } else {
        console.log('✅ Token is not expired');
      }
    }
  } catch (error) {
    console.log('❌ Could not decode token:', error.message);
  }
  
  console.log('');
  console.log('🎯 CONCLUSION');
  console.log('=============');
  console.log('Based on the tests above:');
  console.log('1. If you see 403 errors: Your account needs a paid subscription');
  console.log('2. If you see 401 errors: Your token is invalid or expired');
  console.log('3. If you see 429 errors: You\'ve hit the free tier limit');
  console.log('4. If you see "free API requests limit": Upgrade to paid plan');
  console.log('');
  console.log('🛒 To get GoLogin working: https://gologin.com/pricing');
}

comprehensiveGoLoginTest();
