import { BookingProvider, Slot } from '../types/slot.js';
import { format } from 'date-fns';

const FIREBASE_API_KEY = 'AIzaSyA3H8XcpOvtiSOVea-jf9QVOKqSRXMy9DQ';
const ANYBUDDY_EMAIL = 'lnyankpg@guerrillamailblock.com';
const ANYBUDDY_PASSWORD = 'PadelBot!2026';

// Anybuddy fallback — only 4PADEL (no public API found yet)
const ANYBUDDY_CLUBS = [
    { slug: '4padel-bordeaux', name: '4Padel / Le Five - Bordeaux', bookingUrl: 'https://www.4padel.fr/bordeaux' },
];

export class AnybuddyBordeauxScraper implements BookingProvider {
    name = "4PADEL Bordeaux (via Anybuddy API)";
    private tokenCache: { token: string; expiresAt: number } | null = null;

    private async getFirebaseToken(): Promise<string> {
        // Token Firebase valide 1 heure, on le cache
        if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
            return this.tokenCache.token;
        }

        console.log("[Anybuddy] Authenticating via Firebase...");
        const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Referer': 'https://www.anybuddyapp.com/',
                    'Origin': 'https://www.anybuddyapp.com'
                },
                body: JSON.stringify({
                    email: ANYBUDDY_EMAIL,
                    password: ANYBUDDY_PASSWORD,
                    returnSecureToken: true
                })
            }
        );

        if (!res.ok) {
            throw new Error(`Firebase auth failed: ${res.status}`);
        }

        const data = await res.json();
        // Firebase tokens expire in 3600s, we refresh 5 min early
        this.tokenCache = {
            token: data.idToken,
            expiresAt: Date.now() + (3600 - 300) * 1000
        };
        console.log("[Anybuddy] ✅ Firebase token obtained.");
        return data.idToken;
    }

    async fetchSlots(date: Date): Promise<Slot[]> {
        const slots: Slot[] = [];
        const dateStr = format(date, 'yyyy-MM-dd');

        try {
            const token = await this.getFirebaseToken();
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://www.anybuddyapp.com/',
                'Origin': 'https://www.anybuddyapp.com'
            };

            for (const club of ANYBUDDY_CLUBS) {
                console.log(`[Anybuddy] Fetching slots for ${club.name} on ${dateStr}...`);

                const url = `https://api-booking.anybuddyapp.com/v2/centers/${club.slug}/availabilities?date.from=${dateStr}T00:00&date.to=${dateStr}T23:59&activities=padel&partySize=0`;

                const res = await fetch(url, { headers });

                if (!res.ok) {
                    console.error(`[Anybuddy] Failed for ${club.name}: HTTP ${res.status}`);
                    continue;
                }

                const data = await res.json();
                let clubSlotCount = 0;

                if (data.data && Array.isArray(data.data)) {
                    for (const timeSlot of data.data) {
                        const startDateTime = timeSlot.startDateTime; // e.g. "2026-02-25T14:00"

                        for (const service of timeSlot.services || []) {
                            const startDate = new Date(`${startDateTime}:00`);
                            const endDate = new Date(startDate.getTime() + service.duration * 60 * 1000);

                            slots.push({
                                id: `anybuddy-${club.slug}-${service.slotId || service.id}-${startDate.getTime()}`,
                                provider: 'anybuddy',
                                centerName: club.name,
                                startTime: startDate,
                                endTime: endDate,
                                durationMinutes: service.duration,
                                price: service.discountPrice ? service.discountPrice / 100 : service.price / 100,
                                currency: 'EUR',
                                bookingUrl: club.bookingUrl,
                                courtName: `Terrain ${service.id?.substring(0, 8) || 'Padel'}`,
                                availableCourts: 1,
                                indoor: true,
                            });
                            clubSlotCount++;
                        }
                    }
                    console.log(`[Anybuddy] ✅ ${club.name}: ${clubSlotCount} slots found.`);
                }
            }
        } catch (error) {
            console.error('[Anybuddy] Error:', error);
        }

        return slots;
    }
}
