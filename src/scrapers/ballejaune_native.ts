import axios from 'axios';
import { format } from 'date-fns';
import { Slot, BookingProvider } from '../types/slot.js';
import * as cheerio from 'cheerio';

export class BalleJauneScraper implements BookingProvider {
    name = 'USTCT Talence';
    private clubId = '1203';
    private key = '36b812cf96db22472f9d00c0338e40e7a999e3b9cf7fc6b6a71e6bd7d8823a13bdc82293107788ef';

    async fetchSlots(date: Date): Promise<Slot[]> {
        const slots: Slot[] = [];
        // BalleJaune uses date as an offset from today (0 = today, 1 = tomorrow, etc.)
        // But the integrated planning also accepts a YYYY-MM-DD format in some cases 
        // Or we calculate the offset.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(targetDate.getTime() - today.getTime());
        const dayOffset = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const url = `https://ballejaune.com/plannings-integrated`;

        try {
            const response = await axios.get(url, {
                params: {
                    widget: 1,
                    id: this.clubId,
                    key: this.key,
                    date: dayOffset
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const $ = cheerio.load(response.data);

            // Each court is a table with class schedule-table-slots
            $('.schedule-container').each((_, container) => {
                const courtName = $(container).find('.schedule-table-header .title .name').text().trim();

                // We only want Padel courts
                if (!courtName.toLowerCase().includes('padel')) return;

                $(container).find('.slot-free').each((_, slotEl) => {
                    const timeRange = $(slotEl).find('.time').text().trim(); // e.g. "09:00 - 10:30"
                    if (!timeRange) return;

                    const [startStr, endStr] = timeRange.split(' - ');
                    const startTime = new Date(date);
                    const [startH, startM] = startStr.split(':').map(Number);
                    startTime.setHours(startH, startM, 0, 0);

                    const endTime = new Date(date);
                    const [endH, endM] = endStr.split(':').map(Number);
                    endTime.setHours(endH, endM, 0, 0);

                    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

                    // Price is usually not public on the widget for non-members
                    // Let's use a default price for Talence (approx 32-40€ for 1h30)
                    const price = 32;

                    slots.push({
                        id: `ballejaune-${this.clubId}-${startTime.getTime()}-${courtName}`,
                        provider: 'ballejaune',
                        centerName: 'USTCT Talence',
                        startTime,
                        endTime,
                        durationMinutes,
                        price,
                        currency: 'EUR',
                        bookingUrl: `https://ballejaune.com/club/ustct`,
                        courtName,
                        availableCourts: 1,
                        indoor: courtName.toLowerCase().includes('couvert') || true,
                    });
                });
            });

            console.log(`[BalleJaune] ✅ ${slots.length} slots found for ${this.name} on ${format(date, 'yyyy-MM-dd')}`);
        } catch (error: any) {
            console.error(`[BalleJaune] Error fetching slots for ${this.name}: ${error.message}`);
        }

        return slots;
    }
}
