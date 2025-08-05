# 🌐 YouTube Bot Web Interface

A beautiful, user-friendly web interface for the YouTube Automation Bot that allows anyone to upload accounts, videos, and run the bot without touching any code!

## 🚀 Features

- **📧 Upload Gmail Accounts**: Drag & drop JSON files with account credentials
- **🎬 Upload Videos**: Upload multiple video files (MP4, AVI, MOV, etc.)
- **📊 Real-time Status**: See current bot status, account count, video count
- **🚀 One-Click Start**: Start the bot with a single button click
- **📋 Live Logs**: View real-time bot progress and logs
- **📱 Mobile Friendly**: Works on desktop, tablet, and mobile devices
- **🎨 Modern UI**: Beautiful, intuitive interface

## 🛠️ Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure GoLogin API
Create a `.env` file in the root directory:
```
GOLOGIN_API_TOKEN=your-gologin-api-token-here
```

### 3. Start the Web Interface
```bash
npm run web
```

### 4. Open in Browser
Navigate to: `http://localhost:3001`

## 📋 How to Use

### Step 1: Prepare Your Files

#### Accounts File (JSON format)
Create a JSON file with your Gmail accounts:
```json
[
  {
    "email": "your-email-1@gmail.com",
    "password": "your-password-1"
  },
  {
    "email": "your-email-2@gmail.com",
    "password": "your-password-2"
  }
]
```

**Sample file**: `sample-accounts.json`

#### Video Files
Supported formats:
- MP4
- AVI
- MOV
- MKV
- WMV
- FLV

### Step 2: Upload Files

1. **Upload Accounts**:
   - Click "Choose File" in the "Upload Accounts" section
   - Select your JSON file with Gmail accounts
   - Click "Upload Accounts"

2. **Upload Videos**:
   - Click "Choose File" in the "Upload Videos" section
   - Select your video files (you can select multiple)
   - Click "Upload Videos"

### Step 3: Check Status

The status section shows:
- ✅ **Accounts**: Number of Gmail accounts loaded
- ✅ **Videos**: Number of video files available
- ✅ **API Token**: Whether GoLogin API is configured
- ✅ **Bot Ready**: Whether everything is ready to start

### Step 4: Start the Bot

Once everything is ready:
1. Click the big green "🚀 Start YouTube Bot" button
2. The bot will start processing your accounts
3. Watch the progress in the logs section

## 📊 Status Indicators

| Status | Meaning |
|--------|---------|
| ✅ | Ready/Working |
| ❌ | Not Ready/Missing |
| 🔄 | Loading/Processing |

## 📋 Logs Section

The logs section shows:
- **Real-time progress** of the bot
- **Error messages** if something goes wrong
- **Success confirmations** for each step
- **Account-specific logs** for detailed tracking

## 🔧 Configuration

### Environment Variables
Create a `.env` file:
```
GOLOGIN_API_TOKEN=your-gologin-api-token
PORT=3001  # Optional: Change web interface port
```

### Bot Configuration
Edit `config.js` to customize:
- Upload delays
- Browser settings
- Human behavior simulation
- Number of videos per channel

## 🚨 Important Notes

### Security
- ⚠️ **Never share** your `.env` file or account credentials
- ⚠️ **Use responsibly** - Follow YouTube's terms of service
- ⚠️ **Test first** - Always test with 1 account before scaling

### GoLogin API
- 🔑 **API Token Required**: You need a GoLogin subscription
- 📊 **API Limits**: Free tier has limited requests
- 💳 **Upgrade**: Consider upgrading for more accounts

### File Formats
- 📧 **Accounts**: Must be valid JSON array
- 🎬 **Videos**: Supported formats only
- 📁 **File Size**: Large videos may take time to upload

## 🛠️ Troubleshooting

### Common Issues

#### "No accounts found"
- Make sure you uploaded a valid JSON file
- Check the file format matches the sample
- Verify the file was uploaded successfully

#### "No videos found"
- Upload video files in supported formats
- Check file extensions (.mp4, .avi, etc.)
- Ensure files are not corrupted

#### "API Token not configured"
- Create a `.env` file with your GoLogin API token
- Restart the web interface after adding the token

#### "Bot not starting"
- Check all status indicators are green ✅
- Verify GoLogin API token is valid
- Check logs for specific error messages

### Getting Help

1. **Check Logs**: Look at the logs section for error details
2. **Refresh Status**: Click "Refresh Status" to update
3. **Restart**: Stop and restart the web interface
4. **Check Files**: Verify your uploaded files are correct

## 📱 Mobile Usage

The web interface is fully responsive and works on:
- 📱 **Smartphones**: Touch-friendly interface
- 📱 **Tablets**: Optimized for larger screens
- 💻 **Desktop**: Full-featured experience

## 🔄 Auto-Refresh

The interface automatically:
- 🔄 **Refreshes status** every 30 seconds
- 📊 **Updates logs** when you click refresh
- ⚡ **Shows real-time** bot progress

## 🎯 What the Bot Does

For each account, the bot will:
1. 🆕 Create a GoLogin profile with random fingerprint
2. 🌐 Launch a browser with the profile
3. 📧 Login to Gmail account
4. 🎥 Navigate to YouTube
5. 📺 Create YouTube channel (if needed)
6. ⬆️ Upload videos with human-like behavior
7. 💾 Save session cookies for future use
8. 🧹 Clean up GoLogin profile

## 🚀 Scaling Up

Once you've tested with 1 account:
1. **Add more accounts** to your JSON file
2. **Add more videos** to the videos folder
3. **Update config** for multiple videos per channel
4. **Monitor logs** for any issues

---

**🎉 Enjoy your automated YouTube channel creation!** 