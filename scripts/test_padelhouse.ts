/**
 * Test Padel House Gestion Sports API
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://padelhousefrance.gestion-sports.com';
const EMAIL = 'astin.jotham@minuteafter.com';
const PASSWORD = 'Test123';

async function test() {
    console.log('[PadelHouse] Starting browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        console.log('[PadelHouse] Logging in...');
        await page.goto(`${BASE_URL}/connexion.php`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // Step 1: Email
        console.log('[PadelHouse] Filling email...');
        await page.fill('input[name="email"]', EMAIL);
        await page.click('button:has-text("Connexion / Inscription")');
        await page.waitForTimeout(2000);

        // Step 2: Password
        console.log('[PadelHouse] Filling password...');
        await page.fill('input[name="pass"]', PASSWORD);
        await page.click('button.step-2_co, button:has-text("Se connecter")');
        await page.waitForTimeout(5000);

        // Handle "Session active" or welcome modals
        if (await page.isVisible('button:has-text("Continuer")')) {
            console.log('[PadelHouse] Clicking "Continuer"...');
            await page.click('button:has-text("Continuer")');
            await page.waitForTimeout(3000);
        }

        // Check login success
        if (page.url().includes('appli')) {
            console.log('[PadelHouse] ✅ Login successful');
        } else {
            console.log('[PadelHouse] ❌ Login failed, current URL:', page.url());
            const error = await page.innerText('.alert-danger').catch(() => 'No error message');
            console.log('[PadelHouse] Error detail:', error);
            return;
        }

        // Step 3: Navigate to Reservation to init context
        console.log('[PadelHouse] Navigating to Reservation...');
        await page.goto(`${BASE_URL}/appli/Reservation`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);

        // Fetch slots for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        console.log(`[PadelHouse] Fetching slots for ${dateStr}...`);

        const state = await page.evaluate(() => {
            return {
                userId: localStorage.getItem('idUser'),
                clubId: localStorage.getItem('idClub'),
                xsrf: localStorage.getItem('csrf_token'),
            };
        });
        console.log('[PadelHouse] Resolved Tokens:', state);

        const result = await page.evaluate(async ({ dateStr }) => {
            const userId = localStorage.getItem('idUser');
            const clubId = localStorage.getItem('idClub') || '291';
            const xsrf = localStorage.getItem('csrf_token');

            if (!userId || !xsrf) {
                return { success: false, error: 'Still missing tokens' };
            }

            const res = await fetch('/gs-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': xsrf,
                    'X-USER-ID': userId,
                    'X-CLUB-ID': clubId
                },
                body: JSON.stringify({
                    event: "reservationManager.getAvailableSlotsForDay",
                    args: {
                        day: dateStr,
                        idSport: 832,
                        subjectUserId: parseInt(userId),
                        targetClubId: parseInt(clubId)
                    }
                })
            });
            return await res.json();
        }, { dateStr });

        if (result.success && result.data) {
            console.log('[PadelHouse] ✅ API response received');
            const courts = result.data;
            for (const courtId in courts) {
                const court = courts[courtId];
                console.log(`📍 ${court.name} (${court.type}) - ${court.slotsAvailable?.length || 0} slots`);
                if (court.slotsAvailable?.length > 0) {
                    console.log(`   Sample: ${court.slotsAvailable[0].timeStart} duration: ${court.slotsAvailable[0].durations.join(',')}`);
                }
            }
        } else {
            console.log('[PadelHouse] ❌ API call failed:', JSON.stringify(result).substring(0, 200));
        }

    } catch (e: any) {
        console.error('[PadelHouse] Error:', e.message);
    } finally {
        await browser.close();
    }
}

test();
