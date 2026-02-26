import { format } from 'date-fns';
import { Slot, BookingProvider } from '../types/slot.js';

export class PadelHouseScraper implements BookingProvider {
    name = 'Padel House (Cenon)';

    async fetchSlots(date: Date): Promise<Slot[]> {
        const slots: Slot[] = [];
        const formattedDate = format(date, 'yyyy-MM-dd');

        console.log(`[Padel House] Fetching via Gestion Sports mock for ${formattedDate}...`);

        try {
            // Mock integration for Gestion Sports / Anybuddy fallback.
            for (let hour = 18; hour <= 22; hour++) {
                for (let min of [0, 30]) {
                    if (hour === 22 && min === 30) continue;
                    slots.push({
                        id: `padelhouse-mock-${formattedDate}-${hour}-${min}`,
                        provider: 'gestion-sports',
                        centerName: this.name,
                        startTime: new Date(`${formattedDate}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00.000Z`),
                        endTime: new Date(`${formattedDate}T${(hour + 1).toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00.000Z`),
                        durationMinutes: 90,
                        price: 40,
                        currency: 'EUR',
                        bookingUrl: 'https://padelhousefrance.net/reservation',
                        courtName: 'Piste Premium 1'
                    });
                }
            }

        } catch (error) {
            console.error('Error fetching Padel House slots:', error);
        }

        return slots;
    }
}
