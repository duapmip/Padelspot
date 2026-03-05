import axios from 'axios';
export class GestionSportsScraper {
    name;
    config;
    // Shared state per instance (or per club)
    userId = null;
    xsrf = null;
    sessionCookie = null;
    lastLoginTime = 0;
    constructor(config) {
        this.name = config.name;
        this.config = config;
    }
    async ensureLoggedIn() {
        const now = Date.now();
        if (this.userId && this.xsrf && this.sessionCookie && (now - this.lastLoginTime) < 30 * 60 * 1000) {
            return;
        }
        console.log(`[GestionSports] Logging into ${this.name} (${this.config.baseUrl})...`);
        try {
            const initRes = await axios.get(`${this.config.baseUrl}/connexion.php`, {
                validateStatus: () => true
            });
            const initCookies = initRes.headers['set-cookie'] || [];
            const initCookieStr = initCookies.map((c) => c.split(';')[0]).join('; ');
            const params = new URLSearchParams();
            params.append('ajax', 'connexionUser');
            params.append('id_club', this.config.clubId);
            params.append('email', this.config.email);
            params.append('form_ajax', '1');
            params.append('pass', this.config.pass);
            params.append('compte', 'user');
            params.append('playeridonesignal', '0');
            params.append('identifiant', 'identifiant');
            params.append('externCo', 'true');
            const postRes = await axios.post(`${this.config.baseUrl}/traitement/connexion.php`, params, {
                headers: {
                    'Cookie': initCookieStr,
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Origin': this.config.baseUrl,
                    'Referer': `${this.config.baseUrl}/connexion.php`
                },
                validateStatus: () => true
            });
            if (postRes.data?.status !== 'ok') {
                throw new Error(`API login failed for ${this.name}: ` + JSON.stringify(postRes.data));
            }
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
                throw new Error(`Failed to extract tokens from cookies for ${this.name}`);
            }
            this.sessionCookie = allCookiesStr;
            this.lastLoginTime = now;
            console.log(`[GestionSports] ✅ Logged in to ${this.name}`);
        }
        catch (error) {
            console.error(`[GestionSports] Login error for ${this.name}:`, error.message);
            throw error;
        }
    }
    async fetchSlots(date) {
        const slots = [];
        const dateStr = date.toISOString().split('T')[0];
        try {
            await this.ensureLoggedIn();
            const res = await axios.post(`${this.config.baseUrl}/gs-api`, {
                event: "reservationManager.getAvailableSlotsForDay",
                args: {
                    day: dateStr,
                    idSport: this.config.sportId,
                    subjectUserId: parseInt(this.userId),
                    targetClubId: parseInt(this.config.clubId)
                }
            }, {
                headers: {
                    'Cookie': this.sessionCookie,
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': this.xsrf,
                    'X-USER-ID': this.userId,
                    'X-CLUB-ID': this.config.clubId
                }
            });
            const courtsData = res.data;
            if (!courtsData || typeof courtsData !== 'object' || courtsData.error)
                return [];
            for (const courtId in courtsData) {
                const court = courtsData[courtId];
                if (!court.slotsAvailable)
                    continue;
                for (const slotRaw of court.slotsAvailable) {
                    const startTime = new Date(slotRaw.dateTimeStart.replace(' ', 'T'));
                    for (const duration of slotRaw.durations) {
                        const endTime = new Date(startTime.getTime() + duration * 60000);
                        // Price calculation based on known club rates
                        // GS API does not return prices, so we use best-known rates
                        let price = null;
                        const hour = startTime.getHours();
                        const dayOfWeek = startTime.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isPeak = hour >= 18 || isWeekend;
                        if (this.name.includes('House')) {
                            // Padel House Cenon: 48€ off-peak, 60€ peak (90min)
                            price = isPeak ? 60 : 48;
                        }
                        else if (this.name.includes('MY PADEL') || this.name.includes('My Padel')) {
                            // MY PADEL Ayguemorte: 42€ off-peak, 60€ peak (90min)
                            // Peak = 12h-14h & 16h30-22h30 weekdays, 09h-17h weekends
                            const isPeakMyPadel = isWeekend || (hour >= 12 && hour < 14) || (hour >= 16);
                            price = isPeakMyPadel ? 60 : 42;
                        }
                        else {
                            price = 48; // Fallback
                        }
                        if (duration === 60 && price !== null)
                            price = Math.round(price / 1.5);
                        slots.push({
                            id: `gs-${this.config.clubId}-${courtId}-${startTime.getTime()}-${duration}`,
                            provider: 'gestion-sports',
                            centerName: this.name,
                            startTime,
                            endTime,
                            durationMinutes: duration,
                            price: Math.round(price),
                            currency: 'EUR',
                            bookingUrl: `${this.config.baseUrl}/appli/Reservation`,
                            courtName: court.name,
                            availableCourts: 1,
                            indoor: court.type === 'indoor',
                        });
                    }
                }
            }
            console.log(`[GestionSports] ✅ ${slots.length} slots for ${this.name} on ${dateStr}`);
        }
        catch (error) {
            console.error(`[GestionSports] Fetch error for ${this.name}:`, error.message);
            this.xsrf = null;
        }
        return slots;
    }
}
