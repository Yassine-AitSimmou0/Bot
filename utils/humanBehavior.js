const delay = require('delay');
const { createCursor } = require('ghost-cursor');
const config = require('../config');

class HumanBehavior {
  constructor(page) {
    this.page = page;
    this.cursor = createCursor(page, {
      scrollBehavior: 'smooth',
      ...config.browser.viewport
    });
  }

  // Random delay between actions
  async randomDelay(min = config.humanBehavior.minDelay, max = config.humanBehavior.maxDelay) {
    const delayTime = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`⏳ Human-like delay: ${Math.round(delayTime / 1000)}s`);
    await delay(delayTime);
  }

  // Human-like typing with random delays
  async humanType(selector, text) {
    await this.page.click(selector);
    await this.randomDelay(500, 1000);

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      await this.page.keyboard.type(char, { delay: 120 + Math.random() * 80 }); // 120-200ms delay
      
      // Occasionally pause longer (like a human thinking)
      if (Math.random() < 0.15) {
        await this.randomDelay(800, 1500);
      }
      
      // Longer pause at punctuation
      if (['.', ',', '!', '?', ';', ':'].includes(char)) {
        await this.randomDelay(300, 800);
      }
    }
  }

  // Human-like clicking with cursor movement
  async humanClick(selector, options = {}) {
    const element = await this.page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const box = await element.boundingBox();
    if (!box) {
      throw new Error(`Could not get bounding box for: ${selector}`);
    }

    // Add some randomness to click position
    const x = box.x + box.width * (0.3 + Math.random() * 0.4);
    const y = box.y + box.height * (0.3 + Math.random() * 0.4);

    // Move cursor naturally to the element
    await this.cursor.move(x, y);
    await this.randomDelay(200, 500);

    // Click with natural movement
    await this.cursor.click(x, y);
    await this.randomDelay(500, 1500);
  }

  // Scroll naturally
  async naturalScroll(direction = 'down', distance = 300) {
    const viewport = config.browser.viewport;
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;

    if (direction === 'down') {
      await this.page.mouse.wheel({ deltaY: distance });
    } else if (direction === 'up') {
      await this.page.mouse.wheel({ deltaY: -distance });
    }

    await this.randomDelay(1000, 2000);
  }

  // Move mouse naturally to element
  async moveToElement(selector) {
    const element = await this.page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const box = await element.boundingBox();
    if (!box) {
      throw new Error(`Could not get bounding box for: ${selector}`);
    }

    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await this.cursor.move(x, y);
    await this.randomDelay(300, 800);
  }

  // Wait for element with timeout and human-like behavior
  async waitForElement(selector, timeout = config.browser.defaultTimeout) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      await this.randomDelay(500, 1000);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Fill form fields naturally
  async fillFormField(selector, value) {
    await this.humanClick(selector);
    await this.randomDelay(300, 700);
    
    // Clear existing content
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('A');
    await this.page.keyboard.up('Control');
    await this.randomDelay(200, 400);
    
    // Type new value
    await this.humanType(selector, value);
  }

  // Select dropdown option naturally
  async selectDropdownOption(selector, value) {
    await this.humanClick(selector);
    await this.randomDelay(500, 1000);
    
    // Find and click the option
    const optionSelector = `${selector} option[value="${value}"]`;
    await this.humanClick(optionSelector);
  }

  // Handle file upload naturally
  async uploadFile(fileInputSelector, filePath) {
    const [fileChooser] = await Promise.all([
      this.page.waitForFileChooser(),
      this.humanClick(fileInputSelector)
    ]);
    
    await this.randomDelay(500, 1000);
    await fileChooser.accept([filePath]);
    await this.randomDelay(1000, 2000);
  }

  // Simulate page load waiting
  async waitForPageLoad() {
    // Wait for page to be ready
    await this.page.waitForSelector('body', { timeout: 10000 });
    await this.randomDelay(2000, 4000);
  }

  // Check for captcha
  async checkForCaptcha() {
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="captcha"]',
      '.g-recaptcha',
      '#recaptcha',
      '.captcha'
    ];

    for (const selector of captchaSelectors) {
      const captcha = await this.page.$(selector);
      if (captcha) {
        return true;
      }
    }
    return false;
  }

  // Check for login challenges (phone verification, security questions, etc.)
  async checkForLoginChallenge() {
    const challengeSelectors = [
      'div:has-text("Verify it\'s you")',
      'div:has-text("Verify it is you")',
      'div:has-text("Phone number")',
      'div:has-text("Security question")',
      'div:has-text("Backup codes")',
      'div:has-text("2-Step Verification")',
      'div:has-text("Choose how you want to sign in")',
      'input[type="tel"]',
      'input[name="phoneNumber"]',
      'select[name="phoneCountryCode"]'
    ];

    for (const selector of challengeSelectors) {
      try {
        const challenge = await this.page.$(selector);
        if (challenge) {
          return true;
        }
      } catch (error) {
        // Continue checking other selectors
      }
    }
    return false;
  }

  // Human idle activity to appear less bot-like (move mouse, scroll, random waits)
  async idleHumanActivity(durationMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < durationMs) {
      // Random small mouse move
      const vp = this.page.viewport() || { width: 1280, height: 720 };
      const x = Math.floor(50 + Math.random() * (vp.width - 100));
      const y = Math.floor(50 + Math.random() * (vp.height - 100));
      try {
        await this.cursor.move(x, y);
      } catch {}
      await this.randomDelay(300, 900);
      // Random small scroll
      const dir = Math.random() < 0.5 ? 'down' : 'up';
      await this.naturalScroll(dir, 100 + Math.floor(Math.random() * 200));
      // Occasional longer pause
      if (Math.random() < 0.3) {
        await this.randomDelay(1200, 2500);
      }
    }
  }
}

module.exports = HumanBehavior; 