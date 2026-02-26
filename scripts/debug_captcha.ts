/**
 * Debug: extract captcha image from MatchPoint and try to read it
 */
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

async function debugCaptcha() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://squashbad33-fr.matchpoint.com.es/Signup.aspx', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const src = await page.locator('#imgCaptcha').getAttribute('src');
    if (!src) {
        console.log("No captcha found!");
        await browser.close();
        return;
    }

    // Save the raw captcha image
    const pureBase64 = src.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(pureBase64, 'base64');
    writeFileSync('/tmp/captcha_raw.gif', imgBuffer);
    console.log('Saved raw captcha to /tmp/captcha_raw.gif');

    // Convert to PNG using sips (macOS built-in)
    try {
        execSync('sips -s format png /tmp/captcha_raw.gif --out /tmp/captcha_raw.png 2>/dev/null');
        console.log('Converted to PNG');
    } catch {
        console.log('sips failed, trying without conversion');
    }

    // Try different Tesseract settings
    const configs = [
        { name: 'psm7', cmd: 'tesseract /tmp/captcha_raw.png stdout --psm 7 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' },
        { name: 'psm8', cmd: 'tesseract /tmp/captcha_raw.png stdout --psm 8' },
        { name: 'psm13', cmd: 'tesseract /tmp/captcha_raw.png stdout --psm 13' },
        { name: 'psm6', cmd: 'tesseract /tmp/captcha_raw.png stdout --psm 6' },
        { name: 'default', cmd: 'tesseract /tmp/captcha_raw.png stdout' },
    ];

    for (const cfg of configs) {
        try {
            const result = execSync(cfg.cmd + ' 2>/dev/null', { encoding: 'utf-8' }).trim();
            console.log(`[${cfg.name}] Result: "${result}"`);
        } catch {
            console.log(`[${cfg.name}] Failed`);
        }
    }

    // Also try after preprocessing: resize + threshold
    try {
        // Resize 3x + convert to grayscale + threshold
        execSync('sips -s format png /tmp/captcha_raw.gif --out /tmp/captcha_big.png -z 165 558 2>/dev/null');
        const result = execSync('tesseract /tmp/captcha_big.png stdout --psm 7 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 2>/dev/null', { encoding: 'utf-8' }).trim();
        console.log(`[resized3x] Result: "${result}"`);
    } catch {
        console.log('[resized3x] Failed');
    }

    await browser.close();
}

debugCaptcha();
