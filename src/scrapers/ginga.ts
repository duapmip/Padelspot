import axios from 'axios';
import { format } from 'date-fns';
import { Slot, BookingProvider } from '../types/slot.js';

const DOINSPORT_API_BASE = 'https://api-v3.doinsport.club';
const GINGA_CLUB_ID = '1b699512-a5b5-4f5a-a101-fa7e4c19ba7e';
const PADEL_ACTIVITY_ID = 'ce8c306e-224a-4f24-aa9d-6500580924dc';

export class GingaStadiumScraper implements BookingProvider {
    name = 'Ginga Stadium Mérignac';

    async fetchSlots(date: Date): Promise<Slot[]> {
        const slots: Slot[] = [];
        const formattedDate = format(date, 'yyyy-MM-dd');
        const url = `${DOINSPORT_API_BASE}/clubs/playgrounds/plannings/${formattedDate}`;

        try {
            const response = await axios.get(url, {
                params: {
                    'club.id': GINGA_CLUB_ID,
                    'from': '08:00',
                    'to': '23:30',
                    'activities.id': PADEL_ACTIVITY_ID,
                    'bookingType': 'unique'
                },
                headers: {
                    'Accept': 'application/json',
                    'Content-Language': 'fr',
                    'X-Locale': 'fr'
                }
            });

            const courts = response.data;
            if (!Array.isArray(courts)) return slots;

            for (const court of courts) {
                const courtName = court.name || 'Court';
                const courtId = court.id;

                // Slots are nested inside activities
                for (const activity of court.activities || []) {
                    for (const slot of activity.slots || []) {
                        // Each slot contains multiple price options (different durations)
                        for (const price of slot.prices || []) {
                            if (!price.bookable) continue; // Skip non-bookable

                            const durationMinutes = price.duration / 60;
                            const startTime = new Date(`${formattedDate}T${slot.startAt}:00`);
                            const endTime = new Date(startTime.getTime() + price.duration * 1000);

                            // Price: pricePerParticipant * participantCount (in cents)
                            const totalPriceCents = price.pricePerParticipant * (price.participantCount || 1);

                            slots.push({
                                id: `ginga-${courtId}-${startTime.getTime()}-${durationMinutes}`,
                                provider: 'doinsport',
                                centerName: this.name,
                                startTime,
                                endTime,
                                durationMinutes,
                                price: totalPriceCents / 100,
                                currency: 'EUR',
                                bookingUrl: `https://gingafoot.doinsport.club/booking?date=${formattedDate}&playground=${courtId}`,
                                courtName,
                                availableCourts: 1,
                                indoor: court.indoor ?? true,
                            });
                        }
                    }
                }
            }

            console.log(`[Ginga] ✅ ${slots.length} padel slots found for ${formattedDate}`);
        } catch (error: any) {
            console.error(`[Ginga] Error: ${error.message}`);
        }

        return slots;
    }
}
