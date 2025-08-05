# 🎥 YouTube Automation Bot (Single Account Version)

A YouTube automation bot that creates channels and uploads videos using GoLogin profiles with human-like behavior simulation.

## 🎯 Current Setup: Single Account Testing

This version is configured for **testing with 1 Gmail account and 1 video** to verify everything works before scaling up.

### 📋 What the Bot Does:
1. **Creates GoLogin profile** with random fingerprint
2. **Logs into Gmail** using provided credentials
3. **Navigates to YouTube** and creates a channel
4. **Uploads 1 video** with human-like behavior
5. **Saves session cookies** for future use
6. **Cleans up** GoLogin profile

## 🚀 Quick Start

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Configure Your Account**
Edit `accounts.json`:
```json
[
  {
    "email": "your-email@gmail.com",
    "password": "your-password"
  }
]
```

### 3. **Add Your Video**
- Place your video file in the `videos/` folder
- Supported formats: `.mp4`, `.avi`, `.mov`, `.mkv`, `.wmv`, `.flv`
- The bot will use the first video it finds

### 4. **Set Up GoLogin API**
Edit `.env`:
```
GOLOGIN_API_TOKEN=your-gologin-api-token
```

### 5. **Test Setup**
```bash
npm run test-single
```

### 6. **Run the Bot**
```bash
npm start
```

## 📁 File Structure
```
Bot/
├── accounts.json          # Gmail credentials (1 account)
├── videos/                # Video files (1 video)
├── logs/                  # Detailed logs
├── utils/                 # Bot utilities
├── config.js              # Configuration
└── index.js               # Main bot
```

## 📊 Monitoring

- **Console logs**: Real-time progress
- **Detailed logs**: `logs/` folder with per-account JSON files
- **Error logs**: Separate error files for debugging

## 🔧 Configuration

Edit `config.js` to customize:
- Upload delays
- Browser settings
- Human behavior simulation
- Logging levels

## 🎯 Next Steps (After Testing)

Once the single-account version works perfectly:

1. **Add more accounts** to `accounts.json`
2. **Add more videos** to `videos/` folder
3. **Update config** to upload multiple videos per channel
4. **Scale up** the automation

## ⚠️ Important Notes

- **Use responsibly**: Follow YouTube's terms of service
- **Test first**: Always test with 1 account before scaling
- **Monitor logs**: Check logs for any issues
- **Human behavior**: Bot simulates human actions to avoid detection

## 🛠️ Troubleshooting

- **API issues**: Check your GoLogin API token
- **Login problems**: Verify Gmail credentials
- **Video uploads**: Ensure video format is supported
- **Logs**: Check `logs/` folder for detailed error information

---

**Ready to test? Run `npm run test-single` to verify everything is set up correctly!**