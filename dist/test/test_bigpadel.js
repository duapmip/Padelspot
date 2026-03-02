import { BigPadelScraper } from '../scrapers/bigpadel.js';
import { addDays } from 'date-fns';
async function testBigPadel() {
    const scraper = new BigPadelScraper();
    const tomorrow = addDays(new Date(), 1);
    console.log(`Fetching slots for ${tomorrow.toISOString()}...`);
    const slots = await scraper.fetchSlots(tomorrow);
    console.log(`Found ${slots.length} slots.`);
    if (slots.length > 0) {
        console.log('Sample slot:', slots[0]);
    }
    else {
        console.log('No slots found. Check the API response manually.');
    }
}
testBigPadel();
