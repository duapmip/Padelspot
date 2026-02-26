/**
 * Padel House - Native Gestion Sports API Scraper
 * Handles authentication via Playwright and fetches slots directly from Gestion Sports API
 */
import { BookingProvider, Slot } from '../types/slot.js';
import { chromium, Browser, Page } from 'playwright';

const BASE_URL = 'https://padelhousefrance.gestion-sports.com';
const EMAIL = 'astin.jotham@minuteafter.com';
const PASSWORD = 'Test123';
const PADEL_SPORT_ID = 832;

export class PadelHouseScraper implements BookingProvider {
    name = 'Padel House (Cenon)';

    private browser: Browser | null = null;
    private userId: string | null = null;
    private xsrf: string | null = null;
    private clubId: string | null = null;
    private page: Page | null = null;
    private lastLoginTime = 0;

    private async ensureLoggedIn(): Promise<void> {
        const now = Date.now();
        // Re-login every 30 minutes
        if (this.page && this.userId && this.xsrf && (now - this.lastLoginTime) < 30 * 60 * 1000) {
            return;
        }

        if (this.browser) {
            try { await this.browser.close(); } catch { }
        }

        console.log('[PadelHouse] Logging into Gestion Sports...');
        this.browser = await chromium.launch({ headless: true });
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
        this.page = await context.newPage();

        await this.page.goto(`${BASE_URL}/connexion.php`, { waitUntil: 'networkidle' });

        // Email
        await this.page.fill('input[name="email"]', EMAIL);
        await this.page.click('button:has-text("Connexion / Inscription")');
        await this.page.waitForTimeout(2000);

        // Password
        await this.page.fill('input[name="pass"]', PASSWORD);
        await pageClick(this.page, 'button.step-2_co, button:has-text("Se connecter")');
        await this.page.waitForTimeout(5000);

        // Handle possible "Session active" or welcome modals
        if (await this.page.isVisible('button:has-text("Continuer")')) {
            await this.page.click('button:has-text("Continuer")');
            await this.page.waitForTimeout(3000);
        }

        // Navigate to Reservation to ensure tokens are in storage
        await this.page.goto(`${BASE_URL}/appli/Reservation`, { waitUntil: 'networkidle' });
        await this.page.waitForTimeout(5000);

        const tokens = await this.page.evaluate(() => {
            return {
                userId: localStorage.getItem('idUser'),
                clubId: localStorage.getItem('idClub'),
                xsrf: localStorage.getItem('csrf_token'),
            };
        });

        if (!tokens.userId || !tokens.xsrf) {
            throw new Error('[PadelHouse] Login failed or tokens not found');
        }

        this.userId = tokens.userId;
        this.clubId = tokens.clubId || '291';
        this.xsrf = tokens.xsrf;
        this.lastLoginTime = now;
        console.log('[PadelHouse] ✅ Logged in successfully');
    }

    async fetchSlots(date: Date): Promise<Slot[]> {
        const slots: Slot[] = [];
        const dateStr = date.toISOString().split('T')[0];

        try {
            await this.ensureLoggedIn();
            if (!this.page) return [];

            console.log(`[PadelHouse] Fetching slots for ${dateStr}...`);

            const result = await this.page.evaluate(async ({ dateStr, userId, clubId, xsrf, sportId }) => {
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
                            idSport: sportId,
                            subjectUserId: parseInt(userId),
                            targetClubId: parseInt(clubId)
                        }
                    })
                });
                return await res.json();
            }, { dateStr, userId: this.userId!, clubId: this.clubId!, xsrf: this.xsrf!, sportId: PADEL_SPORT_ID });

            // The API returns an object where keys are court IDs
            const courtsData = result;
            if (!courtsData || typeof courtsData !== 'object' || courtsData.error) {
                console.error('[PadelHouse] API error or no data');
                return [];
            }

            for (const courtId in courtsData) {
                const court = courtsData[courtId];
                if (!court.slotsAvailable) continue;

                for (const slotRaw of court.slotsAvailable) {
                    // dateTimeStart format: "2026-02-25 15:00:00"
                    const startTime = new Date(slotRaw.dateTimeStart.replace(' ', 'T'));

                    for (const duration of slotRaw.durations) {
                        const endTime = new Date(startTime.getTime() + duration * 60000);

                        slots.push({
                            id: `padelhouse-${courtId}-${startTime.getTime()}-${duration}`,
                            provider: 'gestion-sports',
                            centerName: this.name,
                            startTime,
                            endTime,
                            durationMinutes: duration,
                            price: 0, // Prices are not directly in this simplified slot object, usually fixed per club
                            currency: 'EUR',
                            bookingUrl: 'https://padelhousefrance.gestion-sports.com/appli/Reservation',
                            courtName: court.name,
                            availableCourts: 1, // We get data per court
                            indoor: court.type === 'indoor',
                        });
                    }
                }
            }

            console.log(`[PadelHouse] ✅ ${slots.length} raw slots found (before aggregation)`);
        } catch (error: any) {
            console.error('[PadelHouse] Error:', error.message);
            this.xsrf = null; // Force re-login on error
        }

        return slots;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
}

async function pageClick(page: Page, selector: string) {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible' });
    await el.click();
}
