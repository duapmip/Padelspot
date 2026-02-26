import { AnybuddyBordeauxScraper } from '../src/scrapers/padel4.js';

async function test() {
    const scraper = new AnybuddyBordeauxScraper();

    const date = new Date('2026-02-25');
    console.log("Fetching ALL Anybuddy clubs for:", date.toISOString());

    const start = Date.now();
    const slots = await scraper.fetchSlots(date);
    const elapsed = Date.now() - start;

    // Group by center
    const byCenter = new Map<string, number>();
    for (const s of slots) {
        byCenter.set(s.centerName, (byCenter.get(s.centerName) || 0) + 1);
    }

    console.log(`\n=== ${slots.length} créneaux au total en ${elapsed}ms ===`);
    for (const [center, count] of byCenter) {
        console.log(`  ${center}: ${count} créneaux`);
    }

    process.exit(0);
}
test();
