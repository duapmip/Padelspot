import axios from 'axios';
import { BookingProvider, Slot } from '../types/slot.js';

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

    private apiKey: string | null = null;
    private sessionCookie: string | null = null;
    private lastLoginTime = 0;

    private async ensureLoggedIn(): Promise<{ sessionCookie: string; apiKey: string }> {
        const now = Date.now();
        // Re-login every 20 minutes (session could expire)
        if (this.sessionCookie && this.apiKey && (now - this.lastLoginTime) < 20 * 60 * 1000) {
            return { sessionCookie: this.sessionCookie, apiKey: this.apiKey };
        }

        console.log('[Padel33] Logging into MatchPoint via API...');

        try {
            // 1. Get initial cookies and view states
            const initRes = await axios.get(`${MATCHPOINT_BASE}/Login.aspx`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                validateStatus: () => true
            });
            const setCookie = initRes.headers['set-cookie'] || [];
            const initCookieStr = setCookie.map((c: string) => c.split(';')[0]).join('; ');

            // Extract tokens
            const viewStateMatch = initRes.data.match(/id="__VIEWSTATE"\s+value="([^"]+)"/);
            const viewStateGenMatch = initRes.data.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/);
            const eventValMatch = initRes.data.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/);

            const params = new URLSearchParams();
            if (viewStateMatch) params.append('__VIEWSTATE', viewStateMatch[1]);
            if (viewStateGenMatch) params.append('__VIEWSTATEGENERATOR', viewStateGenMatch[1]);
            if (eventValMatch) params.append('__EVENTVALIDATION', eventValMatch[1]);

            params.append('ctl00$ContentPlaceHolderContenido$Login1$UserName', EMAIL);
            params.append('ctl00$ContentPlaceHolderContenido$Login1$Password', PASSWORD);
            params.append('ctl00$ContentPlaceHolderContenido$Login1$LoginButton', 'Connexion');

            // 2. Perform Login POST
            const postRes = await axios.post(`${MATCHPOINT_BASE}/Login.aspx`, params, {
                headers: {
                    'Cookie': initCookieStr,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0'
                },
                maxRedirects: 0,
                validateStatus: () => true
            });

            // Update cookies
            const loginCookies = postRes.headers['set-cookie'] || [];
            const allCookiesStr = [...setCookie, ...loginCookies].map((c: string) => c.split(';')[0]).join('; ');

            // 3. Fetch Grid page to get API Key
            const gridRes = await axios.get(`${MATCHPOINT_BASE}/Booking/Grid.aspx`, {
                headers: {
                    'Cookie': allCookiesStr,
                    'User-Agent': 'Mozilla/5.0'
                },
                validateStatus: () => true
            });

            const keyMatch = gridRes.data.match(/hl90njda2b89k='([^']+)'/);
            if (!keyMatch) {
                throw new Error('[Padel33] Could not extract API Key from Grid.aspx');
            }

            this.apiKey = keyMatch[1];
            this.sessionCookie = allCookiesStr;
            this.lastLoginTime = now;
            console.log('[Padel33] ✅ Logged in successfully via API');

            return { sessionCookie: this.sessionCookie!, apiKey: this.apiKey! };

        } catch (error: any) {
            console.error('[Padel33] Login error:', error.message);
            throw error;
        }
    }

    async fetchSlots(date: Date): Promise<Slot[]> {
        const slots: Slot[] = [];
        const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

        try {
            const { sessionCookie, apiKey } = await this.ensureLoggedIn();

            for (const grid of PADEL_GRIDS) {
                console.log(`[Padel33] Fetching ${grid.name} on ${dateStr}...`);

                const res = await axios.post(`${MATCHPOINT_BASE}/booking/srvc.aspx/ObtenerCuadro`, {
                    idCuadro: grid.id,
                    fecha: dateStr,
                    key: apiKey
                }, {
                    headers: {
                        'Cookie': sessionCookie,
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0'
                    }
                });

                const gridData = res.data?.d;

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

                        const durationMinutes = slot.Minutos || 90;

                        // Padel 33 Pricing (based on 4 pax)
                        // Off-peak: 4€/pax/30min (48€ per 90m court). Mon-Fri 10:30-12:00 & 14:00-17:00
                        // Peak: 5€/pax/30min (60€ per 90m court). Mon-Fri 12-14h, 17h-closing, and weekends all day
                        let price = 60; // Default to Peak 
                        const dayOfWeek = startTime.getDay();
                        const hour = startTime.getHours();
                        const minute = startTime.getMinutes();
                        const timeInMins = hour * 60 + minute;

                        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                            // Weekday
                            // Off-peak 10:30 (630) to 12:00 (720) AND 14:00 (840) to 17:00 (1020)
                            if ((timeInMins >= 630 && timeInMins < 720) || (timeInMins >= 840 && timeInMins < 1020)) {
                                price = 48;
                            }
                        }

                        // Adjust if not exactly 90 mins (API sometimes outputs 60 or 120)
                        if (durationMinutes !== 90) {
                            price = (price / 90) * durationMinutes;
                        }

                        slots.push({
                            id: `padel33-${grid.id}-${court.Id}-${slot.Id}`,
                            provider: 'matchpoint',
                            centerName: grid.name,
                            startTime,
                            endTime,
                            durationMinutes,
                            price,
                            currency: 'EUR',
                            bookingUrl: grid.bookingUrl,
                            courtName,
                            availableCourts: 1,
                            indoor: true, // Typical assumption built earlier
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
            this.sessionCookie = null;
        }

        return slots;
    }

    async close() {
        // Nothing to close for Axios
    }
}
