import axios from 'axios';
import { format } from 'date-fns';
const DOINSPORT_API_BASE = 'https://api-v3.doinsport.club';
const MB_PADEL_CLUB_ID = 'f0f4491a-6424-4fe7-ac7c-36c202a4e912';
const PADEL_ACTIVITY_ID = 'ce8c306e-224a-4f24-aa9d-6500580924dc'; // Padel
export class MBPadelScraper {
    name = 'MB Padel (Sainte-Eulalie)';
    async fetchSlots(date) {
        const slots = [];
        const formattedDate = format(date, 'yyyy-MM-dd');
        const url = `${DOINSPORT_API_BASE}/clubs/playgrounds/plannings/${formattedDate}`;
        try {
            const response = await axios.get(url, {
                params: {
                    'club.id': MB_PADEL_CLUB_ID,
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
            if (Array.isArray(data)) {
                for (const court of data) {
                    if (!court.activities)
                        continue;
                    for (const activity of court.activities) {
                        if (activity.id !== PADEL_ACTIVITY_ID)
                            continue;
                        if (activity.slots) {
                            for (const slot of activity.slots) {
                                let isBookable = false;
                                if (slot.prices && slot.prices.length > 0) {
                                    isBookable = slot.prices.some((p) => p.bookable === true);
                                }
                                else if (slot.bookable === true) {
                                    isBookable = true;
                                }
                                if (!isBookable) {
                                    continue;
                                }
                                const [startHour, startMinute] = slot.startAt.split(':').map(Number);
                                const startTime = new Date(date);
                                startTime.setHours(startHour, startMinute, 0, 0);
                                const durationMinutes = (slot.userClientStepBookingDuration / 60) || 90;
                                const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
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
                                    id: `mbpadel-${court.id}-${startTime.getTime()}`,
                                    provider: 'doinsport',
                                    centerName: this.name,
                                    startTime: startTime,
                                    endTime: endTime,
                                    durationMinutes: durationMinutes,
                                    price: price,
                                    currency: 'EUR',
                                    bookingUrl: `https://mbpadel.doinsport.club/booking?date=${formattedDate}&playground=${court.id}`,
                                    courtName: court.name,
                                    availableCourts: 1,
                                    indoor: true, // MB Padel is indoor
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
                console.warn('[MB Padel] Unexpected API response structure', data);
            }
        }
        catch (error) {
            console.error('Error fetching MB Padel slots:', error);
        }
        return slots;
    }
}
