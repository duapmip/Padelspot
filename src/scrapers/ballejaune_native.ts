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

        // BalleJaune uses day offset from today (0 = today, 1 = tomorrow, etc.)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate.getTime() - today.getTime();
        const dayOffset = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (dayOffset < 0) return []; // Skip past dates

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

            // BalleJaune structure:
            // .schedule-container contains one court
            //   .media-body.text-ellipsis contains the court name (e.g. "PADEL N°1")
            //   .slot-free elements are bookable slots with data-timestart (minutes from midnight) and data-duration
            $('.schedule-container').each((_, container) => {
                // Get the court name from the header
                const courtName = $(container).find('.media-body.text-ellipsis').first().text().trim();

                // Only keep Padel courts
                if (!courtName.toLowerCase().includes('padel')) return;

                // Find all free slots in this court
                $(container).find('.slot-free').each((_, slotEl) => {
                    const $slot = $(slotEl);
                    const timeStartMinutes = parseInt($slot.attr('data-timestart') || '0');
                    const durationMinutes = parseInt($slot.attr('data-duration') || '90');

                    if (timeStartMinutes === 0) return;

                    // Convert minutes from midnight to hours/minutes
                    const startH = Math.floor(timeStartMinutes / 60);
                    const startM = timeStartMinutes % 60;

                    const startTime = new Date(date);
                    startTime.setHours(startH, startM, 0, 0);

                    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

                    // Skip slots in the past
                    if (startTime <= new Date()) return;

                    slots.push({
                        id: `ballejaune-${this.clubId}-${startTime.getTime()}-${courtName}`,
                        provider: 'ballejaune',
                        centerName: 'USTCT Talence',
                        startTime,
                        endTime,
                        durationMinutes,
                        price: 48, // USTCT standard rate (48€/90min)
                        currency: 'EUR',
                        bookingUrl: `https://ballejaune.com/club/ustct`,
                        courtName,
                        availableCourts: 1,
                        indoor: false, // USTCT padel courts are outdoor
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
