import axios from 'axios';
import { format } from 'date-fns';
const DOINSPORT_API_BASE = 'https://api-v3.doinsport.club';
const BIG_PADEL_CLUB_ID = 'adc3cc48-4163-4fe5-91fe-72ba71a400ee';
const PADEL_ACTIVITY_ID = 'ce8c306e-224a-4f24-aa9d-6500580924dc'; // Padel
// const PADEL_OUTDOOR_ACTIVITY_ID = '...'; // If there are different IDs for indoor/outdoor
export class BigPadelScraper {
    name = 'Big Padel Mérignac';
    async fetchSlots(date) {
        const slots = [];
        const formattedDate = format(date, 'yyyy-MM-dd');
        // Fetch for the whole day (08:00 to 23:00 roughly)
        // Doinsport API seems to take `from` and `to` as full ISO strings or just times? 
        // Based on previous research, let's try HH:mm format first or full ISO if that fails.
        // Actually, the example was `club.id=...&from=09:00&to=23:00`.
        const url = `${DOINSPORT_API_BASE}/clubs/playgrounds/plannings/${formattedDate}`;
        try {
            const response = await axios.get(url, {
                params: {
                    'club.id': BIG_PADEL_CLUB_ID,
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
            const data = response.data;
            // The response structure needs to be analyzed properly.
            // Usually Doinsport returns an array of playgrounds, and for each playground, an array of slots.
            // Or it returns a list of available slots directly.
            // Let's assume a structure based on common Doinsport responses and adapt if it fails during testing.
            // Common Doinsport structure found in other projects:
            // data might be an array of objects representing courts with their planning
            if (Array.isArray(data)) {
                for (const court of data) {
                    if (!court.activities)
                        continue;
                    for (const activity of court.activities) {
                        if (activity.id !== PADEL_ACTIVITY_ID)
                            continue;
                        if (activity.slots) {
                            for (const slot of activity.slots) {
                                // We need to check if it's actually bookable.
                                let isBookable = false;
                                if (slot.prices && slot.prices.length > 0) {
                                    // Check if any price option is marked as bookable: true
                                    isBookable = slot.prices.some((p) => p.bookable === true);
                                }
                                else if (slot.bookable === true) {
                                    isBookable = true;
                                }
                                if (!isBookable) {
                                    continue; // Skip slots that are already booked or not available
                                }
                                // Construct start date
                                const [startHour, startMinute] = slot.startAt.split(':').map(Number);
                                const startTime = new Date(date);
                                startTime.setHours(startHour, startMinute, 0, 0);
                                // Duration
                                const durationMinutes = (slot.userClientStepBookingDuration / 60) || 90;
                                const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
                                // Price extraction
                                let price = 0;
                                if (slot.prices && slot.prices.length > 0) {
                                    const validPrice = slot.prices.find((p) => p.bookable === true) || slot.prices[0];
                                    if (validPrice.pricePerParticipant) {
                                        price = (validPrice.pricePerParticipant * (validPrice.participantCount || 4)) / 100;
                                    }
                                    else if (validPrice.price) {
                                        price = validPrice.price / 100;
                                    }
                                }
                                else if (typeof slot.price === 'number') {
                                    price = slot.price / 100;
                                }
                                slots.push({
                                    id: `bigpadel-${court.id}-${startTime.getTime()}`,
                                    provider: 'doinsport',
                                    centerName: this.name,
                                    startTime: startTime,
                                    endTime: endTime,
                                    durationMinutes: durationMinutes,
                                    price: price,
                                    currency: 'EUR',
                                    // Deep link optimization with playground param
                                    bookingUrl: `https://bigpadel.doinsport.club/booking?date=${formattedDate}&playground=${court.id}`,
                                    courtName: court.name,
                                    availableCourts: 1,
                                    indoor: court.indoor ?? true,
                                    technicalDetails: {
                                        playgroundId: court.id,
                                        slotRaw: slot
                                    }
                                });
                            }
                        }
                    }
                }
            }
            else {
                console.warn('Unexpected API response structure', data);
            }
        }
        catch (error) {
            console.error('Error fetching Big Padel slots:', error);
        }
        return slots;
    }
}
