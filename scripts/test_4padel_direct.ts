import { chromium } from 'playwright';
import { format } from 'date-fns';

async function test4PadelDirect() {
    console.log("Testing 4PADEL direct website...");
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        let apiResponses = [];

        page.on('response', async (response) => {
            const url = response.url();
            // 4padel usually uses api.resamania.com or their own custom GraphQL / REST API.
            if (url.includes('api') || url.includes('json') || url.includes('search')) {
                if (response.request().method() !== 'OPTIONS' && response.ok()) {
                    try {
                        const json = await response.json();
                        // Filter out analytics
                        if (!url.includes('google') && !url.includes('facebook')) {
                            console.log(`\n✅ INTERCEPTED: ${url}`);
                            console.log(JSON.stringify(json).substring(0, 300) + '...');
                            apiResponses.push({ url, json });
                        }
                    } catch (e) { }
                }
            }
        });

        const d = new Date(Date.now() + 86400000); // Tomorrow
        const formattedDate = format(d, 'yyyy-MM-dd');
        // Let's go to the bordeaux specific page for tomorrow
        const targetUrl = `https://book.4padel.fr/search?location=Bordeaux&date=${formattedDate}`;

        console.log(`Navigating to ${targetUrl}`);

        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

        await page.waitForTimeout(5000); // let APIs load

        console.log(`Intercepted ${apiResponses.length} potential API responses.`);

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

test4PadelDirect();
