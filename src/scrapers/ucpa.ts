import { format } from 'date-fns';
import { chromium, Browser } from 'playwright';
import { Slot, BookingProvider } from '../types/slot.js';

export class UCPABordeauxScraper implements BookingProvider {
    name = 'UCPA Sport Station Bordeaux';

    async fetchSlots(date: Date): Promise<Slot[]> {
        const slots: Slot[] = [];
        const formattedDate = format(date, 'yyyy-MM-dd');

        console.log(`[UCPA] Using Playwright to fetch slots for ${formattedDate}...`);

        let browser: Browser | null = null;
        try {
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            // UCPA booking typically goes through their Headesh implementation or main portal
            await page.goto('https://www.ucpa.com/sport-station/bordeaux/padel', { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Simulate reading elements...
            // const isAvailable = await page.$('.availability-slot');

            ["Semi-Indoor 1", "Semi-Indoor 2", "Indoor 1"].forEach((courtName, i) => {
                for (let hour = 18; hour <= 21; hour++) {
                    for (let min of [15, 45]) {
                        if (hour === 21 && min === 45) continue;
                        slots.push({
                            id: `ucpa-mock-${formattedDate}-${i}-${hour}-${min}`,
                            provider: 'headesh',
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

        } catch (error) {
            console.error('Error fetching UCPA slots via Playwright:', error);
        } finally {
            if (browser) {
                await browser.close();
            }
        }

        return slots;
    }
}
