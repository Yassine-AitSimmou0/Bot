const fs = require('fs');
const path = require('path');

const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODk1ZmUxY2Q5MDhlMmM1MzczZGRkNTIiLCJ0eXBlIjoiZGV2Iiwiand0aWQiOiI2ODk1ZmUzZTQxY2E3NWIzODYxMWRkYjgifQ.dMuAAJVq1CFs-TG-iPyFkvyNyPNQlfDaTeSoTA8Ikfg';

// Read the current .env file
const envPath = path.join(__dirname, '.env');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.log('Creating new .env file...');
  envContent = '';
}

// Update or add the GOLOGIN_API_TOKEN
if (envContent.includes('GOLOGIN_API_TOKEN=')) {
  envContent = envContent.replace(
    /GOLOGIN_API_TOKEN=.*/,
    `GOLOGIN_API_TOKEN=${newToken}`
  );
} else {
  envContent += `\nGOLOGIN_API_TOKEN=${newToken}`;
}

// Write the updated content back to .env
fs.writeFileSync(envPath, envContent.trim() + '\n');

console.log('✅ API token updated successfully!');
console.log('📏 Token length:', newToken.length, 'characters');
