/**
 * Auto-register on MatchPoint using browser agent for captcha solving.
 * The browser agent can visually read the captcha.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const SIGNUP_URL = 'https://squashbad33-fr.matchpoint.com.es/Signup.aspx';
const BOT_EMAIL = 'padelbot.scraper@gmail.com';
const BOT_PASSWORD = 'PadelBot!2026';

async function fillForm() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(SIGNUP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Fill all fields
    await page.fill('#ContentPlaceHolderContenido_TextBoxNombre', 'Padel');
    await page.fill('#ContentPlaceHolderContenido_TextBoxApellido1', 'Bot');
    await page.selectOption('#ContentPlaceHolderContenido_DropDownListFechaNacimientoCampo1', '15');
    await page.selectOption('#ContentPlaceHolderContenido_DropDownListFechaNacimientoCampo2', '6');
    await page.selectOption('#ContentPlaceHolderContenido_DropDownListFechaNacimientoCampo3', '1990');
    await page.selectOption('#ContentPlaceHolderContenido_DropDownListSexo', 'hombre');
    await page.fill('#ContentPlaceHolderContenido_TextBoxEmail', BOT_EMAIL);

    const confirmEmail = page.locator('#ContentPlaceHolderContenido_TextBoxConfirmacionEmail');
    if (await confirmEmail.isVisible().catch(() => false)) await confirmEmail.fill(BOT_EMAIL);

    const mobile = page.locator('#ContentPlaceHolderContenido_TextBoxMovil');
    if (await mobile.isVisible().catch(() => false)) await mobile.fill('0612345678');

    const cp = page.locator('#ContentPlaceHolderContenido_TextBoxCP');
    if (await cp.isVisible().catch(() => false)) await cp.fill('33000');

    const ville = page.locator('#ContentPlaceHolderContenido_TextBoxPoblacion');
    if (await ville.isVisible().catch(() => false)) await ville.fill('Bordeaux');

    await page.fill('#ContentPlaceHolderContenido_TextBoxPassword1', BOT_PASSWORD);
    await page.fill('#ContentPlaceHolderContenido_TextBoxPassword2', BOT_PASSWORD);

    // Privacy checkbox via JS
    await page.evaluate(() => {
        const cb = document.getElementById('ContentPlaceHolderContenido_CheckBoxPrivacidad') as HTMLInputElement;
        if (cb) cb.checked = true;
    });

    // Extract captcha as standalone image file
    const src = await page.locator('#imgCaptcha').getAttribute('src');
    if (src) {
        const pureBase64 = src.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(pureBase64, 'base64');
        writeFileSync('/tmp/captcha_to_solve.png', imgBuffer);
        console.log('CAPTCHA_IMAGE_SAVED:/tmp/captcha_to_solve.png');
    }

    // Take screenshot of the full form for context
    await page.screenshot({ path: '/tmp/matchpoint_form_ready.png', fullPage: true });
    console.log('FORM_READY:/tmp/matchpoint_form_ready.png');

    // Keep browser open - we'll come back to fill captcha and submit
    // Save cookies/state
    const cookies = await page.context().cookies();
    writeFileSync('/tmp/matchpoint_cookies.json', JSON.stringify(cookies));

    // Save the page URL for re-use
    console.log('URL:', page.url());

    await browser.close();
}

fillForm();
