import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { format, addDays } from 'date-fns';

async function testAnybuddy() {
    console.log("Starting Playwright to test Anybuddy...");
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        const date = addDays(new Date(), 1);
        const formattedDate = format(date, 'dd-MM-yyyy');
        const url = `https://www.anybuddyapp.com/recherche/bordeaux/padel?time=18:00&date=${formattedDate}`;

        console.log(`Navigating to ${url}`);

        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        console.log("Page loaded. Waiting for network idle or 5 seconds...");
        await page.waitForTimeout(5000); // give it time to load data

        // Grab the page HTML
        const html = await page.content();
        if (html.includes("3d padel") || html.includes("3D Padel") || html.includes("Padel House") || html.includes("4PADEL")) {
            console.log("Found clubs in HTML!");
        } else {
            console.log("Could not find clubs in HTML easily.");
        }

        // Try to select club headers/names
        const clubs = await page.evaluate(() => {
            const results = [];
            // This is a guess on Anybuddy's DOM structure
            const elements = document.querySelectorAll('div, a, span, h2, h3');
            for (const el of elements) {
                if (el.textContent && (el.textContent.includes('3D Padel') || el.textContent.includes('4PADEL'))) {
                    results.push(el.textContent.trim());
                }
            }
            return results;
        });

        console.log("Elements mentioning our target clubs:", [...new Set(clubs)]);

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

testAnybuddy();
