const path = require('path');
const fs = require('fs-extra');
const HumanBehavior = require('./humanBehavior');
const config = require('../config');

class YouTubeAutomation {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
    this.human = new HumanBehavior(page);
  }

  // Navigate to YouTube
  async goToYouTube() {
    try {
      this.logger.logStep('youtubeNavigation', false, { status: 'starting' });
      
      // Navigate to YouTube
      await this.page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded' });
      await this.human.waitForPageLoad()
      await this.human.randomDelay(2000, 3000);
      
      this.logger.logStep('youtubeNavigation', true, { status: 'completed' });
    } catch (error) {
      this.logger.logError(error, 'youtubeNavigation');
      throw error;
    }
  }

  // Login to Gmail/Google account - Enhanced with better error handling
  async loginToGmail(email, password) {
    try {
      this.logger.logStep('gmailLogin', false, { status: 'starting' });
      
      // Check if page is still available
      if (this.page.isClosed()) {
        throw new Error('Page is closed before login attempt');
      }
      
      // Go to Gmail login with enhanced error handling
      console.log('🌐 Navigating to Google accounts login page...');
      try {
      await this.page.goto('https://accounts.google.com/signin', { 
          waitUntil: 'networkidle2', 
          timeout: 45000 
        });
      } catch (navError) {
        console.log('❌ Navigation failed, trying alternative approach...');
        await this.page.goto('https://accounts.google.com/', { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
        await this.human.randomDelay(2000, 3000);
        // Look for sign in link
        const signInLink = await this.page.$('a[href*="signin"], a[data-action="signin"]');
        if (signInLink) {
          await signInLink.click();
          await this.human.randomDelay(3000, 5000);
        }
      }
      
      console.log('✅ Login page loaded, waiting for elements...');
      await this.human.randomDelay(3000, 5000);

      // Check if page is still available after navigation
      if (this.page.isClosed()) {
        throw new Error('Page was closed during navigation');
      }

      // Wait for page to stabilize
      await this.page.waitForSelector('body', { timeout: 20000 });
      await this.human.randomDelay(2000, 3000);
      
      // Find email field with enhanced detection
      console.log('🔍 Looking for email input field...');
      await this.page.screenshot({ path: './logs/login-page-before-email.png' });
      
      // Wait for email field to be available
      let emailField = null;
      try {
        await this.page.waitForSelector('#identifierId', { timeout: 10000 });
        emailField = await this.page.$('#identifierId');
      } catch (e) {
        // Try alternative selectors
        emailField = await this.page.$('input[type="email"], input[name="identifier"], input[aria-label*="email" i]');
      }
      
      if (!emailField) {
        await this.page.screenshot({ path: './logs/email-field-not-found.png' });
        throw new Error('Email field not found');
      }
      
      // Check page status before typing
      if (this.page.isClosed()) {
        throw new Error('Page closed before email typing');
      }
      
      // Focus and type email with enhanced safety
      console.log('📧 Typing email address...');
      await emailField.focus();
      await this.human.randomDelay(500, 1000);
      
      // Clear field first
      await this.page.evaluate(el => el.value = '', emailField);
      await this.human.randomDelay(200, 400);
      
      // Type email character by character for human-like behavior
      for (let i = 0; i < email.length; i++) {
        if (this.page.isClosed()) {
          throw new Error('Page closed during email typing');
        }
        await this.page.keyboard.type(email[i], { delay: 80 + Math.random() * 40 });
        if (Math.random() < 0.1) {
          await this.human.randomDelay(100, 300);
        }
      }
      await this.human.randomDelay(1000, 1500);
      
      // Click Next button with enhanced detection
      console.log('🖱️ Clicking Next button to proceed to password...');
      await this.page.screenshot({ path: './logs/before-next-click.png' });
      
      if (this.page.isClosed()) {
        throw new Error('Page closed before next button click');
      }
      
      let nextClicked = false;
      try {
        const nextButton = await this.page.waitForSelector('#identifierNext', { timeout: 5000 });
        if (nextButton && await nextButton.isIntersectingViewport()) {
        await nextButton.click();
          nextClicked = true;
        }
      } catch (e) {
        console.log('⚠️ Standard next button not found, trying alternatives...');
      }
      
      if (!nextClicked) {
        // Try alternative methods - but be more careful about what we click
        const altButtons = await this.page.$$('button[type="submit"]');
        for (const button of altButtons) {
          try {
            const buttonText = await this.page.evaluate(el => el.textContent.toLowerCase(), button);
            // Only click if it looks like a next/continue button
            if ((buttonText.includes('next') || buttonText.includes('continue') || buttonText === '') && 
                await button.isIntersectingViewport()) {
              await button.click();
              nextClicked = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!nextClicked) {
        console.log('⌨️ Clicking failed, trying Enter key...');
        await this.page.keyboard.press('Enter');
      }
      
      // Wait for navigation to password page
      console.log('⏳ Waiting for password page to load...');
      await this.human.randomDelay(3000, 5000);
      
      if (this.page.isClosed()) {
        throw new Error('Page closed during password page navigation');
      }
      
      // Wait specifically for password field to appear with enhanced detection
      console.log('🔍 Waiting for password field to appear...');
      await this.page.screenshot({ path: './logs/after-next-click.png' });
      
      if (this.page.isClosed()) {
        throw new Error('Page closed while waiting for password field');
      }
      
      let passwordField = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!passwordField && attempts < maxAttempts) {
        attempts++;
        console.log(`🔍 Password field detection attempt ${attempts}/${maxAttempts}...`);
        
        try {
          await this.page.waitForSelector('input[type="password"]', { timeout: 8000 });
          passwordField = await this.page.$('input[type="password"]');
          if (passwordField) {
            console.log('✅ Password field detected with standard selector');
            break;
          }
      } catch (e) {
          console.log('⚠️ Standard password selector failed, trying alternatives...');
        }
        
        // Try alternative selectors
        const altSelectors = [
          'input[name="password"]',
          'input[aria-label*="password" i]',
          'input[autocomplete="current-password"]',
          'input[id*="password"]'
        ];
        
        for (const selector of altSelectors) {
          try {
            passwordField = await this.page.$(selector);
            if (passwordField) {
              console.log(`✅ Password field found with selector: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
      if (!passwordField) {
          console.log(`❌ Password field not found in attempt ${attempts}, waiting longer...`);
          await this.human.randomDelay(2000, 4000);
          
          if (this.page.isClosed()) {
            throw new Error('Page closed during password field detection');
          }
          
          // Check if we're still on email page (sometimes transition fails)
          try {
            const emailFieldStillThere = await this.page.$('#identifierId');
            if (emailFieldStillThere && await emailFieldStillThere.isVisible()) {
              console.log('⚠️ Still on email page, trying to proceed again...');
              const nextBtn = await this.page.$('#identifierNext');
              if (nextBtn && await nextBtn.isVisible()) {
                await nextBtn.click();
                await this.human.randomDelay(3000, 5000);
              }
            }
          } catch (e) {
            console.log('🔍 Email field check failed, continuing with password detection...');
          }
        }
      }
      
      if (!passwordField) {
        console.log('❌ Password field not found after all attempts!');
        await this.page.screenshot({ path: './logs/password-field-not-found.png' });
        
        // Debug: Check what's actually on the page
        const debugUrl = this.page.url();
        const pageContent = await this.page.evaluate(() => document.body.innerText.substring(0, 500));
        console.log(`📍 Current URL: ${debugUrl}`);
        console.log(`📄 Page content preview: ${pageContent}`);
        
        throw new Error('Password field not found after email step');
      }
      
      console.log('✅ Password field found successfully');
      
      // Verify we're actually on the password page before proceeding
      const pageUrl = this.page.url();
      console.log(`📍 Current URL: ${pageUrl}`);
      
      // Don't double-click if we're already on password page
      if (!pageUrl.includes('challenge/pwd') && !pageUrl.includes('password')) {
        const emailFieldStillPresent = await this.page.$('#identifierId');
        if (emailFieldStillPresent && await emailFieldStillPresent.isVisible()) {
          console.log('⚠️ Still on email page, but password field found - this is unusual');
          console.log('🔄 Waiting for proper page transition...');
          await this.human.randomDelay(2000, 3000);
        }
      } else {
        console.log('✅ Confirmed on password page');
      }
      
      // Focus and type password with enhanced safety
      console.log('🔐 Focusing password field and typing password...');
      
      if (this.page.isClosed()) {
        throw new Error('Page closed before password typing');
      }
      
      // Ensure field is visible and ready
      await passwordField.focus();
      await this.human.randomDelay(500, 1000);
      
            // Clear any existing content in password field - safer approach
      try {
        // Just focus and clear without evaluate to avoid potential issues
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('A');
        await this.page.keyboard.up('Control');
        await this.page.keyboard.press('Delete');
        await this.human.randomDelay(200, 400);
      } catch (e) {
        console.log('⚠️ Field clearing failed, continuing with typing...');
      }
      
      console.log('🔑 Typing password character by character...');
      
      // Add a small delay before starting to type
      await this.human.randomDelay(500, 800);
      
      // Type password character by character for human-like behavior
      for (let i = 0; i < password.length; i++) {
        if (this.page.isClosed()) {
          throw new Error('Page closed during password typing');
        }
        
        // Check if we're still on the right page
        const typingUrl = this.page.url();
        if (typingUrl.includes('accounts.google.com/signin') && !typingUrl.includes('challenge')) {
          throw new Error('Page reloaded during password typing - back to email step');
        }
        
        await this.page.keyboard.type(password[i], { delay: 90 + Math.random() * 50 });
        
        // Random pauses to simulate human typing
        if (Math.random() < 0.15) {
          await this.human.randomDelay(150, 400);
        }
      }
      
      await this.human.randomDelay(1000, 1500);
      console.log('✅ Password typed successfully');
      
      // Click Next for password with enhanced detection
      console.log('🖱️ Clicking Next to submit password...');
      await this.page.screenshot({ path: './logs/before-password-submit.png' });
      
      if (this.page.isClosed()) {
        throw new Error('Page closed before password submission');
      }
      
      let passwordSubmitted = false;
      try {
        const passwordNextButton = await this.page.waitForSelector('#passwordNext', { timeout: 5000 });
        if (passwordNextButton && await passwordNextButton.isIntersectingViewport()) {
        await passwordNextButton.click();
          passwordSubmitted = true;
        }
      } catch (e) {
        console.log('⚠️ Standard password next button not found, trying alternatives...');
      }
      
      if (!passwordSubmitted) {
        // Try alternative submit methods - but be careful about what we click
        const altButtons = await this.page.$$('button[type="submit"]');
        for (const button of altButtons) {
          try {
            const buttonText = await this.page.evaluate(el => el.textContent.toLowerCase(), button);
            // Only click if it looks like a next/continue button
            if ((buttonText.includes('next') || buttonText.includes('continue') || buttonText === '') && 
                await button.isIntersectingViewport()) {
              await button.click();
              passwordSubmitted = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!passwordSubmitted) {
        console.log('⌨️ Button click failed, trying Enter key...');
        await this.page.keyboard.press('Enter');
      }

      // Wait for login to complete and check for verification
      console.log('⏳ Waiting for login completion...');
      await this.human.randomDelay(4000, 6000);
      
      if (this.page.isClosed()) {
        throw new Error('Page closed after password submission');
      }
      
      // Check if manual verification is needed
      const verificationUrl = this.page.url();
      const pageContent = await this.page.evaluate(() => document.body.innerText.toLowerCase());
      
      // Check for various verification scenarios
      const verificationKeywords = [
        'verify', 'verification', 'confirm', 'security', 'suspicious activity',
        'unusual activity', 'sign in attempt', 'device', 'location',
        'phone number', 'recovery', 'backup', 'two-step', '2-step',
        'authenticator', 'code', 'text message', 'sms', 'verify it\'s you',
        'confirm your identity', 'security check', 'protect your account',
        'additional verification', 'verify your phone', 'verify your email'
      ];
      
      // Check URL patterns that indicate verification
      const verificationUrlPatterns = [
        'challenge', 'verify', 'confirmation', 'security', 'signin/challenge',
        'signin/verify', 'accounts.google.com/signin/v2/challenge'
      ];
      
      const needsVerification = verificationKeywords.some(keyword => 
        pageContent.includes(keyword)
      ) || verificationUrlPatterns.some(pattern => 
        currentUrl.includes(pattern)
      );
      
      if (needsVerification || (!currentUrl.includes('myaccount.google.com') && !currentUrl.includes('gmail.com'))) {
        console.log('\n🔒 MANUAL VERIFICATION REQUIRED!');
        console.log('=====================================');
        console.log('📧 Google requires manual verification for this email.');
        console.log('🎯 Please complete the verification process manually:');
        console.log('   • Check your email for verification codes');
        console.log('   • Complete phone/SMS verification if requested');
        console.log('   • Approve sign-in notifications');
        console.log('   • Complete any security challenges');
        console.log('');
        console.log('⏳ Bot will wait and monitor for login completion...');
        console.log('📸 Screenshot saved to: ./logs/verification-required.png');
        
        // Take a screenshot for reference
        await this.page.screenshot({ path: './logs/verification-required.png' });
        
        // Wait for manual verification with timeout
        await this.waitForManualVerification();
      }
      
      // Final verification of login success
      const finalUrl = this.page.url();
      if (finalUrl.includes('myaccount.google.com') || finalUrl.includes('gmail.com') || finalUrl.includes('accounts.google.com/b/0')) {
        console.log('✅ Gmail login successful!');
        this.logger.logStep('gmailLogin', true, { url: finalUrl });
        return true;
      } else {
        this.logger.logError(new Error(`Login failed - unexpected URL: ${finalUrl}`), 'gmailLogin');
        return false;
      }
      
    } catch (error) {
      this.logger.logError(error, 'gmailLogin');
      throw error;
    }
  }

  // Wait for manual verification (email verification, 2FA, etc.)
  async waitForManualVerification() {
    console.log('\n🎯 WAITING FOR MANUAL VERIFICATION');
    console.log('=====================================');
    
    const maxWaitTime = 300000; // 5 minutes
    const checkInterval = 10000; // Check every 10 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check current URL and page content
        const currentUrl = this.page.url();
        const pageContent = await this.page.evaluate(() => document.body.innerText.toLowerCase());
        
        // Check if verification is complete (successful login indicators)
        const successIndicators = [
          currentUrl.includes('myaccount.google.com'),
          currentUrl.includes('gmail.com'),
          currentUrl.includes('accounts.google.com/b/0'),
          pageContent.includes('welcome') && !pageContent.includes('verify'),
          pageContent.includes('signed in'),
          pageContent.includes('account settings')
        ];
        
        if (successIndicators.some(indicator => indicator)) {
          console.log('✅ Manual verification completed successfully!');
          return true;
        }
        
        // Show progress update
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const remaining = Math.round((maxWaitTime - (Date.now() - startTime)) / 1000);
        console.log(`⏳ Waiting for verification... (${elapsed}s elapsed, ${remaining}s remaining)`);
        console.log(`📍 Current URL: ${currentUrl}`);
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        
      } catch (error) {
        console.log(`⚠️ Error during verification check: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
    
    console.log('⏰ Manual verification timeout reached (5 minutes)');
    console.log('🔄 Bot will continue and attempt to proceed...');
    return false;
  }

  // Wait for manual login challenge solution
  async waitForManualCaptchaSolution() {
    console.log('\n🎯 MANUAL LOGIN CHALLENGE SOLVING MODE');
    console.log('=====================================');
    console.log('1. Look at the browser window');
    console.log('2. Complete the verification manually (captcha, phone, etc.)');
    console.log('3. Complete any additional verification steps');
    console.log('4. Wait for the page to load completely');
    console.log('5. Press ENTER in this terminal when done');
    console.log('=====================================\n');
    
    // Wait for user input
    await new Promise((resolve) => {
      process.stdin.once('data', () => {
        console.log('✅ Continuing with bot automation...\n');
        resolve();
      });
    });
    
    // Give some time for the page to settle
    await this.human.randomDelay(2000, 3000);
  }

  // Handle Welcome to YouTube Studio page
  async handleWelcomeToYouTubeStudio() {
    console.log('🎯 HANDLING WELCOME TO YOUTUBE STUDIO PAGE');
    console.log('==========================================');
    
    try {
      // Step 1: Try to find and click the main "Get started" or "Start" button
      const startButtonSelectors = [
        'button:has-text("Get started")',
        'button:has-text("Start")',
        'button:has-text("Begin")',
        'button:has-text("Continue")',
        'button:has-text("Next")',
        'button:has-text("Let\'s go")',
        'button:has-text("Let us go")',
        '[data-testid="get-started-button"]',
        '[data-testid="start-button"]',
        'ytcp-button-shape button:has-text("Get started")',
        'ytcp-button-shape button:has-text("Start")'
      ];
      
      let startButtonClicked = false;
      for (const selector of startButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button && await button.isVisible()) {
            console.log(`✅ Found start button: ${selector}`);
            await button.click();
            await this.human.randomDelay(2000, 3000);
            startButtonClicked = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!startButtonClicked) {
        // Try Tab navigation to find the start button
        console.log('🔄 Using Tab navigation to find start button...');
        const tabFound = await this.findAndClickButtonWithTab('Get started', 10) ||
                        await this.findAndClickButtonWithTab('Start', 10) ||
                        await this.findAndClickButtonWithTab('Begin', 10) ||
                        await this.findAndClickButtonWithTab('Continue', 10);
        
        if (tabFound) {
          startButtonClicked = true;
        }
      }
      
      if (!startButtonClicked) {
        console.log('⚠️ Could not find start button automatically, requesting manual intervention...');
        
        console.log('\n🎯 MANUAL WELCOME PAGE INTERVENTION REQUIRED');
        console.log('============================================');
        console.log('1. Look at the browser window');
        console.log('2. Find and click the "Get started" or "Start" button');
        console.log('3. Complete any onboarding steps that appear');
        console.log('4. Wait for the YouTube Studio dashboard to load');
        console.log('5. Press ENTER in this terminal when done');
        console.log('============================================\n');
        
        // Take a screenshot for reference
        await this.page.screenshot({ path: './logs/welcome-page-manual-intervention.png' });
        
        // Wait for user input
        await new Promise((resolve) => {
          process.stdin.once('data', () => {
            console.log('✅ Continuing with bot automation...\n');
            resolve();
          });
        });
        
        await this.human.randomDelay(2000, 3000);
      }
      
      // Step 2: Handle any additional onboarding steps that might appear
      console.log('🔄 Checking for additional onboarding steps...');
      
      // Wait for the page to potentially change
      await this.human.randomDelay(3000, 5000);
      
      // Check if we're still on a setup page or if we've reached the dashboard
      const currentUrl = this.page.url();
      console.log(`📍 Current URL after welcome page: ${currentUrl}`);
      
      // Take a screenshot to see the current state
      await this.page.screenshot({ path: './logs/after-welcome-page.png' });
      
      console.log('✅ Welcome to YouTube Studio page handling completed');
      
    } catch (error) {
      console.log(`❌ Error handling welcome page: ${error.message}`);
      throw error;
    }
  }

  // Create YouTube channel
  async createYouTubeChannel() {
    try {
      this.logger.logStep('channelCreated', false, { status: 'starting' });
      console.log('\n📺 Checking YouTube channel status...');
      
      // Go directly to YouTube Studio - if channel exists, we'll be on the dashboard
      // If no channel exists, we'll be on the channel creation page
      await this.page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
      await this.human.waitForPageLoad();
      await this.human.randomDelay(3000, 5000);
      
      // Take a screenshot to see the current state
      await this.page.screenshot({ path: './logs/channel-check-initial.png' });
      
      // Check if we're on the "How you'll appear" setup page or any channel creation page
      const setupPageIndicators = [
        'h1:has-text("How you\'ll appear")',
        'h1:has-text("How you will appear")',
        'div:has-text("How you\'ll appear")',
        'div:has-text("How you will appear")',
        'span:has-text("How you\'ll appear")',
        'span:has-text("How you will appear")',
        'div:has-text("Create your channel")',
        'div:has-text("Set up your channel")',
        'div:has-text("Welcome to YouTube Studio")',
        'h1:has-text("Welcome to YouTube Studio")',
        'span:has-text("Welcome to YouTube Studio")',
        'div:has-text("Get started with YouTube Studio")',
        'div:has-text("Let\'s get started")',
        'div:has-text("Let us get started")',
        'button:has-text("Next")',
        'button:has-text("Continue")',
        'button:has-text("Get started")',
        'button:has-text("Create channel")',
        'button:has-text("Set up channel")',
        'button:has-text("Start")',
        'button:has-text("Begin")'
      ];
      
      let onSetupPage = false;
      for (const selector of setupPageIndicators) {
        try {
          const element = await this.page.$(selector);
          if (element && await element.isVisible()) {
            onSetupPage = true;
            console.log(`🔍 Found setup page indicator: ${selector}`);
            this.logger.logStep('channelCreated', false, { status: 'on_setup_page', indicator: selector });
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (onSetupPage) {
        // Handle the setup page by clicking through the steps
        console.log('🆕 YouTube channel setup detected! Creating channel...');
        this.logger.logStep('channelCreated', false, { status: 'handling_setup_page' });
        
        // Check if we're on the "Welcome to YouTube Studio" page specifically
        const welcomePageIndicators = [
          'h1:has-text("Welcome to YouTube Studio")',
          'div:has-text("Welcome to YouTube Studio")',
          'span:has-text("Welcome to YouTube Studio")',
          'div:has-text("Get started with YouTube Studio")',
          'div:has-text("Let\'s get started")',
          'div:has-text("Let us get started")'
        ];
        
        let isWelcomePage = false;
        for (const selector of welcomePageIndicators) {
          try {
            const element = await this.page.$(selector);
            if (element && await element.isVisible()) {
              isWelcomePage = true;
              console.log(`🎯 Detected Welcome to YouTube Studio page: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (isWelcomePage) {
          console.log('🎉 Welcome to YouTube Studio page detected! Handling onboarding...');
          
          // Take a screenshot of the welcome page
          await this.page.screenshot({ path: './logs/welcome-to-youtube-studio.png' });
          
          // Handle the welcome page with specific button detection
          await this.handleWelcomeToYouTubeStudio();
        }
        
        // Click through setup steps multiple times to ensure completion
        for (let i = 0; i < 15; i++) {
          const setupButtons = [
            'button:has-text("Next")',
            'button:has-text("Continue")',
            'button:has-text("Get started")',
            'button:has-text("Create channel")',
            'button:has-text("Set up channel")',
            'button:has-text("Done")',
            'button:has-text("OK")',
            'button:has-text("Skip")',
            'button:has-text("Finish")',
            'button:has-text("Complete")'
          ];
          
          let clicked = false;
          
          // First try to find and click "Create channel" button using Tab navigation
          if (i === 0) {
            console.log('🔍 Looking for "Create channel" button using Tab navigation...');
            try {
              // Use Tab key to navigate to the Create channel button
              await this.findAndClickButtonWithTab('Create channel', 10);
              console.log('✅ Found and clicked "Create channel" button using Tab navigation');
              this.logger.logStep('channelCreated', false, { status: `setup_step_${i + 1}_clicked`, method: 'tab_navigation' });
              await this.human.randomDelay(2000, 4000);
              clicked = true;
            } catch (e) {
              console.log('⚠️ Tab navigation failed, trying regular button detection...');
            }
          }
          
          // For subsequent steps, try Tab navigation for Continue buttons
          if (!clicked && i > 0) {
            console.log('🔍 Looking for "Continue" button using Tab navigation...');
            try {
              const continueFound = await this.findAndClickButtonWithTab('Continue', 10) ||
                                   await this.findAndClickButtonWithTab('Next', 10) ||
                                   await this.findAndClickButtonWithTab('Get started', 10);
              
              if (continueFound) {
                console.log('✅ Found and clicked continue button using Tab navigation');
                this.logger.logStep('channelCreated', false, { status: `setup_step_${i + 1}_clicked`, method: 'tab_navigation' });
                await this.human.randomDelay(2000, 4000);
                clicked = true;
              }
            } catch (e) {
              console.log('⚠️ Tab navigation for continue button failed, trying regular detection...');
            }
          }
          
          // Fallback to regular button detection
          if (!clicked) {
            for (const buttonSelector of setupButtons) {
              try {
                const button = await this.page.$(buttonSelector);
                if (button && await button.isVisible()) {
                  console.log(`✅ Clicking: ${buttonSelector}`);
                  await button.click();
                  this.logger.logStep('channelCreated', false, { status: `setup_step_${i + 1}_clicked`, button: buttonSelector });
                  await this.human.randomDelay(2000, 4000);
                  clicked = true;
                  break;
                }
              } catch (e) {
                continue;
              }
            }
          }
          
          if (!clicked) {
            console.log(`✅ No more setup buttons found after step ${i + 1}`);
            
            // Check if we need manual intervention for complex setup steps
            const manualInterventionSelectors = [
              'input[type="text"]',
              'input[type="email"]',
              'textarea',
              'div:has-text("Enter")',
              'div:has-text("Type")',
              'div:has-text("Fill")',
              'div:has-text("Add")',
              'div:has-text("Upload")'
            ];
            
            let needsManualIntervention = false;
            for (const selector of manualInterventionSelectors) {
              try {
                const element = await this.page.$(selector);
                if (element && await element.isVisible()) {
                  needsManualIntervention = true;
                  console.log(`🔍 Found input field: ${selector}`);
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            
            if (needsManualIntervention) {
              console.log('\n🎯 MANUAL CHANNEL SETUP REQUIRED');
              console.log('================================');
              console.log('1. Look at the browser window');
              console.log('2. Complete any remaining channel setup steps manually');
              console.log('3. Fill in any required information (channel name, description, etc.)');
              console.log('4. Complete the setup process');
              console.log('5. Wait for the YouTube Studio dashboard to load');
              console.log('6. Press ENTER in this terminal when done');
              console.log('================================\n');
              
              // Take a screenshot for reference
              await this.page.screenshot({ path: './logs/channel-setup-manual.png' });
              
              // Wait for user input
              await new Promise((resolve) => {
                process.stdin.once('data', () => {
                  console.log('✅ Continuing with bot automation...\n');
                  resolve();
                });
              });
              
              await this.human.randomDelay(2000, 3000);
            }
            
            // No more buttons to click, setup might be complete
            break;
          }
        }
        
        // Take a screenshot to see the final state
        await this.page.screenshot({ path: './logs/channel-setup-complete.png' });
        console.log('✅ YouTube channel setup completed!');
        this.logger.logStep('channelCreated', true, { status: 'setup_completed' });
        return true;
      } else {
        // Check if we're already on the YouTube Studio dashboard
        const dashboardIndicators = [
          'div:has-text("YouTube Studio")',
          'div:has-text("Dashboard")',
          'div:has-text("Content")',
          'div:has-text("Analytics")',
          'div:has-text("Comments")',
          'div:has-text("Monetization")',
          'div:has-text("Customization")',
          'div:has-text("Audio")',
          'div:has-text("Subtitles")',
          'div:has-text("Copyright")',
          'div:has-text("Community")',
          'div:has-text("Settings")'
        ];
        
        let onDashboard = false;
        for (const selector of dashboardIndicators) {
          try {
            const element = await this.page.$(selector);
            if (element && await element.isVisible()) {
              onDashboard = true;
              console.log(`✅ Found dashboard indicator: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (onDashboard) {
          console.log('✅ YouTube channel already exists and ready!');
          this.logger.logStep('channelCreated', true, { status: 'channel_ready_or_exists' });
          return true;
        } else {
          // If we can't determine the state, take a screenshot and assume setup is needed
          console.log('⚠️ Could not determine channel status, attempting setup...');
          await this.page.screenshot({ path: './logs/channel-unknown-state.png' });
          
          // Try to find and click any setup-related buttons
          const fallbackButtons = [
            'button:has-text("Create")',
            'button:has-text("Start")',
            'button:has-text("Begin")',
            'button:has-text("Setup")',
            'button:has-text("Get started")'
          ];
          
          for (const buttonSelector of fallbackButtons) {
            try {
              const button = await this.page.$(buttonSelector);
              if (button && await button.isVisible()) {
                console.log(`🔄 Clicking fallback button: ${buttonSelector}`);
                await button.click();
                await this.human.randomDelay(2000, 3000);
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          this.logger.logStep('channelCreated', true, { status: 'assumed_ready' });
      return true;
        }
      }
    } catch (error) {
      this.logger.logError(error, 'channelCreated');
      console.log(`❌ Error creating YouTube channel: ${error.message}`);
      throw error;
    }
  }

  // Upload video to YouTube
  // Helper function to find and click a button
  async findAndClickButton(selectors) {
    for (const selector of selectors) {
      try {
        const button = await this.page.$(selector);
        if (button && await button.isVisible()) {
          this.logger.logVideoUpload('', false, { status: 'button_found', selector });
          await button.click();
          return button;
        }
      } catch (e) {
        continue;
      }
    }
    this.logger.logVideoUpload('', false, { status: 'button_not_found' });
    return null;
  }

  async uploadVideo(videoPath, metadata = {}) {
    try {
      this.logger.logVideoUpload(videoPath, false, { status: 'starting', metadata });
      
      // Step 1: Navigate to the videos page and look for upload button
      this.logger.logVideoUpload(videoPath, false, { status: 'navigating_to_videos_page' });
      console.log('🔗 Navigating to YouTube videos page...');
      
      await this.page.goto('https://studio.youtube.com/channel/UCtKTre3hVbZp-bnQdQIRzZg/videos', { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      await this.human.waitForPageLoad();
      await this.human.randomDelay(3000, 5000);
      
      // Check if we're on the videos page
      const currentVideosUrl = this.page.url();
      console.log(`📍 Current URL: ${currentVideosUrl}`);
      
      if (currentVideosUrl.includes('videos')) {
        console.log('✅ Successfully navigated to videos page');
      } else {
        console.log('⚠️ Not on videos page, trying alternative approach...');
      }
      
      // Step 2: Look for the upload button on the videos page
      console.log('🔍 Looking for upload button on videos page...');
      
      // Take a screenshot to see what's available
      await this.page.screenshot({ path: './logs/debug-videos-page.png' });
      console.log('📸 Screenshot saved: debug-videos-page.png');
      
      // Look for upload button on videos page
      const uploadButtonSelectors = [
        '[aria-label*="Upload"]',
        'button[aria-label*="Upload"]',
        '[data-testid*="upload"]',
        'button:has-text("Upload")',
        'a[href*="upload"]',
        'ytcp-button[aria-label*="Upload"]'
      ];
      
      let uploadButton = null;
      for (const selector of uploadButtonSelectors) {
        try {
          console.log(`🔍 Trying upload button selector: ${selector}`);
          uploadButton = await this.page.$(selector);
          if (uploadButton && await uploadButton.isVisible()) {
            console.log(`✅ Found upload button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`❌ Error with selector ${selector}: ${e.message}`);
          continue;
        }
      }
      
      if (!uploadButton) {
        console.log('❌ No upload button found, trying Tab navigation...');
        // Try Tab navigation to find upload button
        const found = await this.findAndClickButtonWithTab('Upload', 20);
        if (found) {
          console.log('✅ Found upload button with Tab navigation');
          uploadButton = true; // Mark as found
        }
      }
      
      if (!uploadButton) {
        console.log('❌ No upload button found on videos page');
        throw new Error('Could not find upload button on videos page');
      }
      
      // Click the upload button
      if (uploadButton !== true) { // If it's an actual element, not just marked as found
        console.log('🖱️ Clicking upload button...');
        await uploadButton.click();
        await this.human.waitForPageLoad();
        await this.human.randomDelay(3000, 5000);
      }
      this.logger.logVideoUpload(videoPath, false, { status: 'clicked_upload_videos_option' });
      await this.human.waitForPageLoad();
      await this.human.randomDelay(5000, 8000);
      
      // Verify we actually navigated to upload page
      const uploadPageUrl = this.page.url();
      console.log(`📍 URL after clicking upload option: ${uploadPageUrl}`);
      
      if (!uploadPageUrl.includes('upload')) {
        console.log('⚠️ WARNING: URL does not contain "upload" - may not have navigated to upload page');
      }
      
      // Take screenshot to see the upload page
      await this.page.screenshot({ path: './logs/upload-page-after-navigation.png' });
      
      // Step 4: Upload the video file
      this.logger.logVideoUpload(videoPath, false, { status: 'waiting_for_upload_interface' });
      
      // Wait for upload interface to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Try to find file input directly first
      let fileInput = null;
      try {
        fileInput = await this.page.$('input[type="file"]');
        if (fileInput) {
          this.logger.logVideoUpload(videoPath, false, { status: 'using_direct_file_input_method' });
          
          // Check if file input is visible
          const isVisible = await fileInput.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
          });
          
          if (isVisible) {
            this.logger.logVideoUpload(videoPath, false, { status: 'file_input_found_directly' });
            await fileInput.uploadFile(videoPath);
            this.logger.logVideoUpload(videoPath, false, { status: 'file_uploaded_directly' });
          } else {
            throw new Error('File input not visible');
          }
        }
      } catch (error) {
        this.logger.logVideoUpload(videoPath, false, { status: 'file_input_not_found_trying_upload_button' });
        
        // If direct file input fails, try to find and click upload button
        const uploadButtonSelectors = [
          'button[aria-label*="Upload"]',
          'button[aria-label*="Select files"]',
          '[data-testid="upload-button"]',
          '[data-testid="select-files"]'
        ];
        
        let uploadButton = null;
        for (const selector of uploadButtonSelectors) {
          try {
            uploadButton = await this.page.$(selector);
            if (uploadButton && await uploadButton.isVisible()) {
              this.logger.logVideoUpload(videoPath, false, { status: 'upload_button_found', selector });
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // If no button found by selectors, try to find by text content
        if (!uploadButton) {
          const buttons = await this.page.$$('button');
          for (const button of buttons) {
            try {
              const text = await button.evaluate(el => el.textContent?.trim());
              if (text === 'Upload' || text?.includes('Upload') || text === 'SELECT FILES' || text === 'Select files') {
                uploadButton = button;
                this.logger.logVideoUpload(videoPath, false, { status: 'upload_button_found_by_text', text });
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
        
        if (!uploadButton) {
          throw new Error('Upload button not found');
        }
        
        await uploadButton.click();
        this.logger.logVideoUpload(videoPath, false, { status: 'upload_button_clicked' });
        await this.human.randomDelay(2000, 3000);
        
        // Now wait for upload dialog, then set files on hidden input (do not require visible)
        console.log('🪟 Waiting for upload dialog...');
        try {
          await this.page.waitForSelector('ytcp-uploads-dialog, tp-yt-paper-dialog', { timeout: 15000 });
        } catch (_) {
          console.log('⚠️ Upload dialog root not detected, continuing anyway');
        }

        console.log('📂 Setting files on hidden input via page.setInputFiles...');
        try {
          // Prefer inputs inside the dialog first
          const selectors = [
            'ytcp-uploads-dialog input[type="file"]',
            'tp-yt-paper-dialog input[type="file"]',
            'input[type="file"]'
          ];
          let setOk = false;
          for (const sel of selectors) {
            try {
              await this.page.setInputFiles(sel, absoluteVideoPath);
              console.log(`✅ Files set using selector: ${sel}`);
              setOk = true;
              break;
            } catch (e) {
              continue;
            }
          }
          if (!setOk) {
            throw new Error('Failed to set files on any known input selector');
          }
        } catch (setErr) {
          console.log(`❌ setInputFiles failed: ${setErr.message}`);
          // Last resort: find an input handle and upload
          const fallbackInput = await this.page.$('ytcp-uploads-dialog input[type="file"], tp-yt-paper-dialog input[type="file"], input[type="file"]');
          if (!fallbackInput) {
            throw new Error('No file input found for fallback upload');
          }
          await fallbackInput.uploadFile(absoluteVideoPath);
          console.log('✅ Fallback ElementHandle.uploadFile succeeded');
        }
      }

      // Step 3: Wait for upload to start and monitor progress
      console.log('⏳ Waiting for upload to start...');
      await this.human.randomDelay(5000, 8000);
      
      // Wait for upload progress to appear
      await this.page.waitForFunction(() => {
        return document.querySelector('span.progress-label, .upload-progress, [role="progressbar"], .progress-bar, .upload-status');
      }, { timeout: 60000 });
      
      console.log('✅ Upload progress detected, monitoring...');
      
      // Monitor upload progress
      let uploadComplete = false;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes with 5-second intervals
      
      while (!uploadComplete && attempts < maxAttempts) {
        try {
          // Check for upload completion indicators
          const progressText = await this.page.evaluate(() => {
            const progressElement = document.querySelector('span.progress-label, .upload-progress, [role="progressbar"], .upload-status');
            return progressElement ? progressElement.textContent : '';
          });
          
          console.log(`📊 Upload progress: ${progressText}`);
          
          // Check if upload is complete
          if (progressText.includes('100%') || progressText.includes('Complete') || progressText.includes('Processing') || progressText.includes('Upload complete')) {
            console.log('✅ Upload completed, proceeding to finalization...');
            uploadComplete = true;
            break;
          }
          
          // Check for errors
          const errorText = await this.page.evaluate(() => {
            const errorElement = document.querySelector('.error-short, .upload-error, [data-testid="error"], .error-message');
            return errorElement ? errorElement.textContent : '';
          });
          
          if (errorText && errorText.toLowerCase().includes('daily upload limit reached')) {
            throw new Error('Daily upload limit reached');
          }
          
          if (errorText) {
            console.log(`⚠️ Upload error: ${errorText}`);
          }
          
        } catch (error) {
          console.error('❌ Error monitoring progress:', error.message);
          throw error;
        }
        
        await this.human.randomDelay(5000, 8000);
        attempts++;
      }
      
      if (!uploadComplete) {
        throw new Error('Upload did not complete within expected time');
      }
      
      // Step 4: Finalize upload
      console.log('🎯 Starting upload finalization...');
      
      // Wait until the title/description form is actually ready (no blur/disabled)
      try {
        await this.page.waitForFunction(() => {
          const candidates = Array.from(document.querySelectorAll('#textbox, textarea#title, ytcp-form-textarea #textbox'));
          const el = candidates.find(e => e);
          if (!el) return false;
          const disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
          const hidden = !(el.offsetParent !== null);
          return !disabled && !hidden;
        }, { timeout: 60000 });
        console.log('✅ Metadata form is interactive');
      } catch (e) {
        console.log('⚠️ Metadata form did not become fully ready within 60s, attempting anyway');
      }
      
      const uploadedLink = await this.finalizeUpload(null, videoPath, metadata);
      console.log('🎉 Video published successfully!');
      this.logger.logVideoUpload(videoPath, true, { status: 'video_published_successfully' });
      return uploadedLink;

    } catch (error) {
      console.error('❌ Error during video upload:', error.message);
      this.logger.logError(error, 'uploadVideoStepByStep');
      this.logger.logVideoUpload(videoPath, false, { 
        status: 'upload_failed_with_error', 
        error: error.message,
        errorType: error.constructor.name
      });

      try {
        await this.page.screenshot({ path: './logs/upload-error-state.png' });
      } catch (screenshotError) {
        console.error('❌ Failed to take error screenshot:', screenshotError.message);
      }

      throw error;
    }
  }

  // New focused upload method following exact instructions
  async uploadVideoStepByStep(videoPath, metadata = {}) {
    try {
      console.log('🚀 Starting video upload process...');
      this.logger.logVideoUpload(videoPath, false, { status: 'upload_started' });

      // Step 1: Navigate to upload page with dynamic channel ID detection
      const currentUrl = this.page.url();
      console.log(`📍 Current URL: ${currentUrl}`);
      
      // Check if we're already on an upload page
      if (currentUrl.includes('/videos/upload')) {
        console.log('📍 Already on upload page, proceeding...');
        await this.human.randomDelay(2000, 3000);
      } else {
        console.log('📍 Navigating to upload page...');
        
        // First try to get the channel ID dynamically
        let channelId = null;
        let uploadUrl = null;
        
        try {
          // Navigate to main studio page first to get channel ID
          await this.page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
      await this.human.waitForPageLoad();
          await this.human.randomDelay(3000, 5000);
          
          // Try to get channel ID from meta tag
          channelId = await this.page.evaluate(() => {
            const el = document.querySelector('meta[itemprop="channelId"]');
            return el ? el.getAttribute('content') : null;
          });
          
          // If meta tag not found, try to extract from URL
          if (!channelId) {
            channelId = await this.page.evaluate(() => {
              const url = window.location.href;
              const match = url.match(/\/channel\/([^\/]+)/);
              return match ? match[1] : null;
            });
          }
          
          // If still not found, try to get from page content
          if (!channelId) {
            channelId = await this.page.evaluate(() => {
              // Look for channel ID in various places
              const scripts = Array.from(document.querySelectorAll('script'));
              for (const script of scripts) {
                const content = script.textContent || script.innerHTML;
                const match = content.match(/"channelId":"([^"]+)"/);
                if (match) return match[1];
              }
              return null;
            });
          }
          
          if (channelId) {
            console.log(`✅ Found channel ID: ${channelId}`);
            uploadUrl = `https://studio.youtube.com/channel/${channelId}/videos/upload`;
            console.log(`📍 Navigating to: ${uploadUrl}`);
            await this.page.goto(uploadUrl, { waitUntil: 'domcontentloaded' });
            await this.human.waitForPageLoad();
            await this.human.randomDelay(3000, 5000);
          } else {
            throw new Error('Could not determine channel ID');
          }
          
    } catch (error) {
          console.log('⚠️ Channel ID detection failed, using fallback method...');
          
          // Fallback: Navigate to main studio and click Upload button manually
          await this.page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
          await this.human.waitForPageLoad();
          await this.human.randomDelay(3000, 5000);
          
          // Look for and click the Create/Upload button
          console.log('🔍 Looking for Create/Upload button...');
          
          const createButton = await this.page.$('button[aria-label="Create"], #create-icon, [data-testid="create-button"]');
          if (createButton) {
            console.log('✅ Found Create button, clicking it...');
            await createButton.click();
            await this.human.randomDelay(2000, 3000);
            
            // Look for Upload videos option
            const uploadOption = await this.page.$('tp-yt-paper-item#text-item-0, [aria-label*="Upload videos"], button[aria-label*="Upload"]');
            if (uploadOption) {
              console.log('✅ Found Upload videos option, clicking it...');
              await uploadOption.click();
              await this.human.randomDelay(3000, 5000);
            } else {
              throw new Error('Upload videos option not found');
            }
          } else {
            throw new Error('Create button not found');
          }
        }
        
        // Take screenshot to verify we're on upload page
        await this.page.screenshot({ path: './logs/upload-page-direct.png' });
        console.log('📸 Screenshot saved: upload-page-direct.png');
        
                 // Verify we're actually on an upload page
         const finalUrl = this.page.url();
         console.log(`📍 Final URL: ${finalUrl}`);
         
         if (!finalUrl.includes('/upload')) {
           throw new Error('Failed to navigate to upload page');
         }
         
         // Check if we're on the videos page and need to click upload button
         if (finalUrl.includes('/videos/upload') && !finalUrl.includes('dialog')) {
           console.log('📍 On videos page, looking for upload button...');
           
           // Wait for page to load
           await this.human.randomDelay(3000, 5000);
           
           // Look for upload button on the videos page
           const uploadButton = await this.page.$('button[aria-label*="Upload"], button[aria-label*="upload"], [data-testid="upload-button"], .upload-button');
           if (uploadButton) {
             console.log('✅ Found upload button on videos page, clicking it...');
             await uploadButton.click();
             await this.human.randomDelay(3000, 5000);
             
             // Take screenshot after clicking upload
             await this.page.screenshot({ path: './logs/after-upload-button-click.png' });
             console.log('📸 Screenshot saved: after-upload-button-click.png');
           } else {
             console.log('⚠️ Upload button not found on videos page, trying alternative approach...');
             
             // Try to find upload button by text content
             const buttons = await this.page.$$('button');
             for (const button of buttons) {
               const text = await button.evaluate(el => el.textContent?.trim());
               if (text && text.toLowerCase().includes('upload')) {
                 console.log(`✅ Found upload button with text: "${text}", clicking it...`);
                 await button.click();
                 await this.human.randomDelay(3000, 5000);
                 break;
               }
             }
           }
         }
      }

      // Step 2: Handle file upload by clicking upload button and uploading directly to hidden file input
      console.log('📁 Uploading video file using direct file input method...');
      
      // Get absolute path to video file
      const absoluteVideoPath = path.resolve(videoPath);
      console.log(`📂 Video path: ${absoluteVideoPath}`);
      
      // Check if file exists
      if (!await fs.pathExists(absoluteVideoPath)) {
        throw new Error(`Video file not found: ${absoluteVideoPath}`);
      }
      
      // Wait for upload button to be visible and click it
      console.log('🖱️ Looking for upload button...');
      const uploadButton = await this.page.waitForSelector('button[aria-label*="Upload"], button[aria-label*="upload"], [data-testid="upload-button"], .upload-button', { visible: true, timeout: 15000 });
      
      if (!uploadButton) {
        throw new Error('Upload button not found on page');
      }
      
      console.log('✅ Found upload button, clicking it...');
      await uploadButton.click();
      await this.human.randomDelay(2000, 3000);
      
      // Now wait for the hidden file input to be available in DOM (don't require visible)
      console.log('📂 Finding hidden file input...');
      const fileInput = await this.page.waitForSelector('input[type="file"]', { timeout: 15000 });
      
      if (!fileInput) {
        throw new Error('File input not found after clicking upload button');
      }
      
      console.log('✅ File input found, trying upload...');
      
      // Verify file exists and is accessible
      console.log(`🔍 Verifying file: ${absoluteVideoPath}`);
      const fileStats = await fs.stat(absoluteVideoPath);
      console.log(`📊 File size: ${fileStats.size} bytes`);
      
      try {
        // Try direct upload first
        await fileInput.uploadFile(absoluteVideoPath);
        console.log('✅ Video file uploaded successfully to YouTube uploader');
      } catch (uploadError) {
        console.log(`❌ Direct upload failed: ${uploadError.message}`);

        // Try setInputFiles on known selectors first
        console.log('🔄 Trying setInputFiles on known selectors...');
        let setOk = false;
        const setSelectors = [
          'ytcp-uploads-dialog input[type="file"]',
          'tp-yt-paper-dialog input[type="file"]',
          'input[type="file"]'
        ];
        for (const sel of setSelectors) {
          try {
            await this.page.setInputFiles(sel, absoluteVideoPath);
            console.log(`✅ Files set using selector: ${sel}`);
            setOk = true;
            break;
          } catch (_) {}
        }

        if (!setOk) {
          // Try alternative method using page.evaluate
          console.log('🔄 Trying alternative upload method...');
          try {
            const nodeBuffer = await fs.readFile(absoluteVideoPath);
            const base64 = Buffer.from(nodeBuffer).toString('base64');
            const name = path.basename(absoluteVideoPath);

            await this.page.evaluate((base64Content, fileName) => {
              const binary = atob(base64Content);
              const len = binary.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
              const file = new File([bytes], fileName, { type: 'video/mp4' });

              const input = document.querySelector('input[type="file"]');
              if (!input) throw new Error('No file input found in DOM');
              const dt = new DataTransfer();
              dt.items.add(file);
              input.files = dt.files;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }, base64, name);
            console.log('✅ Alternative upload method completed');
          } catch (altError) {
            console.log(`❌ Alternative method also failed: ${altError.message}`);
            // Try drag and drop method
            console.log('🔄 Trying drag and drop method...');
            try {
              await this.page.evaluate((filePath) => {
                const dropZone = document.querySelector('[data-testid="upload-drop-zone"], .upload-drop-zone, [aria-label*="upload"], [aria-label*="drop"]');
                if (dropZone) {
                  const file = new File([''], filePath, { type: 'video/mp4' });
                  const dataTransfer = new DataTransfer();
                  dataTransfer.items.add(file);
                  const dropEvent = new DragEvent('drop', { dataTransfer });
                  dropZone.dispatchEvent(dropEvent);
                  console.log('File dropped via JavaScript');
                }
              }, absoluteVideoPath);
              console.log('✅ Drag and drop method completed');
            } catch (dropError) {
              console.log(`❌ All upload methods failed: ${dropError.message}`);
              throw uploadError; // Throw original error
            }
          }
        }
      }

      // Step 3: Wait for upload to start and complete
      console.log('⏳ Waiting for upload to start...');
      await this.human.randomDelay(5000, 8000);

      // Wait for either progress indicator OR metadata form becoming available
      await this.page.waitForFunction(() => {
        const progressEl = document.querySelector('span.progress-label, .upload-progress, [role="progressbar"], .progress-bar, .upload-status');
        const metadataEl = document.querySelector('#title-textarea #textbox, ytcp-social-suggestions-textbox#title-textarea #textbox, ytcp-form-textarea #textbox');
        return Boolean(progressEl || metadataEl);
      }, { timeout: 60000 });

      console.log('✅ Upload UI detected (progress or metadata form), monitoring...');
      
      // Monitor upload progress
      let uploadComplete = false;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes with 5-second intervals
      
      while (!uploadComplete && attempts < maxAttempts) {
        try {
          // Check for upload completion indicators
          const progressText = await this.page.evaluate(() => {
            const progressElement = document.querySelector('span.progress-label, .upload-progress, [role="progressbar"], .upload-status');
            return progressElement ? progressElement.textContent : '';
          });
          
          console.log(`📊 Upload progress: ${progressText}`);
          
          // Check if upload is complete
          if (progressText.includes('100%') || progressText.includes('Complete') || progressText.includes('Processing') || progressText.includes('Upload complete')) {
            console.log('✅ Upload completed, proceeding to finalization...');
            uploadComplete = true;
            break;
          }
          
          // Check for errors
          const errorText = await this.page.evaluate(() => {
            const errorElement = document.querySelector('.error-short, .upload-error, [data-testid="error"], .error-message');
            return errorElement ? errorElement.textContent : '';
          });
          
          if (errorText && errorText.toLowerCase().includes('daily upload limit reached')) {
            throw new Error('Daily upload limit reached');
          }
          
          if (errorText) {
            console.log(`⚠️ Upload error: ${errorText}`);
          }

          // If metadata form appears even if progress text is empty, proceed
          const metadataReady = await this.page.evaluate(() => {
            const el = document.querySelector('#title-textarea #textbox, ytcp-social-suggestions-textbox#title-textarea #textbox, ytcp-form-textarea #textbox');
            return Boolean(el);
          });
          if (metadataReady) {
            console.log('✅ Detected metadata form; proceeding to finalization...');
            uploadComplete = true;
            break;
          }
          
        } catch (error) {
          console.error('❌ Error monitoring progress:', error.message);
      throw error;
        }
        
        await this.human.randomDelay(5000, 8000);
        attempts++;
      }
      
      if (!uploadComplete) {
        throw new Error('Upload did not complete within expected time');
      }
      
      // Step 4: Finalize upload
      console.log('🎯 Starting upload finalization...');
      const uploadedLink = await this.finalizeUpload(null, videoPath, metadata);
      console.log('🎉 Video published successfully!');
      this.logger.logVideoUpload(videoPath, true, { status: 'video_published_successfully' });
      return uploadedLink;

    } catch (error) {
      console.error('❌ Error during video upload:', error.message);
      this.logger.logError(error, 'uploadVideoStepByStep');
      this.logger.logVideoUpload(videoPath, false, { 
        status: 'upload_failed_with_error', 
        error: error.message,
        errorType: error.constructor.name
      });

      try {
        await this.page.screenshot({ path: './logs/upload-error-state.png' });
      } catch (screenshotError) {
        console.error('❌ Failed to take error screenshot:', screenshotError.message);
      }

      throw error;
    }
  }

  async finalizeUpload(youtubeUploadDialog, videoPath, metadata) {
    try {
      console.log('📝 Finalizing upload...');
      this.logger.logVideoUpload(videoPath, false, { status: 'finalizing_upload_started' });
      
      // Wait for the upload interface to be fully loaded
      await this.human.randomDelay(3000, 5000);

      // Step 1: Fill title and description using direct page.type(), then fallback
      this.logger.logVideoUpload(videoPath, false, { status: 'filling_title_and_description' });

      const titleCandidates = [
        '#title-textarea #textbox',
        'ytcp-social-suggestions-textbox#title-textarea #textbox',
        'ytcp-form-input-container #title-textarea #textbox',
        '#textbox[aria-label*="title"]',
        'textarea[name="title"]',
        'input[name="title"]'
      ];

      const descriptionCandidates = [
        '#description-textarea #textbox',
        'ytcp-social-suggestions-textarea#description-textarea #textbox',
        'ytcp-form-textarea #description-textarea #textbox',
        'ytcp-form-textarea #textbox[aria-label*="description"]',
        'textarea[name="description"]',
        'input[name="description"]'
      ];

      const desiredTitle = metadata.title || 'Amazing Video Title';
      const desiredDescription = metadata.description || 'Check out this amazing video!';

      let titleTyped = false;
      for (const sel of titleCandidates) {
        try {
          const handle = await this.page.waitForSelector(sel, { visible: true, timeout: 8000 });
          if (!handle) continue;
          // Focus and clear existing content
          await this.page.click(sel, { clickCount: 3 });
          await this.page.keyboard.press('Backspace');
          await this.page.type(sel, desiredTitle, { delay: 80 });
          this.logger.logVideoUpload(videoPath, false, { status: 'title_filled_via_type', selector: sel });
          titleTyped = true;
          break;
        } catch (_) {
          continue;
        }
      }

      if (!titleTyped) {
        await this.fillVideoField('title', desiredTitle, titleCandidates);
      }

      let descriptionTyped = false;
      for (const sel of descriptionCandidates) {
        try {
          const handle = await this.page.waitForSelector(sel, { visible: true, timeout: 8000 });
          if (!handle) continue;
          await this.page.click(sel, { clickCount: 3 });
          await this.page.keyboard.press('Backspace');
          await this.page.type(sel, desiredDescription, { delay: 80 });
          this.logger.logVideoUpload(videoPath, false, { status: 'description_filled_via_type', selector: sel });
          descriptionTyped = true;
          break;
        } catch (_) {
          continue;
        }
      }

      if (!descriptionTyped) {
        await this.fillVideoField('description', desiredDescription, descriptionCandidates);
      }

      // Step 2: Audience -> select "No, it's not made for kids" (locale-agnostic)
      this.logger.logVideoUpload(videoPath, false, { status: 'setting_kids_option' });
      try {
        // Try attribute-based selectors that are stable across locales
        let clickedKids = false;
        const kidsSelectors = [
          'input[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]',
          'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]',
          'ytcp-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]',
          'input[value="no"]',
          'input[value="false"]'
        ];
        for (const sel of kidsSelectors) {
          try {
            const el = await this.page.waitForSelector(sel, { visible: true, timeout: 2500 });
            if (el) {
              await this.page.evaluate(elm => elm.scrollIntoView({ block: 'center' }), el);
              await el.click();
              clickedKids = true;
              break;
            }
          } catch {}
        }

        // Fallback: pick radio with NOT/false semantics from audience group
        if (!clickedKids) {
          clickedKids = await this.page.evaluate(() => {
            const scope = document.querySelector('tp-yt-paper-radio-group, ytcp-radio-group, #audience') || document;
            const radios = scope.querySelectorAll('tp-yt-paper-radio-button, ytcp-radio-button, input[type="radio"]');
            for (const r of radios) {
              const name = r.getAttribute && r.getAttribute('name');
              const val = r.getAttribute && r.getAttribute('value');
              if ((name && /NOT_MFK|NOT|FALSE/i.test(name)) || (val && /false|no/i.test(val))) {
                (r.click ? r.click() : r.dispatchEvent(new MouseEvent('click', { bubbles: true })));
                return true;
              }
            }
            return false;
          });
        }
        this.logger.logVideoUpload(videoPath, false, { status: clickedKids ? 'kids_option_set' : 'kids_option_not_found' });
      } catch (e) {
        this.logger.logVideoUpload(videoPath, false, { status: 'kids_option_failed', error: e.message });
      }
      await this.human.randomDelay(600, 900);

      // Step 3: Click Next three times with human-like behavior
      this.logger.logVideoUpload(videoPath, false, { status: 'clicking_next_buttons' });
      console.log('👆 Navigating through upload steps...');
      
      for (let i = 1; i <= 3; i++) {
        console.log(`📋 Step ${i}/3: Looking for Next button...`);
        
        // Human-like pause before each step
        await this.human.randomDelay(2000, 4000);
        
        let clicked = false;
        // Prefer the stable id when present
        const nextSelectors = ['#next-button', 'ytcp-button#next-button button', 'button#next-button'];
        for (const sel of nextSelectors) {
          try {
            const btn = await this.page.waitForSelector(sel, { visible: true, timeout: 5000 });
            if (btn) {
              console.log(`✅ Found Next button for step ${i}, clicking...`);
              await this.page.evaluate(el => el.scrollIntoView({ block: 'center' }), btn);
              
              // Human-like hover before click
              await this.page.mouse.move(0, 0);
              const box = await btn.boundingBox();
              if (box) {
                await this.page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 8 });
                await this.human.randomDelay(300, 700);
              }
              
              await btn.click();
              clicked = true;
              break;
            }
          } catch {}
        }
        if (!clicked) {
          console.log(`⚠️ Next button not found for step ${i}, trying Enter key...`);
          // Fallback: press Enter to activate focused button/dialog next
          try { await this.page.keyboard.press('Enter'); clicked = true; } catch {}
        }
        
        if (clicked) {
          console.log(`✅ Step ${i} completed, waiting for next section to load...`);
        }
        
        // Wait for the next step to load with more patience
        try {
          await this.page.waitForFunction(() => {
            const labels = Array.from(document.querySelectorAll('ytcp-stepper, ytcp-video-metadata-editor'))
              .map(n => n.textContent || '');
            const joined = labels.join(' ').toLowerCase();
            return joined.includes('checks') || joined.includes('elements') || joined.includes('visibility');
          }, { timeout: 8000 });
          console.log(`📱 Step ${i}: Page loaded successfully`);
        } catch {
          console.log(`⚠️ Step ${i}: Page load detection timed out, continuing...`);
        }
        
        this.logger.logVideoUpload(videoPath, false, { status: clicked ? `next_${i}_clicked` : `next_${i}_not_found` });
        
        // Longer human-like delay between steps
        await this.human.randomDelay(2000, 4000);
      }

      // Step 4: Select Public visibility with human-like behavior
      this.logger.logVideoUpload(videoPath, false, { status: 'setting_visibility_to_public' });
      console.log('🌍 Setting video visibility to Public...');
      
      // Human-like pause before selecting visibility
      await this.human.randomDelay(1500, 3000);
      
      try {
        let publicClicked = false;
        const publicSelectors = [
          'tp-yt-paper-radio-button[name="PUBLIC"]',
          'ytcp-radio-button[name="PUBLIC"]',
          'input[name="PUBLIC"]'
        ];
        for (const sel of publicSelectors) {
          try {
            const el = await this.page.waitForSelector(sel, { visible: true, timeout: 5000 });
            if (el) {
              console.log('✅ Found Public visibility option, selecting...');
              await this.page.evaluate(elm => elm.scrollIntoView({ block: 'center' }), el);
              
              // Human-like hover before click
              const box = await el.boundingBox();
              if (box) {
                await this.page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 6 });
                await this.human.randomDelay(400, 800);
              }
              
              await el.click();
              publicClicked = true;
              break;
            }
          } catch {}
        }
        if (!publicClicked) {
          console.log('🔍 Looking for Public option by text...');
          const [pubByText] = await this.page.$x("//*[normalize-space(text())='Public']");
          if (pubByText) {
            console.log('✅ Found Public option by text, clicking...');
            await this.page.evaluate(el => el.scrollIntoView({ block: 'center' }), pubByText);
            await this.human.randomDelay(300, 600);
            await pubByText.click();
            publicClicked = true;
          }
        }
        
        if (publicClicked) {
          console.log('✅ Public visibility selected');
          this.logger.logVideoUpload(videoPath, false, { status: 'public_visibility_set' });
        } else {
          console.log('⚠️ Could not find Public visibility option');
        }
        
      } catch (e) {
        console.log(`❌ Error setting visibility: ${e.message}`);
        this.logger.logVideoUpload(videoPath, false, { status: 'public_visibility_failed', error: e.message });
      }

      // Human-like pause after selection
      await this.human.randomDelay(1200, 2200);

      // Step 5: Click Publish with human-like behavior
      this.logger.logVideoUpload(videoPath, false, { status: 'clicking_publish' });
      console.log('🎯 Publishing video...');
      
      // Add human-like pause before publishing
      await this.human.randomDelay(2000, 4000);
      
      try {
        let published = false;
        const publishSelectors = [
          'ytcp-button[id="done-button"] button',
          'ytcp-button[aria-label="Publish"] button',
          'ytcp-button button'
        ];
        for (const sel of publishSelectors) {
          try {
            const el = await this.page.waitForSelector(sel, { visible: true, timeout: 2500 });
            if (el) {
              const txt = await el.evaluate(n => n.innerText || n.textContent || '');
              if ((txt || '').toLowerCase().includes('publish') || (txt || '').toLowerCase().includes('done')) {
                console.log(`📤 Clicking publish button: "${txt}"`);
                await this.page.evaluate(elm => elm.scrollIntoView({ block: 'center' }), el);
                
                // Human-like hover before click
                await this.page.mouse.move(0, 0);
                const box = await el.boundingBox();
                if (box) {
                  await this.page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 10 });
                  await this.human.randomDelay(500, 1000);
                }
                
                await el.click();
                published = true;
                break;
              }
            }
          } catch {}
        }
        if (!published) {
          const [pubBtn] = await this.page.$x("//*[normalize-space(text())='Publish' or normalize-space(text())='Done']");
          if (pubBtn) {
            console.log('📤 Clicking publish button (XPath)');
            await this.page.evaluate(el => el.scrollIntoView({ block: 'center' }), pubBtn);
            await this.human.randomDelay(500, 1000);
            await pubBtn.click();
            published = true;
          }
        }
        this.logger.logVideoUpload(videoPath, false, { status: published ? 'publish_clicked' : 'publish_not_found' });
        
        if (!published) {
          throw new Error('Could not find or click publish button');
        }
        
      } catch (e) {
        this.logger.logVideoUpload(videoPath, false, { status: 'publish_click_failed', error: e.message });
        throw e;
      }

      // Step 6: Wait for processing and checks with human-like patience
      console.log('⏳ Waiting for YouTube processing and checks...');
      this.logger.logVideoUpload(videoPath, false, { status: 'waiting_for_processing_and_checks' });
      
      let processingComplete = false;
      let checksPassed = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max wait
      
      while ((!processingComplete || !checksPassed) && attempts < maxAttempts) {
        try {
          // Check for processing status
          const processingText = await this.page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*')).filter(el => {
              const text = el.textContent || '';
              return text.includes('Processing') || text.includes('Checking') || text.includes('Upload') || 
                     text.includes('Published') || text.includes('Complete') || text.includes('Live');
            });
            return elements.map(el => el.textContent.trim()).join(' | ');
          });
          
          console.log(`📊 Processing status (${attempts + 1}/${maxAttempts}): ${processingText || 'No status found'}`);
          
          // Check if processing is complete
          if (processingText.includes('Processing complete') || processingText.includes('Checks complete') || 
              processingText.includes('Video published') || processingText.includes('Published') ||
              processingText.includes('Upload complete')) {
            processingComplete = true;
            console.log('✅ Processing appears to be complete');
          }
          
          // Check for any error messages
          const errorText = await this.page.evaluate(() => {
            const errorElements = Array.from(document.querySelectorAll('*')).filter(el => {
              const text = (el.textContent || '').toLowerCase();
              return text.includes('error') || text.includes('failed') || text.includes('rejected') || 
                     text.includes('problem') || text.includes('issue');
            });
            return errorElements.map(el => el.textContent.trim()).join(' | ');
          });
          
          if (errorText) {
            console.log(`⚠️ Potential issues detected: ${errorText}`);
            this.logger.logVideoUpload(videoPath, false, { status: 'potential_issues_detected', issues: errorText });
          }
          
          // Look for confirmation dialog or success message
          const confirmationFound = await this.page.evaluate(() => {
            const confirmElements = Array.from(document.querySelectorAll('*')).filter(el => {
              const text = (el.textContent || '').toLowerCase();
              return text.includes('video published') || text.includes('upload complete') || 
                     text.includes('successfully published') || text.includes('live on youtube') ||
                     text.includes('published successfully');
            });
            return confirmElements.length > 0;
          });
          
          if (confirmationFound) {
            checksPassed = true;
            console.log('✅ Publication confirmation found');
          }
          
          // Human-like wait between checks
          await this.human.randomDelay(4000, 7000);
          attempts++;
          
        } catch (error) {
          console.log(`❌ Error checking processing status: ${error.message}`);
          attempts++;
          await this.human.randomDelay(3000, 5000);
        }
      }
      
      // Final wait to ensure everything is settled
      console.log('⏳ Final wait to ensure publication is complete...');
      await this.human.randomDelay(5000, 10000);

      // Step 7: Capture video link and final confirmation
      this.logger.logVideoUpload(videoPath, false, { status: 'capturing_video_link' });
      let videoLink = '';
      let finalConfirmation = false;
      
      try {
        // Wait a bit longer for the final confirmation dialog
        console.log('🔍 Looking for final confirmation and video link...');
        
        try {
        await Promise.race([
            this.page.waitForXPath("//*[contains(normalize-space(text()), 'Video published') or contains(normalize-space(text()), 'Upload complete')]", { timeout: 30000 }),
            this.page.waitForXPath("//*[normalize-space(text())='Close']", { timeout: 30000 }),
            this.page.waitForSelector('a[href*="youtube.com/watch"]', { timeout: 30000 })
          ]);
          finalConfirmation = true;
        } catch (waitError) {
          console.log('⚠️ Final confirmation dialog not found, but proceeding...');
        }
        
        // Try multiple methods to get the video link
        try {
          const linkSelectors = [
            'a.style-scope.ytcp-video-info',
            'a[href*="youtube.com/watch"]',
            'a[href*="youtu.be"]',
            '[data-testid="video-link"]',
            '.video-link'
          ];
          
          for (const selector of linkSelectors) {
            const linkElements = await this.page.$$(selector);
            for (const linkEl of linkElements) {
              const href = await linkEl.evaluate(el => el.href || el.textContent || '');
              if (href && (href.includes('youtube.com/watch') || href.includes('youtu.be'))) {
              videoLink = href;
                console.log(`🔗 Found video link: ${videoLink}`);
              break;
            }
          }
            if (videoLink) break;
          }
          
          // If no direct link found, try to extract from page content
          if (!videoLink) {
            videoLink = await this.page.evaluate(() => {
              const text = document.body.innerText;
              const match = text.match(/(https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+)/);
              return match ? match[1] : '';
            });
          }
          
        } catch (linkError) {
          console.log(`⚠️ Could not extract video link: ${linkError.message}`);
        }
        
        // Take a screenshot of the final state
        await this.page.screenshot({ path: './logs/final-publication-state.png' });
        console.log('📸 Screenshot saved: final-publication-state.png');
        
      } catch (finalError) {
        console.log(`⚠️ Error in final confirmation: ${finalError.message}`);
      }

      // Human-like final pause before completing
      console.log('✨ Taking a moment to review the publication...');
      await this.human.randomDelay(3000, 6000);

      const successMessage = videoLink ? 
        `Video uploaded and published successfully! Link: ${videoLink}` : 
        'Video uploaded and published successfully!';
      
      console.log(`🎉 ${successMessage}`);
      this.logger.logVideoUpload(videoPath, true, { 
        status: 'finalization_complete', 
        videoLink, 
        finalConfirmation,
        processingComplete,
        checksPassed 
      });
      
      return videoLink || 'Video uploaded successfully';
      
    } catch (error) {
      this.logger.logVideoUpload(videoPath, false, { status: 'finalization_failed', error: error.message });
      throw error;
    }
  }

  // Helper method to click Next button
  async clickNextButton() {
    const nextButtonSelectors = [
      'button:has-text("Next")',
      'button[aria-label*="Next"]',
      'button[aria-label*="next"]',
      '[data-testid="next-button"]',
      'ytcp-button:has-text("Next")',
      'button[class*="next"]',
      'button[class*="Next"]'
    ];
    
    for (const selector of nextButtonSelectors) {
      try {
        const button = await this.page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          this.logger.logVideoUpload('', false, { status: 'next_button_clicked', selector });
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Next button not found');
  }
  
  // Helper method to set visibility to Public
  async setVisibilityToPublic() {
    const publicSelectors = [
      'input[value="public"]',
      'input[aria-label*="Public"]',
      'input[aria-label*="public"]',
      'label:has-text("Public")',
      'div:has-text("Public")',
      'span:has-text("Public")',
      '[data-testid="public-radio"]',
      'input[name="visibility"][value="public"]'
    ];
    
    for (const selector of publicSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element && await element.isVisible()) {
          await element.click();
          this.logger.logVideoUpload('', false, { status: 'public_visibility_selected', selector });
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Public visibility option not found');
  }
  
  // Helper method to publish video
  async publishVideo() {
    const publishSelectors = [
      'button:has-text("Publish")',
      'button[aria-label*="Publish"]',
      'button[aria-label*="publish"]',
      '[data-testid="publish-button"]',
      'ytcp-button:has-text("Publish")',
      'button[class*="publish"]',
      'button[class*="Publish"]'
    ];
    
    for (const selector of publishSelectors) {
      try {
        const button = await this.page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          this.logger.logVideoUpload('', false, { status: 'publish_button_clicked', selector });
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Publish button not found');
  }
  
  // Helper method to wait for publish confirmation
  async waitForPublishConfirmation() {
    const confirmationSelectors = [
      'div:has-text("Video published")',
      'div:has-text("Published")',
      'div:has-text("Your video is now live")',
      '[data-testid="publish-success"]',
      '.publish-success',
      'span:has-text("Video published")',
      'span:has-text("Published")'
    ];
    
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
      for (const selector of confirmationSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element && await element.isVisible()) {
            this.logger.logVideoUpload('', false, { status: 'publish_confirmation_found', selector });
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      this.logger.logVideoUpload('', false, { status: 'waiting_for_publish_confirmation', attempt: attempts + 1 });
      await this.human.randomDelay(5000, 8000);
      attempts++;
    }
    
    this.logger.logVideoUpload('', false, { status: 'publish_confirmation_timeout_but_continuing' });
    return false;
  }

  // Helper method to fill video fields with better error handling
  async fillVideoField(fieldName, value, selectors) {
    try {
      let fieldInput = null;
      
      for (const selector of selectors) {
        try {
          fieldInput = await this.page.$(selector);
          if (fieldInput && await fieldInput.isVisible()) {
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (fieldInput) {
        await fieldInput.focus();
        await this.human.randomDelay(500, 1000);
        
        // Clear existing text first
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('A');
        await this.page.keyboard.up('Control');
        await this.human.randomDelay(500, 1000);
        
        // Type with realistic delays
        await this.page.keyboard.type(value, { delay: 80 + Math.random() * 120 });
        await this.human.randomDelay(1000, 1500);
        
        this.logger.logVideoUpload('', false, { status: `${fieldName}_filled`, value: value.substring(0, 50) + '...' });
      } else {
        this.logger.logVideoUpload('', false, { status: `${fieldName}_input_not_found` });
      }
    } catch (error) {
      this.logger.logVideoUpload('', false, { status: `${fieldName}_fill_error`, error: error.message });
    }
  }

  // Upload multiple videos
  async uploadMultipleVideos(videoFolder = config.youtube.videoFolder, maxVideos = 3) {
    try {
      this.logger.logStep('videosUploaded', false, { status: 'starting', maxVideos: 3 });

      // Get video files
      const videoFiles = await this.getVideoFiles(videoFolder);
      if (videoFiles.length === 0) {
        this.logger.logStep('videosUploaded', false, { status: 'no_videos_found', folder: videoFolder });
        console.log(`❌ No videos found in folder: ${videoFolder}`);
        return 0;
      }

      console.log(`📁 Found ${videoFiles.length} videos in folder: ${videoFolder}`);
      videoFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${path.basename(file)}`);
      });

      let uploadedCount = 0;
      const videosToUpload = Math.min(3, videoFiles.length); // Upload exactly 3 videos or all available if less than 3
      
      console.log(`🎯 Will upload ${videosToUpload} videos (max: ${maxVideos})`);
      
      for (let i = 0; i < videosToUpload; i++) {
        const videoPath = videoFiles[i];
        const videoName = path.basename(videoPath);
        const metadata = await this.getVideoMetadata(videoPath);

        try {
          console.log(`\n📤 Uploading video ${i + 1}/${videosToUpload}: ${videoName}`);
          this.logger.logStep('videosUploaded', false, { status: `uploading_video_${i + 1}`, video: videoName });
          
          // Use the new improved upload method with file chooser
          await this.uploadVideoStepByStep(videoPath, metadata);
          uploadedCount++;
          
          console.log(`✅ Successfully uploaded: ${videoName}`);
          this.logger.logStep('videosUploaded', false, { status: `video_${i + 1}_completed`, uploadedCount });
          
          // Delay between uploads (longer delay to avoid detection)
          if (i < videosToUpload - 1) {
            const delay = 30000 + Math.random() * 30000; // 30-60 seconds between uploads
            console.log(`⏳ Waiting ${Math.round(delay / 1000)} seconds before next upload...`);
            this.logger.logStep('videosUploaded', false, { status: 'waiting_between_uploads', delay: Math.round(delay / 1000) });
            await this.human.randomDelay(delay, delay + 10000);
          }
        } catch (error) {
          console.log(`❌ Failed to upload ${videoName}: ${error.message}`);
          this.logger.logError(error, `video_upload_${i + 1}`);
          
          // Continue with next video even if one fails
          this.logger.logStep('videosUploaded', false, { status: `video_${i + 1}_failed`, error: error.message });
        }
      }

      console.log(`\n🎉 Upload Summary: ${uploadedCount}/${videosToUpload} videos uploaded successfully`);
      this.logger.logStep('videosUploaded', true, { uploadedCount, totalVideos: videosToUpload, target: 3 });
      return uploadedCount;
    } catch (error) {
      console.log(`❌ Error in uploadMultipleVideos: ${error.message}`);
      this.logger.logError(error, 'uploadMultipleVideos');
      throw error;
    }
  }

  // Get video files from folder
  async getVideoFiles(folderPath) {
    try {
      const files = await fs.readdir(folderPath);
      const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'];
      
      return files
        .filter(file => videoExtensions.some(ext => file.toLowerCase().endsWith(ext)))
        .map(file => path.join(folderPath, file));
    } catch (error) {
      this.logger.logError(error, 'getVideoFiles');
      return [];
    }
  }

  // Get video metadata from JSON file
  async getVideoMetadata(videoPath) {
    try {
      const metadataFile = config.youtube.metadataFile;
      if (await fs.pathExists(metadataFile)) {
        const metadata = await fs.readJson(metadataFile);
        const videoName = path.basename(videoPath, path.extname(videoPath));
        return metadata[videoName] || {};
      }
    } catch (error) {
      this.logger.logError(error, 'getVideoMetadata');
    }
    
    // Generate random metadata
    const titles = [
      'Amazing Discovery You Need to See!',
      'Incredible Moments That Will Blow Your Mind',
      'The Most Fascinating Video You\'ll Watch Today',
      'Unbelievable Facts That Will Surprise You',
      'Must-Watch: This Changes Everything!',
      'The Truth About What You Didn\'t Know',
      'Mind-Blowing Revelations That Will Shock You',
      'You Won\'t Believe What Happens Next!',
      'The Secret That Nobody Talks About',
      'This Will Completely Change Your Perspective'
    ];
    
    const descriptions = [
      'Thanks for watching! Don\'t forget to like and subscribe for more amazing content! 🔥',
      'This video took a lot of work to create. Your support means everything! ❤️',
      'If you enjoyed this video, make sure to hit that like button and subscribe! 👍',
      'Thanks for being part of our community! Share this video with your friends! 📢',
      'Don\'t forget to turn on notifications so you never miss our latest uploads! 🔔',
      'Your engagement helps us create more content like this. Thank you! 🙏',
      'Leave a comment below and let us know what you think! 💬',
      'Share this video if you found it helpful or entertaining! 📤',
      'Subscribe for daily content that will inspire and entertain you! ✨',
      'Hit that like button if you want to see more videos like this! 👍'
    ];
    
    const tagSets = [
      ['viral', 'trending', 'amazing', 'incredible', 'mustwatch'],
      ['fascinating', 'mindblowing', 'unbelievable', 'shocking', 'wow'],
      ['discovery', 'revelation', 'truth', 'secret', 'exposed'],
      ['entertainment', 'fun', 'awesome', 'cool', 'amazing'],
      ['viral', 'trending', 'popular', 'hot', 'fire']
    ];
    
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
    const randomTags = tagSets[Math.floor(Math.random() * tagSets.length)];
    
    // Return generated metadata
    return {
      title: randomTitle,
      description: randomDescription,
      tags: randomTags,
      visibility: 'private' // Keep private for safety
    };
  }

  // Save session cookies
  async saveCookies() {
    try {
      // Get cookies from the browser context
      const cookies = await this.page.evaluate(() => {
        return document.cookie;
      });
      
      const cookieFile = `./profiles/cookies_${Date.now()}.json`;
      await fs.ensureDir('./profiles');
      await fs.writeJson(cookieFile, { cookies });
      this.logger.logStep('cookiesSaved', true, { cookieFile });
      return cookieFile;
    } catch (error) {
      this.logger.logError(error, 'saveCookies');
    }
  }

  // Load session cookies
  async loadCookies(cookieFile) {
    try {
      if (await fs.pathExists(cookieFile)) {
        const cookies = await fs.readJson(cookieFile);
        await this.page.context().addCookies(cookies);
        this.logger.logStep('cookiesLoaded', true, { cookieFile });
        return true;
      }
    } catch (error) {
      this.logger.logError(error, 'loadCookies');
    }
    return false;
  }

  // Helper method to find and click button using Tab navigation
  async findAndClickButtonWithTab(searchTerm, maxTabs = 20) {
    console.log(`🔍 Looking for button with text: "${searchTerm}" using Tab navigation...`);
    
    try {
      // First, try to find the button directly with more selectors
      const buttonSelectors = [
        `button:has-text("${searchTerm}")`,
        `[role="button"]:has-text("${searchTerm}")`,
        `div[role="button"]:has-text("${searchTerm}")`,
        `span:has-text("${searchTerm}")`,
        `a:has-text("${searchTerm}")`,
        `div:has-text("${searchTerm}")`,
        `[aria-label*="${searchTerm}"]`,
        `[title*="${searchTerm}"]`,
        `[data-testid*="${searchTerm.toLowerCase()}"]`
      ];
      
      for (const selector of buttonSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element && await element.isVisible()) {
            console.log(`✅ Found button directly: ${selector}`);
            await element.click();
            await this.human.randomDelay(1000, 2000);
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      // If direct search fails, use enhanced Tab navigation
      console.log('🔄 Using enhanced Tab navigation to find button...');
      
      // Press Tab multiple times to navigate through focusable elements
      for (let i = 0; i < maxTabs; i++) {
        await this.page.keyboard.press('Tab');
        await this.human.randomDelay(300, 800);
        
        // Check if the currently focused element contains our search term
        const focusedElement = await this.page.evaluate(() => {
          const activeElement = document.activeElement;
          if (activeElement) {
            return {
              tagName: activeElement.tagName,
              textContent: activeElement.textContent,
              innerText: activeElement.innerText,
              value: activeElement.value,
              role: activeElement.getAttribute('role'),
              type: activeElement.getAttribute('type'),
              ariaLabel: activeElement.getAttribute('aria-label'),
              title: activeElement.getAttribute('title'),
              className: activeElement.className
            };
          }
          return null;
        });
        
        if (focusedElement) {
          const elementText = (focusedElement.textContent || focusedElement.innerText || focusedElement.value || focusedElement.ariaLabel || focusedElement.title || '').toLowerCase();
          console.log(`Tab ${i + 1}: Focused on ${focusedElement.tagName} - "${elementText}"`);
          
          // Check if this element contains our search term (more flexible matching)
          if (elementText.includes(searchTerm.toLowerCase()) || 
              elementText.includes(searchTerm.toLowerCase().replace(' ', '')) ||
              searchTerm.toLowerCase().split(' ').some(word => elementText.includes(word))) {
            console.log(`✅ Found button with Tab navigation: "${searchTerm}"`);
            
            // Click the focused element
            await this.page.keyboard.press('Enter');
            await this.human.randomDelay(1000, 2000);
            return true;
          }
        }
      }
      
      console.log(`❌ Button "${searchTerm}" not found after ${maxTabs} Tab presses`);
      return false;
      
    } catch (error) {
      console.log(`❌ Error in Tab navigation: ${error.message}`);
      return false;
    }
  }

  // Simulate human drag and drop behavior
  async simulateDragAndDrop(videoPath) {
    console.log('🖱️ Simulating drag and drop upload...');
    
    try {
      // Find the upload area (usually a drop zone)
      const dropZoneSelectors = [
        '[data-testid="upload-drop-zone"]',
        '[aria-label*="upload"]',
        '[class*="upload"]',
        '[class*="drop"]',
        'div[role="button"]'
      ];
      
      let dropZone = null;
      for (const selector of dropZoneSelectors) {
        try {
          dropZone = await this.page.$(selector);
          if (dropZone && await dropZone.isVisible()) {
            console.log(`✅ Found drop zone: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (dropZone) {
        // Simulate drag and drop
        const box = await dropZone.boundingBox();
        if (box) {
          // Move to drop zone
          await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await this.human.randomDelay(500, 1000);
          
          // Simulate file drop
          await this.page.evaluate((filePath) => {
            const dataTransfer = new DataTransfer();
            const file = new File([''], filePath, { type: 'video/mp4' });
            dataTransfer.items.add(file);
            
            const dropEvent = new DragEvent('drop', {
              dataTransfer: dataTransfer,
              bubbles: true
            });
            
            document.dispatchEvent(dropEvent);
          }, videoPath);
          
          console.log('✅ Drag and drop simulation completed');
          return true;
        }
      }
      
      // Fallback: try clicking and then uploading
      console.log('🔄 Trying click-then-upload fallback...');
      await this.page.click('body');
      await this.human.randomDelay(1000, 2000);
      
      const fileInput = await this.page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(videoPath);
        console.log('✅ Fallback upload successful');
        return true;
      }
      
      return false;
    } catch (error) {
      console.log(`❌ Drag and drop simulation failed: ${error.message}`);
      return false;
    }
  }

  // Helper method to find elements using Tab navigation (improved for upload button)
  async findElementWithTab(searchTerm, maxTabs = 20) {
    // Focus on the page first
    await this.page.keyboard.press('Tab');
    await this.human.randomDelay(500, 1000);
    
    let tabCount = 0;
    
    while (tabCount < maxTabs) {
      // Get the currently focused element
      const focusedElement = await this.page.evaluate(() => {
        const activeElement = document.activeElement;
        if (activeElement) {
          return {
            tagName: activeElement.tagName,
            textContent: activeElement.textContent?.trim(),
            ariaLabel: activeElement.getAttribute('aria-label'),
            dataTestId: activeElement.getAttribute('data-testid'),
            className: activeElement.className,
            id: activeElement.id,
            type: activeElement.type
          };
        }
        return null;
      });
      
      // Check if current element matches the search term or is upload-related
      if (focusedElement && (
        focusedElement.textContent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        focusedElement.ariaLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        focusedElement.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        // Additional upload-specific checks
        focusedElement.textContent?.toLowerCase().includes('upload') ||
        focusedElement.textContent?.toLowerCase().includes('select files') ||
        focusedElement.textContent?.toLowerCase().includes('select files') ||
        focusedElement.ariaLabel?.toLowerCase().includes('upload') ||
        focusedElement.ariaLabel?.toLowerCase().includes('select files') ||
        focusedElement.dataTestId?.toLowerCase().includes('upload') ||
        focusedElement.dataTestId?.toLowerCase().includes('select-files') ||
        focusedElement.type === 'file'
      )) {
        return focusedElement;
      }
      
      // Tab to next element
      await this.page.keyboard.press('Tab');
      await this.human.randomDelay(200, 500);
      tabCount++;
    }
    
    return null;
  }

  // Specialized method to find upload button using keyboard navigation
  async findUploadButtonWithKeyboard() {
    this.logger.logVideoUpload('', false, { status: 'finding_upload_button_with_keyboard' });
    
    // First try to find upload button using traditional selectors
    const uploadSelectors = [
      'button:has-text("Select files")',
      'button:has-text("Select Files")',
      'button:has-text("Upload")',
      'button[aria-label*="Select files"]',
      'button[aria-label*="Select Files"]',
      'button[aria-label*="Upload"]',
      'button[data-testid*="select-files"]',
      'button[data-testid*="upload-button"]',
      'div[role="button"]:has-text("Select files")',
      'div[role="button"]:has-text("Select Files")',
      'div[role="button"]:has-text("Upload")',
      'input[type="file"]'
    ];
    
    for (const selector of uploadSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element && await element.isVisible()) {
          this.logger.logVideoUpload('', false, { status: 'upload_button_found_via_selector', selector });
          return element;
        }
      } catch (e) {
        continue;
      }
    }
    
    // If not found, use keyboard navigation
    this.logger.logVideoUpload('', false, { status: 'using_keyboard_navigation_for_upload_button' });
    
    // Focus on the page first
    await this.page.keyboard.press('Tab');
    await this.human.randomDelay(500, 1000);
    
    for (let tabCount = 0; tabCount < 15; tabCount++) {
      try {
        // Get current focused element
        const currentElement = await this.page.evaluate(() => {
          const activeElement = document.activeElement;
          if (activeElement) {
            return {
              tagName: activeElement.tagName,
              textContent: activeElement.textContent?.trim(),
              ariaLabel: activeElement.getAttribute('aria-label'),
              dataTestId: activeElement.getAttribute('data-testid'),
              className: activeElement.className,
              id: activeElement.id,
              type: activeElement.type
            };
          }
          return null;
        });
        
        this.logger.logVideoUpload('', false, { 
          status: 'keyboard_navigation_step', 
          tabCount: tabCount + 1, 
          element: currentElement 
        });
        
        // Check if this is the upload button
        if (currentElement && (
          currentElement.textContent === 'Select files' ||
          currentElement.textContent === 'Select Files' ||
          currentElement.textContent === 'Upload' ||
          currentElement.ariaLabel?.includes('Select files') ||
          currentElement.ariaLabel?.includes('Select Files') ||
          currentElement.ariaLabel?.includes('Upload') ||
          currentElement.dataTestId?.includes('select-files') ||
          currentElement.dataTestId?.includes('upload-button') ||
          currentElement.type === 'file'
        )) {
          this.logger.logVideoUpload('', false, { status: 'upload_button_found_via_keyboard' });
          return await this.page.$('input[type="file"]') || document.activeElement;
        }
        
        // Tab to next element
        await this.page.keyboard.press('Tab');
        await this.human.randomDelay(200, 500);
        
      } catch (e) {
        this.logger.logVideoUpload('', false, { status: 'keyboard_navigation_error', error: e.message });
        continue;
      }
    }
    
    this.logger.logVideoUpload('', false, { status: 'upload_button_not_found_via_keyboard' });
    return null;
  }
  

}

module.exports = YouTubeAutomation; 