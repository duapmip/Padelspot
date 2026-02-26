import { BookingProvider, Slot } from '../types/slot.js';

const UCPA_API = 'https://www.ucpa.com/sport-station/api/areas-offers/weekly/alpha_bra';
const PADEL_AREA_UUID = 'area_1675332279_016745c0-a2e1-11ed-b1e7-e3a9a1407c18';

export class UCPAScraper implements BookingProvider {
    name = 'UCPA Sport Station Bordeaux';

    async fetchSlots(date: Date): Promise<Slot[]> {
        const slots: Slot[] = [];
        const targetDateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

        try {
            // UCPA returns a weekly planner; we filter for the target date
            const url = `${UCPA_API}?reservationPeriod=1&espace=${PADEL_AREA_UUID}`;
            const res = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0',
                }
            });

            if (!res.ok) {
                console.error(`[UCPA] HTTP ${res.status}`);
                return slots;
            }

            const data = await res.json() as any;
            const columns = data.planner?.columns || [];

            for (const day of columns) {
                const items = day.items || [];

                for (const item of items) {
                    // Filter by target date
                    if (item.startDate !== targetDateStr) continue;
                    if (!item.hasStock) continue;

                    const startTime = new Date(item.start_time);
                    // API returns end_time as 1 second before the full hour, round up
                    const rawEnd = new Date(item.end_time);
                    const endTime = new Date(Math.ceil(rawEnd.getTime() / 60000) * 60000);

                    // Verify date
                    if (isNaN(startTime.getTime())) continue;

                    const durationMs = endTime.getTime() - startTime.getTime();
                    const durationMinutes = Math.round(durationMs / 60000);

                    // UCPA prices: ~48€ off-peak, ~60€ peak (not in API)
                    const courtCount = item.stock || 1;

                    // One slot with court count info
                    slots.push({
                        id: `ucpa-${item.codes?.[0] || startTime.getTime()}`,
                        provider: 'ucpa',
                        centerName: this.name,
                        startTime,
                        endTime,
                        durationMinutes,
                        price: 0, // UCPA API doesn't expose prices
                        currency: 'EUR',
                        bookingUrl: 'https://www.ucpa.com/sport-station/bordeaux/reservation-padel',
                        courtName: `Padel`,
                        availableCourts: courtCount,
                        indoor: true,
                    });
                }
            }

            console.log(`[UCPA] ✅ ${slots.length} padel slots found for ${targetDateStr}`);
        } catch (error: any) {
            console.error(`[UCPA] Error: ${error.message}`);
        }

        return slots;
    }
}
