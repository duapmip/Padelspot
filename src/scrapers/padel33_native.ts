/**
 * Padel 33 - Native MatchPoint API Scraper
 * Uses Playwright for auth, then fetches real slot data from MatchPoint API
 */
import { BookingProvider, Slot } from '../types/slot.js';
import { format } from 'date-fns';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

const MATCHPOINT_BASE = 'https://squashbad33-fr.matchpoint.com.es';
const EMAIL = 'padelbot.scraper@gmail.com';
const PASSWORD = 'PadelBot!2026';

// Padel grids on MatchPoint  
const PADEL_GRIDS = [
    { id: 5, name: 'Padel 33 Bordeaux', bookingUrl: 'https://www.padel33.fr' },
    { id: 6, name: 'Padel 33 Gradignan', bookingUrl: 'https://www.padel33.fr' },
    { id: 7, name: 'Padel 33 Mérignac', bookingUrl: 'https://www.padel33.fr' },
    { id: 8, name: 'Padel 33 Bruges', bookingUrl: 'https://www.padel33.fr' },
];

export class Padel33Scraper implements BookingProvider {
    name = 'Padel 33 (MatchPoint)';

    private browser: Browser | null = null;
    private page: Page | null = null;
    private apiKey: string | null = null;
    private lastLoginTime = 0;

    private async ensureLoggedIn(): Promise<{ page: Page; apiKey: string }> {
        const now = Date.now();
        // Re-login every 20 minutes (session could expire)
        if (this.page && this.apiKey && (now - this.lastLoginTime) < 20 * 60 * 1000) {
            return { page: this.page, apiKey: this.apiKey };
        }

        // Close previous browser if any
        if (this.browser) {
            try { await this.browser.close(); } catch { }
        }

        console.log('[Padel33] Logging into MatchPoint...');
        this.browser = await chromium.launch({ headless: true });
        const context = await this.browser.newContext();
        this.page = await context.newPage();

        await this.page.goto(`${MATCHPOINT_BASE}/Login.aspx`, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(2000);

        // Dismiss cookie overlay
        await this.page.evaluate(() => {
            document.querySelectorAll('.banner-block-screen, [class*="banner-block"]').forEach(el => el.remove());
        });
        await this.page.waitForTimeout(500);

        await this.page.fill('#ContentPlaceHolderContenido_Login1_UserName', EMAIL);
        await this.page.fill('#ContentPlaceHolderContenido_Login1_Password', PASSWORD);
        await this.page.click('#ContentPlaceHolderContenido_Login1_LoginButton');
        await this.page.waitForTimeout(3000);

        // Navigate to booking grid to init API key
        await this.page.goto(`${MATCHPOINT_BASE}/Booking/Grid.aspx`, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(3000);

        // Dismiss cookie overlay again
        await this.page.evaluate(() => {
            document.querySelectorAll('.banner-block-screen, [class*="banner-block"]').forEach(el => el.remove());
        });

        this.apiKey = await this.page.evaluate(() => (window as any).hl90njda2b89k || '') as string;

        if (!this.apiKey) {
            throw new Error('[Padel33] Could not get API key after login');
        }

        this.lastLoginTime = now;
        console.log('[Padel33] ✅ Logged in successfully');

        return { page: this.page, apiKey: this.apiKey };
    }

    async fetchSlots(date: Date): Promise<Slot[]> {
        const slots: Slot[] = [];
        const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

        try {
            const { page, apiKey } = await this.ensureLoggedIn();

            for (const grid of PADEL_GRIDS) {
                console.log(`[Padel33] Fetching ${grid.name} on ${dateStr}...`);

                const result = await page.evaluate(async ({ gridId, fecha, key, base }) => {
                    const res = await fetch(`${base}/booking/srvc.aspx/ObtenerCuadro`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idCuadro: gridId, fecha, key })
                    });
                    return await res.json();
                }, { gridId: grid.id, fecha: dateStr, key: apiKey, base: MATCHPOINT_BASE });

                const gridData = result.d;

                if (!gridData?.TieneClienteAcceso || !gridData?.Columnas?.length) {
                    console.log(`[Padel33] ⚠️ ${grid.name}: no access or no courts`);
                    continue;
                }

                let gridSlotCount = 0;

                for (const court of gridData.Columnas) {
                    const courtName = court.TextoPrincipal || `Court ${court.Id}`;
                    const freeSlots = court.HorariosFijos || [];

                    for (const slot of freeSlots) {
                        if (!slot.Clickable) continue; // Skip non-bookable

                        // Parse start/end from timestamps
                        const startTime = new Date(slot.FechaHoraInicio?.match(/\d+/)?.[0] * 1);
                        const endTime = new Date(slot.FechaHoraFin?.match(/\d+/)?.[0] * 1);

                        if (isNaN(startTime.getTime())) continue;

                        slots.push({
                            id: `padel33-${grid.id}-${court.Id}-${slot.Id}`,
                            provider: 'matchpoint',
                            centerName: grid.name,
                            startTime,
                            endTime,
                            durationMinutes: slot.Minutos || 90,
                            price: 0, // MatchPoint doesn't expose price in the API
                            currency: 'EUR',
                            bookingUrl: grid.bookingUrl,
                            courtName,
                            availableCourts: 1,
                            indoor: true,
                        });
                        gridSlotCount++;
                    }
                }

                console.log(`[Padel33] ✅ ${grid.name}: ${gridSlotCount} free slots`);
            }
        } catch (error: any) {
            console.error('[Padel33] Error:', error.message);
            // Reset session on error
            this.apiKey = null;
            this.lastLoginTime = 0;
        }

        return slots;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            this.apiKey = null;
        }
    }
}
