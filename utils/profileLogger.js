const fs = require('fs-extra');
const path = require('path');
const { logger } = require('./logger');

class ProfileLogger {
  constructor(email, profileId) {
    this.email = email;
    this.profileId = profileId;
    this.logFile = path.join('./logs', `profile_${email.replace('@', '_at_')}_${Date.now()}.json`);
    this.progress = {
      email: email,
      profileId: profileId,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'running',
      steps: {
        profileCreated: false,
        browserLaunched: false,
        gmailLogin: false,
        youtubeNavigation: false,
        channelCreated: false,
        videosUploaded: false,
        cookiesSaved: false,
        cookiesLoaded: false
      },
      errors: [],
      uploads: [],
      captchaDetected: false
    };
  }

  // Log a step completion
  logStep(step, success = true, details = {}) {
    this.progress.steps[step] = success;
    if (details) {
      this.progress.steps[`${step}Details`] = details;
    }
    this.saveProgress();
    logger.info(`[${this.email}] Step ${step}: ${success ? '✅' : '❌'}`);
  }

  // Log video upload
  logVideoUpload(videoPath, success = true, details = {}) {
    const upload = {
      video: path.basename(videoPath),
      timestamp: new Date().toISOString(),
      success: success,
      details: details
    };
    this.progress.uploads.push(upload);
    
    // Update videosUploaded step if this is a successful upload
    if (success) {
      this.progress.steps.videosUploaded = true;
    }
    
    this.saveProgress();
    logger.info(`[${this.email}] Video upload ${path.basename(videoPath)}: ${success ? '✅' : '❌'}`);
  }

  // Log error
  logError(error, step = 'unknown') {
    const errorInfo = {
      step: step,
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    this.progress.errors.push(errorInfo);
    this.saveProgress();
    logger.error(`[${this.email}] Error in ${step}:`, error.message);
  }

  // Log captcha detection
  logCaptcha() {
    this.progress.captchaDetected = true;
    this.saveProgress();
    logger.warn(`[${this.email}] CAPTCHA detected!`);
  }

  // Mark profile as completed
  complete(success = true) {
    this.progress.status = success ? 'completed' : 'failed';
    this.progress.endTime = new Date().toISOString();
    this.saveProgress();
    logger.info(`[${this.email}] Profile ${success ? 'completed successfully' : 'failed'}`);
  }

  // Save progress to file
  async saveProgress() {
    try {
      await fs.ensureDir(path.dirname(this.logFile));
      await fs.writeJson(this.logFile, this.progress, { spaces: 2 });
    } catch (error) {
      logger.error('Failed to save profile progress:', error.message);
    }
  }

  // Get progress summary
  getSummary() {
    const completedSteps = Object.values(this.progress.steps).filter(step => step === true).length;
    const totalSteps = Object.keys(this.progress.steps).length;
    const uploadCount = this.progress.uploads.filter(upload => upload.success).length;
    
    return {
      email: this.email,
      profileId: this.profileId,
      status: this.progress.status,
      progress: `${completedSteps}/${totalSteps}`,
      uploads: uploadCount,
      errors: this.progress.errors.length,
      captchaDetected: this.progress.captchaDetected
    };
  }
}

module.exports = ProfileLogger; 