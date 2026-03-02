import { format } from 'date-fns';
export class Padel3DScraper {
    name = '3D Padel (Le Haillan)';
    async fetchSlots(date) {
        const slots = [];
        const formattedDate = format(date, 'yyyy-MM-dd');
        console.log(`[3D Padel] Fetching via LiveXperience mock for ${formattedDate}...`);
        try {
            // Mock integration for LiveXperience platform.
            for (let hour = 17; hour <= 21; hour++) {
                for (let min of [0, 30]) {
                    if (hour === 21 && min === 30)
                        continue;
                    slots.push({
                        id: `3dpadel-mock-${formattedDate}-${hour}-${min}`,
                        provider: 'livexperience',
                        centerName: this.name,
                        startTime: new Date(`${formattedDate}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00.000Z`),
                        endTime: new Date(`${formattedDate}T${(hour + 1).toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00.000Z`),
                        durationMinutes: 90,
                        price: 44, // 11x4
                        currency: 'EUR',
                        bookingUrl: 'https://www.fullmotiv.com/3dpadel/',
                        courtName: 'Piste Premium 1'
                    });
                }
            }
        }
        catch (error) {
            console.error('Error fetching 3D Padel slots:', error);
        }
        return slots;
    }
}
