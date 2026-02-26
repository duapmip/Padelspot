import { chromium } from 'playwright';

async function test4Padel() {
    console.log("Starting Playwright for 4PADEL...");
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Listen for all API requests to see the resamania calls
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('resamania') || url.includes('api')) {
                console.log(`Intercepted API Response: ${url} - Status: ${response.status()}`);
                if (url.includes('plannings') || url.includes('slots') || url.includes('activities')) {
                    try {
                        const json = await response.json();
                        console.log(`Response JSON for ${url}:`, JSON.stringify(json).substring(0, 500));
                    } catch (e) {
                        // ignore non-json
                    }
                }
            }
        });

        const url = 'https://4padel.fr/nos-centres/2/bordeaux';
        console.log(`Navigating to ${url}`);

        await page.goto(url, { waitUntil: 'load', timeout: 30000 });

        console.log("Waiting for network idle...");
        await page.waitForTimeout(10000);
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

test4Padel();
