import { SlotAggregator } from '../aggregator.js';
import { addDays, format } from 'date-fns';
async function testAggregator() {
    const aggregator = new SlotAggregator();
    const tomorrow = addDays(new Date(), 1);
    console.log(`Aggregating slots for ${format(tomorrow, 'yyyy-MM-dd')}...`);
    console.time('AggregationTime');
    const slots = await aggregator.fetchAllSlots(tomorrow);
    console.timeEnd('AggregationTime');
    console.log(`Total slots aggregated: ${slots.length}`);
    if (slots.length > 0) {
        console.log('\nTop 3 earliest available slots:');
        slots.slice(0, 3).forEach((s, i) => {
            console.log(`${i + 1}. [${format(s.startTime, 'HH:mm')} - ${format(s.endTime, 'HH:mm')}] ${s.centerName} - ${s.durationMinutes}min - ${s.price} ${s.currency}`);
        });
    }
}
testAggregator();
