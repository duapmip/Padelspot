/**
 * Debug: dump full structure of one Padel 33 grid
 */
import { chromium } from 'playwright';

const MATCHPOINT_BASE = 'https://squashbad33-fr.matchpoint.com.es';
const EMAIL = 'padelbot.scraper@gmail.com';
const PASSWORD = 'PadelBot!2026';

async function debug() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${MATCHPOINT_BASE}/Login.aspx`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
        document.querySelectorAll('.banner-block-screen, [class*="banner-block"]').forEach(el => el.remove());
    });
    await page.fill('#ContentPlaceHolderContenido_Login1_UserName', EMAIL);
    await page.fill('#ContentPlaceHolderContenido_Login1_Password', PASSWORD);
    await page.click('#ContentPlaceHolderContenido_Login1_LoginButton');
    await page.waitForTimeout(3000);
    await page.goto(`${MATCHPOINT_BASE}/Booking/Grid.aspx`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
        document.querySelectorAll('.banner-block-screen, [class*="banner-block"]').forEach(el => el.remove());
    });

    const apiKey = await page.evaluate(() => (window as any).hl90njda2b89k || '');

    // Fetch Bordeaux Lac grid and dump first court fully
    const result = await page.evaluate(async ({ key, base }) => {
        const res = await fetch(`${base}/booking/srvc.aspx/ObtenerCuadro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idCuadro: 5, fecha: '25/2/2026', key })
        });
        return await res.json();
    }, { key: apiKey, base: MATCHPOINT_BASE });

    const gridData = result.d;

    // Top level keys
    console.log('=== Grid top-level info ===');
    console.log('StrHoraInicio:', gridData.StrHoraInicio);
    console.log('StrHoraFin:', gridData.StrHoraFin);
    console.log('PartesPorHora:', gridData.PartesPorHora);

    // First court structure
    if (gridData.Columnas?.length > 0) {
        const court = gridData.Columnas[0];
        console.log('\n=== First Court Structure ===');
        console.log('Keys:', Object.keys(court).join(', '));
        // Print all properties of the court
        for (const [k, v] of Object.entries(court)) {
            if (Array.isArray(v)) {
                console.log(`${k}: [${v.length} items]`);
                if (v.length > 0) {
                    console.log('  First item keys:', Object.keys(v[0]).join(', '));
                    console.log('  First item:', JSON.stringify(v[0]).substring(0, 500));
                }
            } else {
                console.log(`${k}: ${JSON.stringify(v)}`);
            }
        }
    }

    await browser.close();
}

debug();
