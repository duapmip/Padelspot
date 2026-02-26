import { chromium } from 'playwright';
import { format } from 'date-fns';

async function testFetchBordeauxAnybuddy() {
    console.log("Testing Front-End Scraping Bordeaux for Anybuddy...");
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        // On écoute le réseau
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('api-booking') && url.includes('search')) {
                try {
                    const json = await response.json();
                    console.log(`\n--- ANYBUDDY API SEARCH (Intercepted) ---`);
                    console.log(JSON.stringify(json).substring(0, 1000));
                } catch (e) { }
            }
        });

        // Date de demain
        const dateStr = format(new Date(Date.now() + 86400000), 'dd-MM-yyyy');
        const searchUrl = `https://www.anybuddyapp.com/recherche/bordeaux/padel?date=${dateStr}`;

        console.log(`Navigating to ${searchUrl}...`);

        // On n'attend pas "networkidle" car Anybuddy charge des trucs en continu, on attend le "domcontentloaded"
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        console.log("Waiting for slots to appear on screen...");
        // On attend que Anybuddy fasse le rendu des résultats de recherche Padel
        await page.waitForTimeout(10000);

    } catch (e) {
        console.error("Error: ", e);
    } finally {
        await browser.close();
    }
}

testFetchBordeauxAnybuddy();
