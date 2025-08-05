const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { logger } = require('./utils/logger');
const YouTubeBot = require('./index');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'accounts') {
      cb(null, './uploads/accounts/');
    } else if (file.fieldname === 'videos') {
      cb(null, './uploads/videos/');
    } else {
      cb(null, './uploads/');
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'accounts') {
      // Allow JSON files for accounts
      if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
        cb(null, true);
      } else {
        cb(new Error('Only JSON files are allowed for accounts'));
      }
    } else if (file.fieldname === 'videos') {
      // Allow video files
      const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'];
      const hasValidExtension = videoExtensions.some(ext => 
        file.originalname.toLowerCase().endsWith(ext)
      );
      if (hasValidExtension) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'));
      }
    } else {
      cb(null, true);
    }
  }
});

// Create upload directories
async function createUploadDirs() {
  await fs.ensureDir('./uploads/accounts/');
  await fs.ensureDir('./uploads/videos/');
  await fs.ensureDir('./public/');
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload accounts
app.post('/upload-accounts', upload.single('accounts'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = req.file.path;
    const targetFile = './accounts.json';

    // Read and validate the uploaded file
    const accounts = await fs.readJson(uploadedFile);
    
    if (!Array.isArray(accounts)) {
      return res.status(400).json({ error: 'Invalid accounts file format. Must be an array.' });
    }

    // Save to accounts.json
    await fs.writeJson(targetFile, accounts, { spaces: 2 });
    
    // Clean up uploaded file
    await fs.remove(uploadedFile);

    res.json({ 
      success: true, 
      message: `Successfully uploaded ${accounts.length} accounts`,
      accounts: accounts.length
    });
  } catch (error) {
    logger.error('Upload accounts error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Upload videos
app.post('/upload-videos', upload.array('videos', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const videosDir = './videos/';
    await fs.ensureDir(videosDir);

    const uploadedFiles = [];
    for (const file of req.files) {
      const targetPath = path.join(videosDir, file.originalname);
      await fs.move(file.path, targetPath);
      uploadedFiles.push(file.originalname);
    }

    res.json({ 
      success: true, 
      message: `Successfully uploaded ${uploadedFiles.length} videos`,
      videos: uploadedFiles
    });
  } catch (error) {
    logger.error('Upload videos error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get current status
app.get('/status', async (req, res) => {
  try {
    const accounts = await fs.readJson('./accounts.json').catch(() => []);
    const videos = await fs.readdir('./videos/').catch(() => []);
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'];
    const videoFiles = videos.filter(file => 
      videoExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );

    res.json({
      accounts: accounts.length,
      videos: videoFiles.length,
      hasEnvFile: await fs.pathExists('./.env'),
      botReady: accounts.length > 0 && videoFiles.length > 0 && await fs.pathExists('./.env')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot
app.post('/start-bot', async (req, res) => {
  try {
    // Check if bot is ready
    const accounts = await fs.readJson('./accounts.json').catch(() => []);
    const videos = await fs.readdir('./videos/').catch(() => []);
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'];
    const videoFiles = videos.filter(file => 
      videoExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );

    if (accounts.length === 0) {
      return res.status(400).json({ error: 'No accounts found. Please upload accounts first.' });
    }

    if (videoFiles.length === 0) {
      return res.status(400).json({ error: 'No videos found. Please upload videos first.' });
    }

    if (!await fs.pathExists('./.env')) {
      return res.status(400).json({ error: 'No .env file found. Please configure GoLogin API token.' });
    }

    // Start bot in background
    const bot = new YouTubeBot();
    
    // Start bot asynchronously
    bot.start().catch(error => {
      logger.error('Bot error:', error.message);
    });

    res.json({ 
      success: true, 
      message: 'Bot started successfully! Check logs for progress.',
      accounts: accounts.length,
      videos: videoFiles.length
    });
  } catch (error) {
    logger.error('Start bot error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get logs
app.get('/logs', async (req, res) => {
  try {
    const logFiles = await fs.readdir('./logs/');
    const logs = [];
    
    for (const file of logFiles) {
      if (file.endsWith('.log') || file.endsWith('.json')) {
        const content = await fs.readFile(`./logs/${file}`, 'utf8');
        logs.push({
          filename: file,
          content: content.substring(0, 1000) + (content.length > 1000 ? '...' : ''),
          size: content.length
        });
      }
    }
    
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function startServer() {
  await createUploadDirs();
  
  const server = app.listen(PORT, () => {
    logger.info(`🌐 Web interface running on http://localhost:${PORT}`);
    logger.info('📁 Upload directories created');
    logger.info('🚀 Ready to accept uploads and run bot');
  }).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${PORT} is already in use!`);
      logger.info(`💡 Try using a different port: PORT=3002 npm run web`);
      logger.info(`💡 Or stop the process using port ${PORT}`);
      process.exit(1);
    } else {
      logger.error('Failed to start web interface:', error.message);
      process.exit(1);
    }
  });
}

startServer().catch(error => {
  logger.error('Failed to start web interface:', error.message);
  process.exit(1);
}); 