const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { logger } = require('./utils/logger');
const YouTubeBot = require('./index');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3001;

// Global variables for bot status
let botStatus = {
  isRunning: false,
  progress: 0,
  processedAccounts: 0,
  successfulUploads: 0,
  failedUploads: 0,
  totalAccounts: 0,
  currentAccount: null,
  startTime: null,
  estimatedTimeRemaining: null
};

// Global bot instance for proper stopping
let currentBotInstance = null;
let botStopRequested = false;

// Function to update bot status from bot instance
function updateBotStatusFromInstance(botInstance) {
  if (botInstance && botInstance.accounts) {
    botStatus.totalAccounts = botInstance.accounts.length;
    botStatus.processedAccounts = botInstance.currentAccountIndex || 0;
    
    // Calculate progress
    if (botStatus.totalAccounts > 0) {
      botStatus.progress = Math.round((botStatus.processedAccounts / botStatus.totalAccounts) * 100);
    }
    
    // Update current account
    if (botInstance.accounts[botStatus.processedAccounts]) {
      botStatus.currentAccount = botInstance.accounts[botStatus.processedAccounts].email;
    }
    
    // Emit status update
    io.emit('bot-status-update', botStatus);
  }
}

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10 // Max 10 files at once
  },
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
  await fs.ensureDir('./logs/');
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

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

    // Validate account structure
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      if (!account.email || !account.password) {
        return res.status(400).json({ 
          error: `Invalid account at index ${i}. Each account must have 'email' and 'password' fields.` 
        });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(account.email)) {
        return res.status(400).json({ 
          error: `Invalid email format at index ${i}: ${account.email}` 
        });
      }
    }

    // Save to accounts.json
    await fs.writeJson(targetFile, accounts, { spaces: 2 });
    
    // Clean up uploaded file
    await fs.remove(uploadedFile);

    // Update bot status
    botStatus.totalAccounts = accounts.length;

    res.json({ 
      success: true, 
      message: `Successfully uploaded ${accounts.length} accounts`,
      accounts: accounts.length,
      details: {
        validAccounts: accounts.length,
        invalidAccounts: 0
      }
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
    const failedFiles = [];
    const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);

    for (const file of req.files) {
      try {
        const targetPath = path.join(videosDir, file.originalname);
        
        // Check if file already exists
        if (await fs.pathExists(targetPath)) {
          const timestamp = Date.now();
          const nameWithoutExt = path.parse(file.originalname).name;
          const ext = path.parse(file.originalname).ext;
          const newName = `${nameWithoutExt}_${timestamp}${ext}`;
          const newPath = path.join(videosDir, newName);
          await fs.move(file.path, newPath);
          uploadedFiles.push(newName);
        } else {
          await fs.move(file.path, targetPath);
          uploadedFiles.push(file.originalname);
        }
      } catch (error) {
        failedFiles.push(file.originalname);
        logger.error(`Failed to move video file ${file.originalname}:`, error.message);
      }
    }

    const message = `Successfully uploaded ${uploadedFiles.length} videos`;
    if (failedFiles.length > 0) {
      message += ` (${failedFiles.length} failed)`;
    }

    res.json({ 
      success: true, 
      message: message,
      videos: uploadedFiles,
      failed: failedFiles,
      details: {
        totalSize: formatBytes(totalSize),
        averageSize: formatBytes(totalSize / req.files.length)
      }
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

    // Get video sizes
    const videoSizes = [];
    for (const video of videoFiles) {
      try {
        const stats = await fs.stat(path.join('./videos/', video));
        videoSizes.push(stats.size);
      } catch (error) {
        videoSizes.push(0);
      }
    }

    const totalVideoSize = videoSizes.reduce((sum, size) => sum + size, 0);

    // Quick API test for status
    let apiStatus = {
      tokenExists: !!process.env.GOLOGIN_API_TOKEN,
      tokenValid: false,
      connectivity: 'unknown',
      error: null
    };

    if (process.env.GOLOGIN_API_TOKEN) {
      try {
        const GoLoginAPI = require('./utils/gologin');
        const gologin = new GoLoginAPI();
        await gologin.testConnection();
        apiStatus.tokenValid = true;
        apiStatus.connectivity = 'success';
      } catch (apiError) {
        apiStatus.connectivity = 'failed';
        apiStatus.error = apiError.message;
      }
    }

    res.json({
      accounts: accounts.length,
      videos: videoFiles.length,
      hasEnvFile: await fs.pathExists('./.env'),
      apiStatus: apiStatus,
      botReady: accounts.length > 0 && videoFiles.length > 0 && await fs.pathExists('./.env') && apiStatus.tokenValid,
      botStatus: botStatus,
      details: {
        totalVideoSize: formatBytes(totalVideoSize),
        averageVideoSize: videoFiles.length > 0 ? formatBytes(totalVideoSize / videoFiles.length) : '0 B',
        videoFormats: [...new Set(videoFiles.map(f => path.extname(f).toLowerCase()))]
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed bot status
app.get('/bot-status', (req, res) => {
  res.json(botStatus);
});

// Start bot
app.post('/start-bot', async (req, res) => {
  try {
    // Check if bot is already running
    if (botStatus.isRunning) {
      return res.status(400).json({ error: 'Bot is already running' });
    }

    // Reset stop flag
    botStopRequested = false;

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

    // Initialize bot status
    botStatus = {
      isRunning: true,
      progress: 0,
      processedAccounts: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalAccounts: accounts.length,
      currentAccount: null,
      startTime: new Date(),
      estimatedTimeRemaining: null
    };

    // Emit status update
    io.emit('bot-status-update', botStatus);

    // Start bot in background
    currentBotInstance = new YouTubeBot();
    
    // Set up periodic status updates
    const statusInterval = setInterval(() => {
      if (botStatus.isRunning && !botStopRequested) {
        // Calculate progress based on processed accounts
        if (botStatus.totalAccounts > 0) {
          botStatus.progress = Math.round((botStatus.processedAccounts / botStatus.totalAccounts) * 100);
        }
        
        // Emit status update
        io.emit('bot-status-update', botStatus);
      } else {
        clearInterval(statusInterval);
      }
    }, 1000); // Update every second
    
    // Run bot asynchronously
    currentBotInstance.run()
      .then(() => {
        if (!botStopRequested) {
          logger.info('Bot completed successfully');
          botStatus.isRunning = false;
          botStatus.progress = 100;
          botStatus.currentAccount = null;
        } else {
          logger.info('Bot stopped by user request');
          botStatus.isRunning = false;
          botStatus.progress = 0;
          botStatus.currentAccount = null;
        }
        clearInterval(statusInterval);
        currentBotInstance = null;
        io.emit('bot-status-update', botStatus);
      })
      .catch(error => {
        logger.error('Bot error:', error.message);
        botStatus.isRunning = false;
        botStatus.currentAccount = null;
        clearInterval(statusInterval);
        currentBotInstance = null;
        io.emit('bot-status-update', botStatus);
      });

    res.json({ 
      success: true, 
      message: 'Bot started successfully! Check logs for progress.',
      accounts: accounts.length,
      videos: videoFiles.length,
      botStatus: botStatus
    });
  } catch (error) {
    logger.error('Start bot error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Stop bot
app.post('/stop-bot', async (req, res) => {
  try {
    if (!botStatus.isRunning) {
      return res.status(400).json({ error: 'Bot is not running' });
    }

    // Set stop flag
    botStopRequested = true;
    botStatus.isRunning = false;
    botStatus.progress = 0;
    botStatus.currentAccount = null;

    // Try to stop the bot instance if it exists
    if (currentBotInstance && typeof currentBotInstance.stop === 'function') {
      try {
        await currentBotInstance.stop();
        logger.info('Bot stopped gracefully');
      } catch (stopError) {
        logger.warn('Error stopping bot gracefully:', stopError.message);
      }
    }

    // Emit status update
    io.emit('bot-status-update', botStatus);

    res.json({ 
      success: true, 
      message: 'Bot stop requested successfully',
      botStatus: botStatus
    });
  } catch (error) {
    logger.error('Stop bot error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Account management
app.get('/accounts', async (req, res) => {
  try {
    const accounts = await fs.readJson('./accounts.json').catch(() => []);
    res.json({ accounts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/add-account', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const accounts = await fs.readJson('./accounts.json').catch(() => []);
    
    // Check if account already exists
    if (accounts.some(acc => acc.email === email)) {
      return res.status(400).json({ error: 'Account already exists' });
    }

    accounts.push({ email, password });
    await fs.writeJson('./accounts.json', accounts, { spaces: 2 });

    res.json({ 
      success: true, 
      message: 'Account added successfully',
      accounts: accounts.length
    });
  } catch (error) {
    logger.error('Add account error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/accounts/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const accounts = await fs.readJson('./accounts.json').catch(() => []);
    
    const filteredAccounts = accounts.filter(acc => acc.email !== email);
    
    if (filteredAccounts.length === accounts.length) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await fs.writeJson('./accounts.json', filteredAccounts, { spaces: 2 });

    res.json({ 
      success: true, 
      message: 'Account deleted successfully',
      accounts: filteredAccounts.length
    });
  } catch (error) {
    logger.error('Delete account error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Video management
app.get('/videos', async (req, res) => {
  try {
    const videos = await fs.readdir('./videos/').catch(() => []);
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'];
    const videoFiles = videos.filter(file => 
      videoExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );

    const videoDetails = [];
    for (const video of videoFiles) {
      try {
        const stats = await fs.stat(path.join('./videos/', video));
        videoDetails.push({
          name: video,
          size: formatBytes(stats.size),
          format: path.extname(video).toLowerCase(),
          lastModified: stats.mtime
        });
      } catch (error) {
        videoDetails.push({
          name: video,
          size: 'Unknown',
          format: path.extname(video).toLowerCase(),
          lastModified: null
        });
      }
    }

    res.json({ videos: videoDetails });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/videos/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const videoPath = path.join('./videos/', name);
    
    if (!await fs.pathExists(videoPath)) {
      return res.status(404).json({ error: 'Video not found' });
    }

    await fs.remove(videoPath);

    res.json({ 
      success: true, 
      message: 'Video deleted successfully'
    });
  } catch (error) {
    logger.error('Delete video error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/videos', async (req, res) => {
  try {
    const videos = await fs.readdir('./videos/').catch(() => []);
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'];
    const videoFiles = videos.filter(file => 
      videoExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );

    for (const video of videoFiles) {
      try {
        await fs.remove(path.join('./videos/', video));
      } catch (error) {
        logger.error(`Failed to delete video ${video}:`, error.message);
      }
    }

    res.json({ 
      success: true, 
      message: `Deleted ${videoFiles.length} videos`
    });
  } catch (error) {
    logger.error('Clear videos error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Configuration management
app.get('/configuration', async (req, res) => {
  try {
    const config = await fs.readJson('./config.js').catch(() => ({}));
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/configuration', async (req, res) => {
  try {
    const config = req.body;
    
    // Validate configuration
    if (config.maxVideosPerChannel && (config.maxVideosPerChannel < 1 || config.maxVideosPerChannel > 10)) {
      return res.status(400).json({ error: 'Max videos per channel must be between 1 and 10' });
    }

    if (config.uploadDelay && (config.uploadDelay < 1 || config.uploadDelay > 60)) {
      return res.status(400).json({ error: 'Upload delay must be between 1 and 60 seconds' });
    }

    if (config.retryAttempts && (config.retryAttempts < 1 || config.retryAttempts > 5)) {
      return res.status(400).json({ error: 'Retry attempts must be between 1 and 5' });
    }

    // Update config file
    const configPath = './config.js';
    let configContent = await fs.readFile(configPath, 'utf8').catch(() => 'module.exports = {};');
    
    // Simple config update (in a real app, you'd want a more robust solution)
    // For now, we'll just save the config as a separate file
    await fs.writeJson('./bot-config.json', config, { spaces: 2 });

    res.json({ 
      success: true, 
      message: 'Configuration saved successfully'
    });
  } catch (error) {
    logger.error('Save configuration error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API configuration
app.post('/api-config', async (req, res) => {
  try {
    const { apiToken, webPort } = req.body;
    
    if (!apiToken) {
      return res.status(400).json({ error: 'API token is required' });
    }

    // Update .env file
    const envContent = `GOLOGIN_API_TOKEN=${apiToken}\nPORT=${webPort || 3001}\n`;
    await fs.writeFile('./.env', envContent);

    res.json({ 
      success: true, 
      message: 'API configuration saved successfully'
    });
  } catch (error) {
    logger.error('Save API config error:', error.message);
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
        try {
          const content = await fs.readFile(`./logs/${file}`, 'utf8');
          const stats = await fs.stat(`./logs/${file}`);
          
          logs.push({
            filename: file,
            content: content.substring(0, 2000) + (content.length > 2000 ? '...' : ''),
            size: content.length,
            lastModified: stats.mtime,
            fullSize: stats.size
          });
        } catch (error) {
          logs.push({
            filename: file,
            content: 'Error reading file',
            size: 0,
            error: error.message
          });
        }
      }
    }
    
    // Sort by last modified date (newest first)
    logs.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/logs', async (req, res) => {
  try {
    const logFiles = await fs.readdir('./logs/');
    
    for (const file of logFiles) {
      if (file.endsWith('.log') || file.endsWith('.json')) {
        try {
          await fs.remove(`./logs/${file}`);
        } catch (error) {
          logger.error(`Failed to delete log file ${file}:`, error.message);
        }
      }
    }

    res.json({ 
      success: true, 
      message: 'Logs cleared successfully'
    });
  } catch (error) {
    logger.error('Clear logs error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get system info
app.get('/system-info', async (req, res) => {
  try {
    const os = require('os');
    const process = require('process');
    
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: formatBytes(os.totalmem()),
        free: formatBytes(os.freemem()),
        used: formatBytes(os.totalmem() - os.freemem()),
        usage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0].model
      },
      uptime: {
        system: Math.round(os.uptime() / 3600) + ' hours',
        process: Math.round(process.uptime() / 3600) + ' hours'
      }
    };

    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test API connectivity
app.get('/test-api', async (req, res) => {
  try {
    const GoLoginAPI = require('./utils/gologin');
    const gologin = new GoLoginAPI();
    
    // Test API token and connectivity
    const testResults = {
      timestamp: new Date().toISOString(),
      apiToken: {
        exists: !!process.env.GOLOGIN_API_TOKEN,
        length: process.env.GOLOGIN_API_TOKEN ? process.env.GOLOGIN_API_TOKEN.length : 0,
        valid: false
      },
      connectivity: {
        status: 'unknown',
        error: null
      },
      profiles: {
        count: 0,
        error: null
      },
      recommendations: []
    };

    // Check if API token exists
    if (!process.env.GOLOGIN_API_TOKEN) {
      testResults.recommendations.push('GOLOGIN_API_TOKEN not found in environment variables');
      return res.json(testResults);
    }

    // Test API token format (basic validation)
    if (process.env.GOLOGIN_API_TOKEN.length < 10) {
      testResults.recommendations.push('API token seems too short, please verify it');
    }

    try {
      // Test API connectivity
      await gologin.testConnection();
      testResults.connectivity.status = 'success';
      testResults.profiles.count = 1; // API working means we can create profiles
      testResults.apiToken.valid = true;
      
      testResults.recommendations.push('API connection successful. Bot is ready to run.');
    } catch (apiError) {
      testResults.connectivity.status = 'failed';
      testResults.connectivity.error = apiError.message;
      testResults.apiToken.valid = false;
      
      if (apiError.message.includes('401') || apiError.message.includes('Unauthorized')) {
        testResults.recommendations.push('API token is invalid or expired. Please check your GoLogin API token.');
      } else if (apiError.message.includes('ENOTFOUND') || apiError.message.includes('ECONNREFUSED')) {
        testResults.recommendations.push('Cannot connect to GoLogin API. Check your internet connection.');
      } else {
        testResults.recommendations.push(`API Error: ${apiError.message}`);
      }
    }

    res.json(testResults);
  } catch (error) {
    logger.error('API test error:', error.message);
    res.status(500).json({ 
      error: 'Failed to test API',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error.message);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Utility function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Start server
async function startServer() {
  await createUploadDirs();
  
  server.listen(PORT, () => {
    logger.info(`🌐 Web interface running on http://localhost:${PORT}`);
    logger.info('📁 Upload directories created');
    logger.info('🚀 Ready to accept uploads and run bot');
    logger.info('📊 Health check available at /health');
    logger.info('🔧 System info available at /system-info');
    logger.info('🔌 Socket.IO enabled for real-time updates');
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

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

startServer().catch(error => {
  logger.error('Failed to start web interface:', error.message);
  process.exit(1);
}); 