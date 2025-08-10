import os
import random
import time
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from selenium_stealth import stealth
from twocaptcha import TwoCaptcha

load_dotenv()

EMAIL = os.getenv('YT_EMAIL') or 'w7632235@gmail.com'
PASSWORD = os.getenv('YT_PASSWORD') or 'Fcaz8299@'
VIDEO_PATH = os.getenv('YT_VIDEO') or str(Path(__file__).resolve().parents[1] / 'videos' / '1.mp4')
CAPTCHA_KEY = os.getenv('2CAPTCHA_API_KEY')  # set in .env for auto-solve


def human_sleep(a: float, b: float):
    time.sleep(random.uniform(a, b))


def find_any(driver, selectors: List[str]):
    for sel in selectors:
        try:
            el = driver.find_element(By.CSS_SELECTOR, sel)
            if el.is_displayed():
                return el
        except Exception:
            continue
    return None


def get_recaptcha_sitekey(driver) -> Optional[str]:
    try:
        frames = driver.find_elements(By.TAG_NAME, 'iframe')
        for f in frames:
            src = f.get_attribute('src') or ''
            if 'recaptcha' in src.lower():
                # Extract k= sitekey param
                from urllib.parse import urlparse, parse_qs
                qs = parse_qs(urlparse(src).query)
                sitekeys = qs.get('k') or qs.get('sitekey')
                if sitekeys:
                    return sitekeys[0]
    except Exception:
        pass
    # Also try on-page widgets
    try:
        w = driver.find_element(By.CSS_SELECTOR, '.g-recaptcha')
        sk = w.get_attribute('data-sitekey')
        if sk:
            return sk
    except Exception:
        pass
    return None


def recaptcha_basic_checkbox(driver):
    try:
        frames = driver.find_elements(By.TAG_NAME, 'iframe')
        for f in frames:
            src = f.get_attribute('src') or ''
            if 'recaptcha' in src.lower():
                driver.switch_to.frame(f)
                try:
                    anchor = driver.find_element(By.CSS_SELECTOR, '#recaptcha-anchor')
                    anchor.click()
                    human_sleep(1.5, 3.0)
                except Exception:
                    pass
                driver.switch_to.default_content()
                return True
    except Exception:
        pass
    return False


def recaptcha_solve_2captcha(driver) -> bool:
    if not CAPTCHA_KEY:
        return False
    sitekey = get_recaptcha_sitekey(driver)
    if not sitekey:
        return False

    solver = TwoCaptcha(CAPTCHA_KEY, defaultTimeout=120, pollingInterval=5)
    url = driver.current_url
    try:
        result = solver.recaptcha(sitekey=sitekey, url=url)
        token = result.get('code')
        if not token:
            return False
        # Inject token into response field and submit
        driver.execute_script(
            """
            const token = arguments[0];
            const responseEls = document.querySelectorAll('#g-recaptcha-response, textarea[name="g-recaptcha-response"]');
            let el = responseEls[0];
            if (!el) {
              const ta = document.createElement('textarea');
              ta.id = 'g-recaptcha-response';
              ta.name = 'g-recaptcha-response';
              ta.style.display = 'none';
              document.body.appendChild(ta);
              el = ta;
            }
            el.value = token;
            const evt = new Event('change', { bubbles: true });
            el.dispatchEvent(evt);
            """,
            token,
        )
        human_sleep(1.0, 2.0)
        # Try to continue login
        try:
            btn = find_any(driver, ['button[type="submit"]', '#identifierNext', '#passwordNext'])
            if btn:
                btn.click()
        except Exception:
            pass
        human_sleep(2.0, 3.0)
        return True
    except Exception:
        return False


def login_google(driver):
    driver.get('https://accounts.google.com/signin')
    WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))
    human_sleep(1.0, 2.0)

    email_input = WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="email"], input[name="identifier"]')))
    email_input.clear()
    email_input.send_keys(EMAIL)
    human_sleep(0.5, 1.0)
    email_input.send_keys(Keys.ENTER)

    human_sleep(2.0, 3.0)
    # Try checkbox; if not, try 2Captcha
    if not recaptcha_basic_checkbox(driver):
        recaptcha_solve_2captcha(driver)

    # password
    try:
        pwd_input = WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="password"], input[name="password"]')))
    except TimeoutException:
        # maybe captcha/challenge; attempt solve then retry
        recaptcha_solve_2captcha(driver)
        human_sleep(10.0, 15.0)
        pwd_input = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="password"], input[name="password"]')))

    pwd_input.clear()
    pwd_input.send_keys(PASSWORD)
    human_sleep(0.5, 1.0)
    pwd_input.send_keys(Keys.ENTER)

    human_sleep(2.0, 3.0)
    if not recaptcha_basic_checkbox(driver):
        recaptcha_solve_2captcha(driver)

    # wait for redirect
    ok = False
    for _ in range(20):
        url = driver.current_url
        if 'myaccount.google.com' in url or 'youtube.com' in url or 'gmail.com' in url:
            ok = True
            break
        human_sleep(1.5, 2.5)
    return ok


def ensure_interactive(driver):
    try:
        driver.execute_script(
            """
            try {
              const sels = ['.overlay', '.scrim', '.modal', '.loading-overlay', '.ytcp-dialog__scrim'];
              sels.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
              [document.documentElement, document.body].forEach(el => {
                if (!el) return;
                el.style.filter = 'none';
                el.style.pointerEvents = 'auto';
                el.classList.remove('blurred', 'loading');
              });
              document.querySelectorAll('[inert]').forEach(el => el.removeAttribute('inert'));
            } catch {}
            """
        )
    except Exception:
        pass


def fill_textbox(driver, selectors: List[str], value: str):
    ensure_interactive(driver)
    # Prefer polymer textbox
    selectors = selectors + [
        '#title-textarea #textbox', '#description-textarea #textbox',
        'ytcp-mention-textbox#title-textarea #textbox',
        'ytcp-mention-textbox#description-textarea #textbox'
    ]
    el = find_any(driver, selectors)
    if not el:
        return
    try:
        el.click()
    except Exception:
        pass
    human_sleep(0.3, 0.6)
    el.send_keys(Keys.CONTROL, 'a')
    human_sleep(0.2, 0.4)
    for ch in value:
        el.send_keys(ch)
        time.sleep(random.uniform(0.06, 0.12))


def click_any(driver, selectors: List[str]) -> bool:
    el = find_any(driver, selectors)
    if el:
        try:
            el.click()
            return True
        except Exception:
            return False
    return False


def upload_video_flow(driver):
    driver.get('https://studio.youtube.com/upload')
    WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))
    human_sleep(2.0, 3.0)
    ensure_interactive(driver)

    # file input
    file_input = find_any(driver, ['input[type="file"]'])
    if not file_input:
        driver.execute_script(
            """
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.style.display = 'none';
            input.id = 'temp-file-input';
            document.body.appendChild(input);
            """
        )
        file_input = find_any(driver, ['#temp-file-input'])

    if not file_input:
        raise RuntimeError('File input not found')

    file_input.send_keys(VIDEO_PATH)
    human_sleep(8.0, 12.0)

    # wait metadata visible
    for _ in range(12):
        if find_any(driver, ['input[name="title"]', '#title-textarea #textbox']):
            break
        human_sleep(2.0, 3.0)

    title = f"Test Upload {int(time.time())}"
    desc = "Random test description for automation."

    fill_textbox(driver, ['input[name="title"]', 'textarea[name="title"]'], title)
    human_sleep(1.0, 1.5)
    fill_textbox(driver, ['textarea[name="description"]'], desc)
    human_sleep(1.0, 1.5)

    # Next x3
    for _ in range(3):
        if not click_any(driver, ['button:has-text("Next")', 'button[aria-label*="Next"]']):
            # Tab fallback
            for _ in range(35):
                driver.switch_to.active_element.send_keys(Keys.TAB)
                human_sleep(0.1, 0.2)
                driver.switch_to.active_element.send_keys(Keys.ENTER)
                human_sleep(0.4, 0.8)
                break
        human_sleep(1.0, 1.6)

    # Public
    if not click_any(driver, ['input[value="public"]', 'input[name="visibility"][value="public"]', 'span:has-text("Public")']):
        for _ in range(40):
            driver.switch_to.active_element.send_keys(Keys.TAB)
            human_sleep(0.1, 0.2)
            driver.switch_to.active_element.send_keys(Keys.ENTER)
            human_sleep(0.4, 0.8)

    # Publish
    if not click_any(driver, ['button:has-text("Publish")', 'button[aria-label*="Publish"]']):
        for _ in range(40):
            driver.switch_to.active_element.send_keys(Keys.TAB)
            human_sleep(0.1, 0.2)
            driver.switch_to.active_element.send_keys(Keys.ENTER)
            human_sleep(0.4, 0.8)

    # Wait best-effort
    human_sleep(5.0, 8.0)


def bootstrap_driver():
    options = Options()
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--start-maximized')
    driver = webdriver.Chrome(options=options)

    stealth(driver,
            languages=["en-US", "en"],
            vendor="Google Inc.",
            platform="Win32",
            webgl_vendor="Intel Inc.",
            renderer="Intel Iris OpenGL Engine",
            fix_hairline=True,
            )
    return driver


def main():
    driver = bootstrap_driver()
    try:
        if not login_google(driver):
            print('Login failed or requires manual solve. Please complete any challenge.')
            time.sleep(20)
        upload_video_flow(driver)
        print('Done.')
        time.sleep(5)
    finally:
        driver.quit()


if __name__ == '__main__':
    main()
