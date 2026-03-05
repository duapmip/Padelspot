import axios from 'axios';
import { format } from 'date-fns';
const DOINSPORT_API_BASE = 'https://api-v3.doinsport.club';
const BUENAVISTA_CLUB_ID = '8b9ee6f4-b5b7-4fab-8a50-31fe40d99eb1';
const PADEL_ACTIVITY_ID = 'ce8c306e-224a-4f24-aa9d-6500580924dc';
export class BuenavistaPadelScraper {
    name = 'Buenavista Padel Club';
    async fetchSlots(date) {
        const slots = [];
        const formattedDate = format(date, 'yyyy-MM-dd');
        const url = `${DOINSPORT_API_BASE}/clubs/playgrounds/plannings/${formattedDate}`;
        try {
            const response = await axios.get(url, {
                params: {
                    'club.id': BUENAVISTA_CLUB_ID,
                    'from': '08:00',
                    'to': '23:30',
                    'bookingType': 'unique'
                },
                headers: {
                    'Accept': 'application/json',
                    'Content-Language': 'fr',
                    'X-Locale': 'fr'
                }
            });
            const courts = response.data;
            if (!Array.isArray(courts))
                return slots;
            for (const court of courts) {
                const courtName = court.name || 'Piste';
                const courtId = court.id;
                for (const activity of court.activities || []) {
                    if (activity.id !== PADEL_ACTIVITY_ID)
                        continue;
                    for (const slot of activity.slots || []) {
                        for (const price of slot.prices || []) {
                            if (!price.bookable)
                                continue;
                            const durationMinutes = price.duration / 60;
                            const startTime = new Date(`${formattedDate}T${slot.startAt}:00`);
                            const endTime = new Date(startTime.getTime() + price.duration * 1000);
                            const totalPriceCents = price.pricePerParticipant * (price.participantCount || 1);
                            slots.push({
                                id: `buenavista-${courtId}-${startTime.getTime()}-${durationMinutes}`,
                                provider: 'doinsport',
                                centerName: this.name,
                                startTime,
                                endTime,
                                durationMinutes,
                                price: totalPriceCents / 100,
                                currency: 'EUR',
                                bookingUrl: `https://buenavistapadelclub.doinsport.club/booking?date=${formattedDate}&playground=${courtId}`,
                                courtName,
                                availableCourts: 1,
                                indoor: court.indoor ?? true,
                            });
                        }
                    }
                }
            }
            console.log(`[Buenavista] ✅ ${slots.length} padel slots found for ${formattedDate}`);
        }
        catch (error) {
            console.error(`[Buenavista] Error: ${error.message}`);
        }
        return slots;
    }
}
