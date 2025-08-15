// Script to get a new GoLogin developer token
const axios = require('axios');

async function getNewDevToken() {
  const currentToken = process.env.GOLOGIN_API_TOKEN;
  
  if (!currentToken) {
    console.log('❌ No current token found in .env file');
    return;
  }

  try {
    console.log('🔄 Requesting new developer token...');
    
    const response = await axios.post('https://api.gologin.com/user/dev', {
      name: 'YouTube Bot Token'
    }, {
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ New developer token created:');
    console.log('Token:', response.data.token);
    console.log('');
    console.log('📝 Update your .env file with this new token:');
    console.log(`GOLOGIN_API_TOKEN=${response.data.token}`);
    
  } catch (error) {
    console.log('❌ Failed to get new token:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 Your current token is expired or invalid. You need a valid paid subscription.');
    } else if (error.response?.status === 429) {
      console.log('💡 Rate limit reached. You need to upgrade your GoLogin plan.');
    }
  }
}

getNewDevToken();
