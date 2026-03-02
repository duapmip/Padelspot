import axios from 'axios';
const BASE_URL = 'https://padelhousefrance.gestion-sports.com';
const EMAIL = 'astin.jotham@minuteafter.com';
const PASSWORD = 'Test123';
const PADEL_SPORT_ID = 832;
export class PadelHouseScraper {
    name = 'Padel House (Cenon)';
    userId = null;
    xsrf = null;
    clubId = '291';
    sessionCookie = null;
    lastLoginTime = 0;
    async ensureLoggedIn() {
        const now = Date.now();
        // Re-login every 30 minutes
        if (this.userId && this.xsrf && this.sessionCookie && (now - this.lastLoginTime) < 30 * 60 * 1000) {
            return;
        }
        console.log('[PadelHouse] Logging into Gestion Sports via API...');
        try {
            // 1. Get initial session cookies
            const initRes = await axios.get(`${BASE_URL}/connexion.php`, {
                validateStatus: () => true
            });
            const initCookies = initRes.headers['set-cookie'] || [];
            const initCookieStr = initCookies.map((c) => c.split(';')[0]).join('; ');
            // 2. Perform Ajax Login
            const params = new URLSearchParams();
            params.append('ajax', 'connexionUser');
            params.append('id_club', this.clubId);
            params.append('email', EMAIL);
            params.append('form_ajax', '1');
            params.append('pass', PASSWORD);
            params.append('compte', 'user');
            params.append('playeridonesignal', '0');
            params.append('identifiant', 'identifiant');
            params.append('externCo', 'true');
            const postRes = await axios.post(`${BASE_URL}/traitement/connexion.php`, params, {
                headers: {
                    'Cookie': initCookieStr,
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Origin': BASE_URL,
                    'Referer': `${BASE_URL}/connexion.php`
                },
                validateStatus: () => true
            });
            if (postRes.data?.status !== 'ok') {
                throw new Error('[PadelHouse] API login failed: ' + JSON.stringify(postRes.data));
            }
            // 3. Extract tokens from cookies
            const loginCookies = postRes.headers['set-cookie'] || [];
            const allCookiesStr = [...initCookies, ...loginCookies].map((c) => c.split(';')[0]).join('; ');
            const csrfTokenCookie = loginCookies.find((c) => c.startsWith('CSRF_TOKEN='));
            if (csrfTokenCookie)
                this.xsrf = csrfTokenCookie.split(';')[0].split('=')[1];
            const cookUserCookie = loginCookies.find((c) => c.startsWith('COOK_USER='));
            if (cookUserCookie) {
                const rawJson = decodeURIComponent(cookUserCookie.split(';')[0].split('=')[1]);
                const parsed = JSON.parse(rawJson);
                this.userId = parsed.idUser?.toString();
            }
            if (!this.userId || !this.xsrf) {
                throw new Error('[PadelHouse] Failed to extract tokens from cookies');
            }
            this.sessionCookie = allCookiesStr;
            this.lastLoginTime = now;
            console.log('[PadelHouse] ✅ Logged in successfully via API');
        }
        catch (error) {
            console.error('[PadelHouse] Login error:', error.message);
            throw error;
        }
    }
    async fetchSlots(date) {
        const slots = [];
        const dateStr = date.toISOString().split('T')[0];
        try {
            await this.ensureLoggedIn();
            console.log(`[PadelHouse] Fetching slots for ${dateStr}...`);
            const res = await axios.post(`${BASE_URL}/gs-api`, {
                event: "reservationManager.getAvailableSlotsForDay",
                args: {
                    day: dateStr,
                    idSport: PADEL_SPORT_ID,
                    subjectUserId: parseInt(this.userId),
                    targetClubId: parseInt(this.clubId)
                }
            }, {
                headers: {
                    'Cookie': this.sessionCookie,
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': this.xsrf,
                    'X-USER-ID': this.userId,
                    'X-CLUB-ID': this.clubId
                }
            });
            // The API returns an object where keys are court IDs
            const courtsData = res.data;
            if (!courtsData || typeof courtsData !== 'object' || courtsData.error) {
                console.error('[PadelHouse] API error or no data');
                return [];
            }
            for (const courtId in courtsData) {
                const court = courtsData[courtId];
                if (!court.slotsAvailable)
                    continue;
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
        }
        catch (error) {
            console.error('[PadelHouse] Error:', error.message);
            this.xsrf = null; // Force re-login on error
        }
        return slots;
    }
    async close() {
        // Nothing to close for Axios
    }
}
