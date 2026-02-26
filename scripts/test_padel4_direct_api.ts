import { chromium } from 'playwright';

async function test() {
    const browser = await chromium.launch({ headless: true });
    
    // We add acceptCookies immediately
    const context = await browser.newContext();
    await context.addCookies([
        { name: "acceptGdpr", value: "true", domain: "www.anybuddyapp.com", path: "/" },
        { name: "ab_first_session", value: "1", domain: ".anybuddyapp.com", path: "/" }
    ]);
    const page = await context.newPage();

    let targetToken = "";
    page.on('request', request => {
        if (request.url().includes('api-booking') || request.url().includes('api.anybuddy')) {
            const headers = request.headers();
            if (headers['authorization']) {
                targetToken = headers['authorization'];
            }
        }
    });

    console.log("Navigating to logic page...");
    await page.goto('https://www.anybuddyapp.com/login', { waitUntil: 'domcontentloaded' });
    
    const inputs = page.locator('input');
    await inputs.nth(0).fill('lnyankpg@guerrillamailblock.com');
    await inputs.nth(1).fill('PadelBot!2026');
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.count() > 0) {
        await submitBtn.nth(0).click();
    } else {
        await inputs.nth(1).press('Enter');
    }
    
    await page.waitForTimeout(4000); // login routing

    console.log("Token intercepté ?", targetToken ? "OUI" : "NON");
    
    const urlDate = '24-02-2026';
    const targetUrl = `https://www.anybuddyapp.com/recherche/bordeaux/padel?date=${urlDate}`;
    
    page.on('response', async res => {
        if (res.url().includes('search')) {
            try {
                const data = await res.json();
                if (data.candidates && data.candidates.length > 0) {
                    console.log("FOUND CLUBS:", data.candidates.map((c: any) => c.club.name).join(", "));
                    const padel4 = data.candidates.find(c => c.club.name.toLowerCase().includes('4padel'));
                    if (padel4) {
                        console.log("4PADEL COURTS:", padel4.courts.map(c => c.slots.length).reduce((a, b) => a + b, 0), "slots total");
                    }
                }
            } catch (e) {}
        }
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    await browser.close();
}
test();
