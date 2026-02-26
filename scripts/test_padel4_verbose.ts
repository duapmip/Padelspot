import { chromium } from 'playwright';

async function test() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('response', async res => {
        if (res.url().includes('login') || res.url().includes('auth')) {
            console.log("LOGIN API:", res.url());
            if (res.request().method() === 'POST') {
                try {
                    console.log("PAYLOAD:", res.request().postData());
                    const json = await res.json();
                    console.log("RESPONSE:", JSON.stringify(json).substring(0, 500));
                } catch (e) { }
            }
        }
    });

    console.log("Logging in...");
    await page.goto('https://www.anybuddyapp.com/login', { waitUntil: 'domcontentloaded' });

    // Bypass cookie modal
    try {
        const axeptioBtn = page.locator('button:has-text("OK pour moi")');
        if (await axeptioBtn.count() > 0) {
            await axeptioBtn.nth(0).click();
        }
    } catch (e) { }

    const inputs = page.locator('input');
    await inputs.nth(0).fill('lnyankpg@guerrillamailblock.com');
    await inputs.nth(1).fill('PadelBot!2026');

    await inputs.nth(1).press('Enter');

    await page.waitForTimeout(5000);

    await browser.close();
}
test();
