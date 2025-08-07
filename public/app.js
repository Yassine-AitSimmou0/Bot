// YouTube Bot Management Platform
class YouTubeBotManager {
    constructor() {
        this.socket = null;
        this.currentSection = 'dashboard';
        this.botRunning = false;
        this.uploadType = null;
        this.selectedFiles = [];
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        this.logAutoRefreshInterval = null;
        
        this.init();
    }

    init() {
        this.setupSocket();
        this.setupEventListeners();
        this.loadInitialData();
        this.setupAutoRefresh();
        this.applyDarkMode();
    }

    setupSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.updateBotStatus('online');
        });

        this.socket.on('disconnect', () => {
            this.updateBotStatus('offline');
        });

        this.socket.on('bot-status-update', (data) => {
            this.updateBotProgress(data);
        });

        this.socket.on('log-update', (data) => {
            this.appendLog(data.message);
        });
        
        // Set up log auto-refresh when bot is running
        this.socket.on('bot-status-update', (data) => {
            if (data.isRunning) {
                this.startLogAutoRefresh();
            } else {
                this.stopLogAutoRefresh();
            }
        });
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });

        // Sidebar
        document.getElementById('openSidebar').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('sidebar-closed');
        });

        document.getElementById('closeSidebar').addEventListener('click', () => {
            document.getElementById('sidebar').classList.add('sidebar-closed');
        });

        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });

        // Quick Actions
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshAll();
        });

        document.getElementById('startBotBtn').addEventListener('click', () => {
            this.startBot();
        });

        document.getElementById('stopBotBtn').addEventListener('click', () => {
            this.stopBot();
        });

        // Upload buttons
        document.getElementById('uploadAccountsBtn').addEventListener('click', () => {
            this.showUploadModal('accounts');
        });

        document.getElementById('uploadVideosBtn').addEventListener('click', () => {
            this.showUploadModal('videos');
        });

        document.getElementById('testApiQuickBtn').addEventListener('click', () => {
            this.testApi();
        });

        document.getElementById('importAccountsBtn').addEventListener('click', () => {
            this.showUploadModal('accounts');
        });

        document.getElementById('uploadVideoBtn').addEventListener('click', () => {
            this.showUploadModal('videos');
        });

        // Account management
        document.getElementById('addAccountBtn').addEventListener('click', () => {
            this.showAddAccountModal();
        });

        // Video management
        document.getElementById('clearVideosBtn').addEventListener('click', () => {
            this.clearAllVideos();
        });

        // Configuration
        document.getElementById('configForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConfiguration();
        });

        document.getElementById('apiConfigForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveApiConfiguration();
        });

        // Test API button
        document.getElementById('testApiBtn').addEventListener('click', () => {
            this.testApi();
        });

        // Logs
        document.getElementById('refreshLogsBtn').addEventListener('click', () => {
            this.refreshLogs();
        });

        document.getElementById('clearLogsBtn').addEventListener('click', () => {
            this.clearLogs();
        });

        // Modals
        this.setupModalEvents();

        // File upload
        this.setupFileUpload();
    }

    setupModalEvents() {
        // Add Account Modal
        document.getElementById('addAccountForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addAccount();
        });

        document.getElementById('cancelAddAccount').addEventListener('click', () => {
            this.hideModal('addAccountModal');
        });

        // Upload Modal
        document.getElementById('confirmUpload').addEventListener('click', () => {
            this.uploadFiles();
        });

        document.getElementById('cancelUpload').addEventListener('click', () => {
            this.hideModal('uploadModal');
        });

        // Modal overlays
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideAllModals();
                }
            });
        });
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            this.handleFileSelection(files);
        });

        // Click to browse
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFileSelection(files);
        });
    }

    handleFileSelection(files) {
        this.selectedFiles = files;
        this.updateUploadModal();
    }

    updateUploadModal() {
        const confirmBtn = document.getElementById('confirmUpload');
        const uploadArea = document.getElementById('uploadArea');
        
        if (this.selectedFiles.length > 0) {
            confirmBtn.disabled = false;
            uploadArea.innerHTML = `
                <div class="space-y-2">
                    <i class="fas fa-check-circle text-4xl text-success-500 dark:text-success-400 mb-4"></i>
                    <p class="text-lg font-medium text-gray-700 dark:text-gray-300">${this.selectedFiles.length} file(s) selected</p>
                    <div class="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                        ${this.selectedFiles.map(file => `
                            <div class="flex items-center justify-between">
                                <span>${file.name}</span>
                                <span class="text-xs">${this.formatFileSize(file.size)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            confirmBtn.disabled = true;
            uploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                <p class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Drop files here or click to browse</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Supports JSON files for accounts, video files for videos</p>
            `;
        }
    }

    async loadInitialData() {
        await Promise.all([
            this.refreshStatus(),
            this.loadAccounts(),
            this.loadVideos(),
            this.loadConfiguration(),
            this.refreshLogs(),
            this.loadSystemInfo(),
            this.loadHealthStatus()
        ]);
    }

    setupAutoRefresh() {
        // Auto-refresh status every 30 seconds
        setInterval(() => {
            this.refreshStatus();
        }, 30000);

        // Auto-refresh logs every 10 seconds if on logs section
        setInterval(() => {
            if (this.currentSection === 'logs') {
                this.refreshLogs();
            }
        }, 10000);
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected section
        const section = document.getElementById(sectionName);
        if (section) {
            section.classList.add('active');
        }

        // Update nav link
        const navLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (navLink) {
            navLink.classList.add('active');
        }

        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        const titles = {
            dashboard: 'Dashboard',
            accounts: 'Accounts',
            videos: 'Videos',
            configuration: 'Configuration',
            logs: 'Logs',
            system: 'System'
        };
        pageTitle.textContent = titles[sectionName] || 'Dashboard';

        this.currentSection = sectionName;

        // Load section-specific data
        switch (sectionName) {
            case 'accounts':
                this.loadAccounts();
                break;
            case 'videos':
                this.loadVideos();
                break;
            case 'logs':
                this.refreshLogs();
                break;
            case 'system':
                this.loadSystemInfo();
                this.loadHealthStatus();
                break;
        }
    }

    async refreshStatus() {
        try {
            const response = await fetch('/status');
            const data = await response.json();
            
            this.updateStatusDisplay(data);
        } catch (error) {
            this.showAlert('Error loading status: ' + error.message, 'error');
        }
    }

    updateStatusDisplay(data) {
        // Update status cards
        document.getElementById('accountsCount').textContent = data.accounts;
        document.getElementById('videosCount').textContent = data.videos;
        
        // Update API status with detailed information
        const apiStatusElement = document.getElementById('apiStatus');
        if (data.apiStatus) {
            if (data.apiStatus.tokenValid && data.apiStatus.connectivity === 'success') {
                apiStatusElement.textContent = '✅ Connected';
                apiStatusElement.className = 'text-2xl font-bold text-success-600';
            } else if (data.apiStatus.tokenExists) {
                apiStatusElement.textContent = '⚠️ Error';
                apiStatusElement.className = 'text-2xl font-bold text-warning-600';
                // Show error tooltip or alert
                if (data.apiStatus.error) {
                    this.showAlert(`API Error: ${data.apiStatus.error}`, 'warning');
                }
            } else {
                apiStatusElement.textContent = '❌ No Token';
                apiStatusElement.className = 'text-2xl font-bold text-danger-600';
            }
        } else {
            apiStatusElement.textContent = data.hasEnvFile ? '✅' : '❌';
            apiStatusElement.className = 'text-2xl font-bold text-gray-900';
        }
        
        document.getElementById('botReady').textContent = data.botReady ? '✅' : '❌';

        // Update bot status indicator
        const botStatus = document.getElementById('botStatus');
        if (data.botStatus && data.botStatus.isRunning) {
            botStatus.className = 'status-indicator status-online';
            botStatus.innerHTML = '<span class="w-2 h-2 bg-success-400 rounded-full mr-2"></span><span>Running</span>';
        } else {
            botStatus.className = 'status-indicator status-offline';
            botStatus.innerHTML = '<span class="w-2 h-2 bg-gray-400 rounded-full mr-2"></span><span>Offline</span>';
        }

        // Update buttons
        const startBtn = document.getElementById('startBotBtn');
        const stopBtn = document.getElementById('stopBotBtn');
        
        startBtn.disabled = !data.botReady || (data.botStatus && data.botStatus.isRunning);
        stopBtn.disabled = !(data.botStatus && data.botStatus.isRunning);

        // Update progress if bot is running
        if (data.botStatus && data.botStatus.isRunning) {
            this.updateBotProgress(data.botStatus);
        }
    }

    updateBotProgress(botStatus) {
        const progressSection = document.getElementById('progressSection');
        const noProgress = document.getElementById('noProgress');
        
        if (botStatus.isRunning) {
            progressSection.style.display = 'block';
            noProgress.style.display = 'none';
            
            // Update progress bar
            document.getElementById('progressPercent').textContent = `${Math.round(botStatus.progress)}%`;
            document.getElementById('progressFill').style.width = `${botStatus.progress}%`;
            
            // Update statistics
            document.getElementById('processedAccounts').textContent = botStatus.processedAccounts;
            document.getElementById('successfulUploads').textContent = botStatus.successfulUploads;
            document.getElementById('failedUploads').textContent = botStatus.failedUploads;
            
            // Update current account
            document.getElementById('currentAccount').textContent = botStatus.currentAccount || 'Initializing...';
            
            // Update start time
            if (botStatus.startTime) {
                const startTime = new Date(botStatus.startTime);
                document.getElementById('startTime').textContent = startTime.toLocaleTimeString();
                
                // Calculate elapsed time
                const elapsed = Date.now() - startTime.getTime();
                const elapsedMinutes = Math.floor(elapsed / 60000);
                const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
                document.getElementById('elapsedTime').textContent = `${elapsedMinutes}m ${elapsedSeconds}s`;
                
                // Calculate ETA
                if (botStatus.progress > 0 && botStatus.totalAccounts > 0) {
                    const remainingAccounts = botStatus.totalAccounts - botStatus.processedAccounts;
                    const avgTimePerAccount = elapsed / botStatus.processedAccounts;
                    const etaMs = remainingAccounts * avgTimePerAccount;
                    const etaMinutes = Math.floor(etaMs / 60000);
                    const etaSeconds = Math.floor((etaMs % 60000) / 1000);
                    document.getElementById('estimatedTime').textContent = `${etaMinutes}m ${etaSeconds}s`;
                } else {
                    document.getElementById('estimatedTime').textContent = 'Calculating...';
                }
            }
            
            // Update current activity based on progress
            this.updateCurrentActivity(botStatus);
            
        } else {
            progressSection.style.display = 'none';
            noProgress.style.display = 'block';
            
            // Reset all fields when bot stops
            document.getElementById('currentAccount').textContent = '-';
            document.getElementById('startTime').textContent = '-';
            document.getElementById('elapsedTime').textContent = '-';
            document.getElementById('estimatedTime').textContent = '-';
            document.getElementById('currentActivity').textContent = 'Bot stopped';
        }
    }
    
    updateCurrentActivity(botStatus) {
        const currentActivity = document.getElementById('currentActivity');
        
        if (botStatus.processedAccounts === 0) {
            currentActivity.textContent = 'Initializing bot and loading accounts...';
        } else if (botStatus.currentAccount) {
            currentActivity.textContent = `Processing account: ${botStatus.currentAccount}`;
        } else if (botStatus.progress === 100) {
            currentActivity.textContent = 'Bot completed successfully!';
        } else {
            currentActivity.textContent = `Processing account ${botStatus.processedAccounts + 1} of ${botStatus.totalAccounts}`;
        }
        
        // Update activity feed
        this.addActivityToFeed(currentActivity.textContent);
    }
    
    addActivityToFeed(activity) {
        const activityFeed = document.getElementById('activityFeed');
        const activityStatus = document.getElementById('activityStatus');
        
        // Update status indicator
        activityStatus.className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
        
        // Remove waiting message if present
        const waitingMessage = activityFeed.querySelector('.text-center');
        if (waitingMessage) {
            waitingMessage.remove();
        }
        
        // Add new activity entry
        const activityEntry = document.createElement('div');
        activityEntry.className = 'flex items-center space-x-2 p-2 bg-gray-50 rounded text-sm';
        
        const timestamp = new Date().toLocaleTimeString();
        activityEntry.innerHTML = `
            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span class="text-gray-500">[${timestamp}]</span>
            <span class="text-gray-700">${activity}</span>
        `;
        
        activityFeed.appendChild(activityEntry);
        
        // Keep only last 10 activities
        const activities = activityFeed.querySelectorAll('.flex');
        if (activities.length > 10) {
            activities[0].remove();
        }
        
        // Auto-scroll to bottom
        activityFeed.scrollTop = activityFeed.scrollHeight;
    }

    updateBotStatus(status) {
        const botStatus = document.getElementById('botStatus');
        const statusClasses = {
            online: 'status-online',
            offline: 'status-offline',
            error: 'status-error',
            warning: 'status-warning'
        };
        
        botStatus.className = `status-indicator ${statusClasses[status] || 'status-offline'}`;
    }

    async startBot() {
        try {
            const response = await fetch('/start-bot', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('Bot started successfully!', 'success');
                this.refreshStatus();
            } else {
                this.showAlert(data.error, 'error');
            }
        } catch (error) {
            this.showAlert('Failed to start bot: ' + error.message, 'error');
        }
    }

    async stopBot() {
        try {
            const response = await fetch('/stop-bot', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('Bot stopped successfully!', 'success');
                this.refreshStatus();
            } else {
                this.showAlert(data.error, 'error');
            }
        } catch (error) {
            this.showAlert('Failed to stop bot: ' + error.message, 'error');
        }
    }

    showUploadModal(type) {
        this.uploadType = type;
        const modal = document.getElementById('uploadModal');
        const title = document.getElementById('uploadModalTitle');
        
        title.textContent = type === 'accounts' ? 'Upload Accounts' : 'Upload Videos';
        modal.style.display = 'block';
        
        // Reset file selection
        this.selectedFiles = [];
        this.updateUploadModal();
    }

    async uploadFiles() {
        if (this.selectedFiles.length === 0) {
            this.showAlert('Please select files to upload', 'error');
            return;
        }

        const formData = new FormData();
        const fieldName = this.uploadType === 'accounts' ? 'accounts' : 'videos';
        
        this.selectedFiles.forEach(file => {
            formData.append(fieldName, file);
        });

        try {
            const endpoint = this.uploadType === 'accounts' ? '/upload-accounts' : '/upload-videos';
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.success) {
                this.showAlert(data.message, 'success');
                this.hideModal('uploadModal');
                this.refreshStatus();
                
                // Reload relevant sections
                if (this.uploadType === 'accounts') {
                    this.loadAccounts();
                } else {
                    this.loadVideos();
                }
            } else {
                this.showAlert(data.error, 'error');
            }
        } catch (error) {
            this.showAlert('Upload failed: ' + error.message, 'error');
        }
    }

    showAddAccountModal() {
        document.getElementById('addAccountModal').style.display = 'block';
    }

    async addAccount() {
        const email = document.getElementById('accountEmail').value;
        const password = document.getElementById('accountPassword').value;

        if (!email || !password) {
            this.showAlert('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch('/add-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showAlert('Account added successfully!', 'success');
                this.hideModal('addAccountModal');
                this.loadAccounts();
                this.refreshStatus();
                
                // Clear form
                document.getElementById('accountEmail').value = '';
                document.getElementById('accountPassword').value = '';
            } else {
                this.showAlert(data.error, 'error');
            }
        } catch (error) {
            this.showAlert('Failed to add account: ' + error.message, 'error');
        }
    }

    async loadAccounts() {
        try {
            const response = await fetch('/accounts');
            const data = await response.json();
            
            const accountsList = document.getElementById('accountsList');
            
            if (data.accounts && data.accounts.length > 0) {
                accountsList.innerHTML = data.accounts.map(account => `
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-primary-600 dark:text-primary-400"></i>
                            </div>
                            <div>
                                <p class="font-medium text-gray-900 dark:text-white">${account.email}</p>
                                <p class="text-sm text-gray-500 dark:text-gray-400">••••••••</p>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button class="btn btn-outline btn-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-500" onclick="app.editAccount('${account.email}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="app.deleteAccount('${account.email}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            } else {
                accountsList.innerHTML = `
                    <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                        <i class="fas fa-users text-4xl mb-4"></i>
                        <p>No accounts found</p>
                        <p class="text-sm">Add accounts to get started</p>
                    </div>
                `;
            }
        } catch (error) {
            this.showAlert('Error loading accounts: ' + error.message, 'error');
        }
    }

    async loadVideos() {
        try {
            const response = await fetch('/videos');
            const data = await response.json();
            
            const videosList = document.getElementById('videosList');
            
            if (data.videos && data.videos.length > 0) {
                videosList.innerHTML = data.videos.map(video => `
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-secondary-100 dark:bg-secondary-900 rounded-full flex items-center justify-center">
                                <i class="fas fa-video text-secondary-600 dark:text-secondary-400"></i>
                            </div>
                            <div>
                                <p class="font-medium text-gray-900 dark:text-white">${video.name}</p>
                                <p class="text-sm text-gray-500 dark:text-gray-400">${video.size} • ${video.format}</p>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button class="btn btn-outline btn-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-500" onclick="app.previewVideo('${video.name}')">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="app.deleteVideo('${video.name}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            } else {
                videosList.innerHTML = `
                    <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                        <i class="fas fa-video text-4xl mb-4"></i>
                        <p>No videos found</p>
                        <p class="text-sm">Upload videos to get started</p>
                    </div>
                `;
            }
        } catch (error) {
            this.showAlert('Error loading videos: ' + error.message, 'error');
        }
    }

    async loadConfiguration() {
        try {
            const response = await fetch('/configuration');
            const data = await response.json();
            
            // Populate form fields
            document.getElementById('maxVideosPerChannel').value = data.maxVideosPerChannel || 1;
            document.getElementById('uploadDelay').value = data.uploadDelay || 5;
            document.getElementById('retryAttempts').value = data.retryAttempts || 3;
            document.getElementById('saveCookies').checked = data.saveCookies !== false;
            document.getElementById('humanBehavior').checked = data.humanBehavior !== false;
        } catch (error) {
            this.showAlert('Error loading configuration: ' + error.message, 'error');
        }
    }

    async saveConfiguration() {
        const config = {
            maxVideosPerChannel: parseInt(document.getElementById('maxVideosPerChannel').value),
            uploadDelay: parseInt(document.getElementById('uploadDelay').value),
            retryAttempts: parseInt(document.getElementById('retryAttempts').value),
            saveCookies: document.getElementById('saveCookies').checked,
            humanBehavior: document.getElementById('humanBehavior').checked
        };

        try {
            const response = await fetch('/configuration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            const data = await response.json();
            
            if (data.success) {
                this.showAlert('Configuration saved successfully!', 'success');
            } else {
                this.showAlert(data.error, 'error');
            }
        } catch (error) {
            this.showAlert('Failed to save configuration: ' + error.message, 'error');
        }
    }

    async saveApiConfiguration() {
        const apiToken = document.getElementById('apiToken').value;
        const webPort = document.getElementById('webPort').value;

        try {
            const response = await fetch('/api-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiToken, webPort })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showAlert('API configuration saved successfully!', 'success');
                this.refreshStatus();
            } else {
                this.showAlert(data.error, 'error');
            }
        } catch (error) {
            this.showAlert('Failed to save API configuration: ' + error.message, 'error');
        }
    }

    async testApi() {
        const testBtn = document.getElementById('testApiBtn');
        const resultsDiv = document.getElementById('apiTestResults');
        const contentDiv = document.getElementById('apiTestContent');
        
        // Show loading state
        testBtn.disabled = true;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Testing...';
        resultsDiv.style.display = 'block';
        contentDiv.innerHTML = '<div class="text-gray-500">Testing API connectivity...</div>';

        try {
            const response = await fetch('/test-api');
            const data = await response.json();
            
            let resultsHtml = '';
            
            // API Token Status
            resultsHtml += `
                <div class="flex items-center justify-between p-2 ${data.apiToken.exists ? 'bg-green-50' : 'bg-red-50'} rounded">
                    <span class="font-medium">API Token:</span>
                    <span class="${data.apiToken.exists ? 'text-green-600' : 'text-red-600'}">
                        ${data.apiToken.exists ? '✅ Found' : '❌ Not Found'}
                    </span>
                </div>
            `;
            
            if (data.apiToken.exists) {
                resultsHtml += `
                    <div class="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <span class="font-medium">Token Length:</span>
                        <span class="text-blue-600">${data.apiToken.length} characters</span>
                    </div>
                `;
            }
            
            // Connectivity Status
            const connectivityColor = data.connectivity.status === 'success' ? 'green' : 'red';
            resultsHtml += `
                <div class="flex items-center justify-between p-2 bg-${connectivityColor}-50 rounded">
                    <span class="font-medium">Connectivity:</span>
                    <span class="text-${connectivityColor}-600">
                        ${data.connectivity.status === 'success' ? '✅ Connected' : '❌ Failed'}
                    </span>
                </div>
            `;
            
            if (data.connectivity.error) {
                resultsHtml += `
                    <div class="p-2 bg-red-50 rounded">
                        <span class="font-medium text-red-600">Error:</span>
                        <span class="text-red-600 ml-2">${data.connectivity.error}</span>
                    </div>
                `;
            }
            
            // Profiles Count
            resultsHtml += `
                <div class="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span class="font-medium">Profiles Found:</span>
                    <span class="text-blue-600">${data.profiles.count}</span>
                </div>
            `;
            
            // Recommendations
            if (data.recommendations && data.recommendations.length > 0) {
                resultsHtml += '<div class="mt-3 p-3 bg-yellow-50 rounded">';
                resultsHtml += '<span class="font-medium text-yellow-700">Recommendations:</span>';
                resultsHtml += '<ul class="mt-2 space-y-1">';
                data.recommendations.forEach(rec => {
                    resultsHtml += `<li class="text-yellow-600 text-sm">• ${rec}</li>`;
                });
                resultsHtml += '</ul></div>';
            }
            
            // Overall Status
            const overallStatus = data.apiToken.valid && data.connectivity.status === 'success';
            resultsHtml += `
                <div class="mt-3 p-3 ${overallStatus ? 'bg-green-50' : 'bg-red-50'} rounded">
                    <span class="font-medium ${overallStatus ? 'text-green-700' : 'text-red-700'}">
                        ${overallStatus ? '✅ API is working correctly!' : '❌ API has issues'}
                    </span>
                </div>
            `;
            
            contentDiv.innerHTML = resultsHtml;
            
            // Show alert based on results
            if (overallStatus) {
                this.showAlert('API test successful! Bot is ready to run.', 'success');
            } else {
                this.showAlert('API test failed. Please check the results above.', 'error');
            }
            
        } catch (error) {
            contentDiv.innerHTML = `
                <div class="p-2 bg-red-50 rounded">
                    <span class="font-medium text-red-600">Test Failed:</span>
                    <span class="text-red-600 ml-2">${error.message}</span>
                </div>
            `;
            this.showAlert('Failed to test API: ' + error.message, 'error');
        } finally {
            // Reset button state
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-vial mr-2"></i>Test API';
        }
    }

    async refreshLogs() {
        try {
            const response = await fetch('/logs');
            const data = await response.json();
            
            const logsContainer = document.getElementById('logsContainer');
            
            if (data.logs && data.logs.length > 0) {
                let logContent = '';
                data.logs.forEach(log => {
                    const level = log.level ? log.level.toUpperCase() : 'INFO';
                    logContent += `[${log.timestamp}] ${level}: ${log.message}\n`;
                });
                
                logsContainer.textContent = logContent;
                logsContainer.scrollTop = logsContainer.scrollHeight;
            } else {
                logsContainer.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-terminal text-4xl mb-4"></i>
                        <p>No logs available</p>
                    </div>
                `;
            }
        } catch (error) {
            this.showAlert('Error loading logs: ' + error.message, 'error');
        }
    }

    appendLog(message) {
        const logsContainer = document.getElementById('logsContainer');
        
        // Remove loading message if present
        const loadingMessage = logsContainer.querySelector('.text-center');
        if (loadingMessage) {
            loadingMessage.remove();
        }
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry mb-1';
        
        // Determine log level and color
        let logColor = 'text-green-400';
        if (message.toLowerCase().includes('error')) {
            logColor = 'text-red-400';
        } else if (message.toLowerCase().includes('warning')) {
            logColor = 'text-yellow-400';
        } else if (message.toLowerCase().includes('info')) {
            logColor = 'text-blue-400';
        }
        
        logEntry.innerHTML = `<span class="text-gray-400">[${timestamp}]</span> <span class="${logColor}">${message}</span>`;
        logsContainer.appendChild(logEntry);
        
        // Auto-scroll to bottom
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
    
    startLogAutoRefresh() {
        if (!this.logAutoRefreshInterval) {
            this.logAutoRefreshInterval = setInterval(() => {
                this.refreshLogs();
            }, 2000); // Refresh every 2 seconds when bot is running
        }
    }
    
    stopLogAutoRefresh() {
        if (this.logAutoRefreshInterval) {
            clearInterval(this.logAutoRefreshInterval);
            this.logAutoRefreshInterval = null;
        }
    }

    async clearLogs() {
        if (confirm('Are you sure you want to clear all logs?')) {
            try {
                const response = await fetch('/logs', { method: 'DELETE' });
                const data = await response.json();
                
                if (data.success) {
                    this.showAlert('Logs cleared successfully!', 'success');
                    this.refreshLogs();
                } else {
                    this.showAlert(data.error, 'error');
                }
            } catch (error) {
                this.showAlert('Failed to clear logs: ' + error.message, 'error');
            }
        }
    }

    async loadSystemInfo() {
        try {
            const response = await fetch('/system-info');
            const data = await response.json();
            
            const systemInfo = document.getElementById('systemInfo');
            systemInfo.innerHTML = `
                <div class="space-y-4">
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Platform:</span>
                        <span class="font-medium text-gray-900 dark:text-white">${data.platform}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Architecture:</span>
                        <span class="font-medium text-gray-900 dark:text-white">${data.arch}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Node Version:</span>
                        <span class="font-medium text-gray-900 dark:text-white">${data.nodeVersion}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Memory Usage:</span>
                        <span class="font-medium text-gray-900 dark:text-white">${data.memory.usage}%</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">CPU Cores:</span>
                        <span class="font-medium text-gray-900 dark:text-white">${data.cpu.cores}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Uptime:</span>
                        <span class="font-medium text-gray-900 dark:text-white">${data.uptime.process}</span>
                    </div>
                </div>
            `;
        } catch (error) {
            this.showAlert('Error loading system info: ' + error.message, 'error');
        }
    }

    async loadHealthStatus() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            
            const healthStatus = document.getElementById('healthStatus');
            healthStatus.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Status:</span>
                        <span class="badge badge-success">${data.status}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Uptime:</span>
                        <span class="font-medium text-gray-900 dark:text-white">${Math.round(data.uptime / 3600)} hours</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Last Check:</span>
                        <span class="font-medium text-gray-900 dark:text-white">${new Date(data.timestamp).toLocaleTimeString()}</span>
                    </div>
                </div>
            `;
        } catch (error) {
            this.showAlert('Error loading health status: ' + error.message, 'error');
        }
    }

    async clearAllVideos() {
        if (confirm('Are you sure you want to clear all videos? This action cannot be undone.')) {
            try {
                const response = await fetch('/videos', { method: 'DELETE' });
                const data = await response.json();
                
                if (data.success) {
                    this.showAlert('All videos cleared successfully!', 'success');
                    this.loadVideos();
                    this.refreshStatus();
                } else {
                    this.showAlert(data.error, 'error');
                }
            } catch (error) {
                this.showAlert('Failed to clear videos: ' + error.message, 'error');
            }
        }
    }

    async refreshAll() {
        this.showAlert('Refreshing all data...', 'info');
        await this.loadInitialData();
        this.showAlert('All data refreshed successfully!', 'success');
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        alert.className = `alert alert-${type} animate-fade-in`;
        alert.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${icons[type]} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        alertContainer.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Dark mode functionality
    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        this.applyDarkMode();
    }

    applyDarkMode() {
        const body = document.body;
        const darkModeBtn = document.getElementById('darkModeToggle');
        const icon = darkModeBtn.querySelector('i');
        const text = darkModeBtn.querySelector('span');

        if (this.darkMode) {
            body.classList.add('dark');
            icon.className = 'fas fa-sun mr-2';
            if (text) {
                text.textContent = 'Light Mode';
            }
        } else {
            body.classList.remove('dark');
            icon.className = 'fas fa-moon mr-2';
            if (text) {
                text.textContent = 'Dark Mode';
            }
        }
    }

    // Account management methods
    async editAccount(email) {
        // Implementation for editing account
        this.showAlert('Edit account functionality coming soon!', 'info');
    }

    async deleteAccount(email) {
        if (confirm(`Are you sure you want to delete the account ${email}?`)) {
            try {
                const response = await fetch(`/accounts/${encodeURIComponent(email)}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                
                if (data.success) {
                    this.showAlert('Account deleted successfully!', 'success');
                    this.loadAccounts();
                    this.refreshStatus();
                } else {
                    this.showAlert(data.error, 'error');
                }
            } catch (error) {
                this.showAlert('Failed to delete account: ' + error.message, 'error');
            }
        }
    }

    // Video management methods
    async previewVideo(name) {
        // Implementation for video preview
        this.showAlert('Video preview functionality coming soon!', 'info');
    }

    async deleteVideo(name) {
        if (confirm(`Are you sure you want to delete the video ${name}?`)) {
            try {
                const response = await fetch(`/videos/${encodeURIComponent(name)}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                
                if (data.success) {
                    this.showAlert('Video deleted successfully!', 'success');
                    this.loadVideos();
                    this.refreshStatus();
                } else {
                    this.showAlert(data.error, 'error');
                }
            } catch (error) {
                this.showAlert('Failed to delete video: ' + error.message, 'error');
            }
        }
    }
}

// Initialize the application
const app = new YouTubeBotManager(); 