/**
 * Full integration test: all scrapers
 */
import { SlotAggregator } from '../src/aggregator.js';
import { format, addDays } from 'date-fns';

async function test() {
    const aggregator = new SlotAggregator();

    const tomorrow = addDays(new Date(), 1);
    console.log(`\n🎾 Fetching ALL padel slots for ${format(tomorrow, 'dd/MM/yyyy')}...\n`);

    const startTime = Date.now();
    const slots = await aggregator.fetchAllSlots(tomorrow);
    const elapsed = Date.now() - startTime;

    // Group by center
    const byCenter = new Map<string, typeof slots>();
    for (const slot of slots) {
        const center = slot.centerName;
        if (!byCenter.has(center)) byCenter.set(center, []);
        byCenter.get(center)!.push(slot);
    }

    console.log(`\n=== RÉSULTATS: ${slots.length} créneaux en ${elapsed}ms ===\n`);

    for (const [center, centerSlots] of byCenter) {
        console.log(`📍 ${center}: ${centerSlots.length} créneaux (${centerSlots[0].provider})`);
        console.log(`   Booking: ${centerSlots[0].bookingUrl}`);
        for (const s of centerSlots.slice(0, 3)) {
            const courtInfo = s.availableCourts && s.availableCourts > 1 ? `${s.availableCourts} terrains` : s.courtName;
            const env = s.indoor ? '🏠' : '☀️';
            console.log(`   ${format(s.startTime, 'HH:mm')}-${format(s.endTime, 'HH:mm')} | ${s.durationMinutes}min | ${s.price > 0 ? s.price + '€' : 'prix N/A'} | ${env} ${courtInfo}`);
        }
        if (centerSlots.length > 3) console.log(`   ... +${centerSlots.length - 3} autres`);
        console.log();
    }

    // Cleanup Padel33 browser
    const providers = (aggregator as any).providers;
    for (const p of providers) {
        if (p.close) await p.close();
    }
}

test();
