#!/usr/bin/env node

// Simple script to update GoLogin API token
const fs = require('fs');
const path = require('path');

function updateGoLoginToken(newToken) {
  try {
    // Validate token format
    if (!newToken || !newToken.startsWith('eyJ')) {
      throw new Error('Invalid token format. Token should start with "eyJ"');
    }
    
    // Update .env file
    const envPath = path.join(__dirname, '.env');
    const envContent = `GOLOGIN_API_TOKEN=${newToken}\n`;
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    // Verify token was written correctly
    const written = fs.readFileSync(envPath, 'utf8').trim();
    if (!written.includes(newToken)) {
      throw new Error('Failed to write token to .env file');
    }
    
    // Decode and display token info
    try {
      const payload = JSON.parse(Buffer.from(newToken.split('.')[1], 'base64').toString());
      console.log('✅ GoLogin token updated successfully!');
      console.log(`   Account ID: ${payload.sub}`);
      console.log(`   Type: ${payload.type}`);
      console.log('');
      console.log('🚀 You can now restart the bot with: npm start');
    } catch (e) {
      console.log('✅ Token updated, but could not decode for display');
    }
    
  } catch (error) {
    console.error('❌ Error updating token:', error.message);
    process.exit(1);
  }
}

// Get token from command line argument
const newToken = process.argv[2];

if (!newToken) {
  console.log('Usage: node update-token.js <NEW_TOKEN>');
  console.log('Example: node update-token.js eyJhbGciOiJIUzI1NiIs...');
  process.exit(1);
}

updateGoLoginToken(newToken);