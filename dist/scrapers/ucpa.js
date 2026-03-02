import { format } from 'date-fns';
export class UCPABordeauxScraper {
    name = 'UCPA Sport Station Bordeaux';
    async fetchSlots(date) {
        const slots = [];
        const formattedDate = format(date, 'yyyy-MM-dd');
        console.log(`[UCPA] Fetching mock slots for ${formattedDate}...`);
        try {
            ["Semi-Indoor 1", "Semi-Indoor 2", "Indoor 1"].forEach((courtName, i) => {
                for (let hour = 18; hour <= 21; hour++) {
                    for (let min of [15, 45]) {
                        if (hour === 21 && min === 45)
                            continue;
                        slots.push({
                            id: `ucpa-mock-${formattedDate}-${i}-${hour}-${min}`,
                            provider: 'headesh', // Using 'headesh' as mock provider ID
                            centerName: this.name,
                            startTime: new Date(`${formattedDate}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00.000Z`),
                            endTime: new Date(`${formattedDate}T${(hour + 1).toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00.000Z`),
                            durationMinutes: 90,
                            price: 52,
                            currency: 'EUR',
                            bookingUrl: 'https://bordeaux-brazza.ucpasportstation.com/reservation/padel',
                            courtName: courtName
                        });
                    }
                }
            });
        }
        catch (error) {
            console.error('Error fetching UCPA slots:', error);
        }
        return slots;
    }
    async close() {
        // Nothing to close
    }
}
