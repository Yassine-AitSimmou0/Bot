const fs = require('fs');
const path = require('path');

// Allow passing token via CLI arg: node update-token.js <TOKEN>
const passedToken = process.argv[2];
const fallbackToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODk4YzVlNGZjYWY1MWM3YjA5MjIxMmEiLCJ0eXBlIjoiZGV2Iiwiand0aWQiOiI2ODk4YzYwNzVlNTBhN2M0YWJkMDRiMWUifQ.CZkfwpOwycwABkrRWgVYqnPek4P6KVbPGNN3o0MPNhA';
const newToken = passedToken || fallbackToken;

const envPath = path.join(__dirname, '.env');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.log('Creating new .env file...');
  envContent = '';
}

if (envContent.includes('GOLOGIN_API_TOKEN=')) {
  envContent = envContent.replace(/GOLOGIN_API_TOKEN=.*/, `GOLOGIN_API_TOKEN=${newToken}`);
} else {
  envContent += `\nGOLOGIN_API_TOKEN=${newToken}`;
}

fs.writeFileSync(envPath, envContent.trim() + '\n');
console.log('✅ API token updated successfully!');
console.log('📏 Token length:', newToken.length, 'characters');
