/**
 * Auto-register a bot account on MatchPoint (Padel 33 Bordeaux)
 * Uses Playwright + Tesseract OCR to solve the simple text captcha
 */
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SIGNUP_URL = 'https://squashbad33-fr.matchpoint.com.es/Signup.aspx';
const BOT_EMAIL = 'padelbot.scraper@gmail.com';
const BOT_PASSWORD = 'PadelBot!2026';

async function solveCaptcha(base64Data: string): Promise<string> {
    const pureBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(pureBase64, 'base64');
    const tmpPath = '/tmp/captcha_matchpoint.png';
    writeFileSync(tmpPath, imgBuffer);

    try {
        const result = execSync(
            `tesseract ${tmpPath} stdout --psm 7 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 2>/dev/null`,
            { encoding: 'utf-8' }
        ).trim();
        console.log(`[OCR] Captcha read: "${result}"`);
        return result;
    } catch {
        try {
            const result = execSync(`tesseract ${tmpPath} stdout --psm 8 2>/dev/null`, { encoding: 'utf-8' }).trim();
            console.log(`[OCR] Captcha (fallback): "${result}"`);
            return result;
        } catch {
            return '';
        }
    }
}

async function register() {
    console.log('[MatchPoint] Starting registration...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    for (let attempt = 1; attempt <= 5; attempt++) {
        console.log(`\n=== Attempt ${attempt}/5 ===`);

        await page.goto(SIGNUP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        try {
            // Prénom
            await page.fill('#ContentPlaceHolderContenido_TextBoxNombre', 'Padel');
            // Nom
            await page.fill('#ContentPlaceHolderContenido_TextBoxApellido1', 'Bot');

            // Date de naissance
            await page.selectOption('#ContentPlaceHolderContenido_DropDownListFechaNacimientoCampo1', '15');
            await page.selectOption('#ContentPlaceHolderContenido_DropDownListFechaNacimientoCampo2', '6');
            await page.selectOption('#ContentPlaceHolderContenido_DropDownListFechaNacimientoCampo3', '1990');

            // Sexe
            await page.selectOption('#ContentPlaceHolderContenido_DropDownListSexo', 'hombre');

            // Email + confirmation
            await page.fill('#ContentPlaceHolderContenido_TextBoxEmail', BOT_EMAIL);
            const confirmEmail = page.locator('#ContentPlaceHolderContenido_TextBoxConfirmacionEmail');
            if (await confirmEmail.isVisible().catch(() => false)) {
                await confirmEmail.fill(BOT_EMAIL);
            }

            // Mobile
            const mobileInput = page.locator('#ContentPlaceHolderContenido_TextBoxMovil');
            if (await mobileInput.isVisible().catch(() => false)) {
                await mobileInput.fill('0612345678');
            }

            // Code postal
            const cpInput = page.locator('#ContentPlaceHolderContenido_TextBoxCP');
            if (await cpInput.isVisible().catch(() => false)) {
                await cpInput.fill('33000');
            }

            // Ville
            const villeInput = page.locator('#ContentPlaceHolderContenido_TextBoxPoblacion');
            if (await villeInput.isVisible().catch(() => false)) {
                await villeInput.fill('Bordeaux');
            }

            // Mot de passe
            await page.fill('#ContentPlaceHolderContenido_TextBoxPassword1', BOT_PASSWORD);
            await page.fill('#ContentPlaceHolderContenido_TextBoxPassword2', BOT_PASSWORD);

            // Privacy checkbox (hidden, use JS)
            await page.evaluate(() => {
                const cb = document.getElementById('ContentPlaceHolderContenido_CheckBoxPrivacidad') as HTMLInputElement;
                if (cb) cb.checked = true;
            });

            // Solve captcha
            const captchaImg = page.locator('#imgCaptcha');
            if (await captchaImg.count() > 0) {
                const src = await captchaImg.getAttribute('src');
                if (src) {
                    const captchaText = await solveCaptcha(src);
                    if (!captchaText || captchaText.length < 3) {
                        console.log(`[OCR] Captcha too short ("${captchaText}"), retrying...`);
                        continue;
                    }
                    await page.fill('#txtVerificationCode', captchaText);
                }
            }

            await page.waitForTimeout(500);

            // Submit
            await page.click('#ContentPlaceHolderContenido_ButtonEnviar');
            await page.waitForTimeout(4000);

        } catch (e: any) {
            console.log(`Form error: ${e.message?.substring(0, 100)}`);
            await page.screenshot({ path: `/tmp/matchpoint_error_${attempt}.png` });
            continue;
        }

        // Check result
        const bodyText = await page.textContent('body') || '';
        const url = page.url();
        console.log('URL after submit:', url);

        if (url.includes('Login') || url.includes('login') || bodyText.includes('enregistré') || bodyText.includes('créé') || bodyText.includes('information envoyée')) {
            console.log('✅ Registration SUCCESS!');
            console.log(`Email: ${BOT_EMAIL}`);
            console.log(`Password: ${BOT_PASSWORD}`);
            await browser.close();
            return true;
        }

        if (bodyText.includes('existe') || bodyText.includes('already')) {
            console.log('ℹ️ Account already exists!');
            await browser.close();
            return true;
        }

        await page.screenshot({ path: `/tmp/matchpoint_attempt_${attempt}.png` });

        const errorLabels = await page.locator('.LabelError, .error, [style*="color:red"], [style*="color: red"]').allTextContents();
        if (errorLabels.length > 0) {
            console.log('Errors:', errorLabels.join(' | '));
        }

        console.log('❌ Attempt failed, retrying...');
    }

    console.log('❌ All 5 attempts failed.');
    await browser.close();
    return false;
}

register().then(success => {
    process.exit(success ? 0 : 1);
});
