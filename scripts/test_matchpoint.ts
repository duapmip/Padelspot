/**
 * Padel 33 scraper via MatchPoint API
 * Uses Playwright for login, then runs API calls from within the browser context
 */
import { chromium } from 'playwright';

const MATCHPOINT_BASE = 'https://squashbad33-fr.matchpoint.com.es';
const EMAIL = 'padelbot.scraper@gmail.com';
const PASSWORD = 'PadelBot!2026';

const PADEL_GRIDS = [
    { id: 5, name: 'Padel 33 Bordeaux Lac' },
    { id: 6, name: 'Padel 33 Gradignan' },
    { id: 7, name: 'Padel 33 Mérignac' },
    { id: 8, name: 'Padel 33 Bruges' },
];

async function test() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('[MatchPoint] Logging in...');
    await page.goto(`${MATCHPOINT_BASE}/Login.aspx`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Dismiss cookie overlay
    await page.evaluate(() => {
        document.querySelectorAll('.banner-block-screen, [class*="banner-block"]').forEach(el => el.remove());
    });
    await page.waitForTimeout(500);

    await page.fill('#ContentPlaceHolderContenido_Login1_UserName', EMAIL);
    await page.fill('#ContentPlaceHolderContenido_Login1_Password', PASSWORD);
    await page.click('#ContentPlaceHolderContenido_Login1_LoginButton');
    await page.waitForTimeout(3000);

    // Navigate to booking grid
    await page.goto(`${MATCHPOINT_BASE}/Booking/Grid.aspx`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Dismiss cookie overlay again
    await page.evaluate(() => {
        document.querySelectorAll('.banner-block-screen, [class*="banner-block"]').forEach(el => el.remove());
    });

    const apiKey = await page.evaluate(() => (window as any).hl90njda2b89k || '');
    console.log('[MatchPoint] API Key:', apiKey ? 'OK' : 'NOT FOUND');

    if (!apiKey) {
        console.error('No API key.');
        await page.screenshot({ path: '/tmp/matchpoint_debug.png' });
        await browser.close();
        return;
    }

    // Run API calls FROM within the browser context (same session, same cookies)
    const today = new Date();
    const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    console.log(`Fetching slots for ${dateStr}...`);

    for (const grid of PADEL_GRIDS) {
        console.log(`\n--- ${grid.name} (ID: ${grid.id}) ---`);

        const result = await page.evaluate(async ({ gridId, fecha, key, base }) => {
            const res = await fetch(`${base}/booking/srvc.aspx/ObtenerCuadro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idCuadro: gridId, fecha, key })
            });
            return await res.json();
        }, { gridId: grid.id, fecha: dateStr, key: apiKey, base: MATCHPOINT_BASE });

        const gridData = result.d;

        console.log('  TieneClienteAcceso:', gridData?.TieneClienteAcceso);
        console.log('  Columnas:', gridData?.Columnas?.length);
        console.log('  StrFechaMin:', gridData?.StrFechaMin);

        if (!gridData?.Columnas?.length) {
            console.log('  No courts found.');
            continue;
        }

        for (const court of gridData.Columnas) {
            const slots = court.HorariosFijos || [];
            const occupied = court.Ocupaciones || [];
            console.log(`  Court "${court.Nombre}": ${slots.length} slots, ${occupied.length} bookings`);
            for (const s of slots.slice(0, 3)) {
                console.log(`    ${s.StrHoraInicio}-${s.StrHoraFin} | ${s.Precio || '?'}€`);
            }
            if (slots.length > 3) console.log(`    ... +${slots.length - 3} more`);
        }
    }

    await browser.close();
}

test();
