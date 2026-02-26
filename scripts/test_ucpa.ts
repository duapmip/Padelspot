import { UCPAScraper } from '../src/scrapers/ucpa_native.js';

async function test() {
    const s = new UCPAScraper();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const slots = await s.fetchSlots(tomorrow);
    console.log('Total:', slots.length);
    for (const sl of slots.slice(0, 8)) {
        console.log(`  ${sl.startTime.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })} - ${sl.endTime.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })} | ${sl.courtName}`);
    }
}
test();
