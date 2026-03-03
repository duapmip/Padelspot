import { SlotAggregator } from './aggregator.js';

async function testSync() {
    console.log('🚀 Starting Test Sync for all clubs...');
    const aggregator = new SlotAggregator();
    // Scrape only 2 days to be fast but see tomorrow
    await aggregator.runFullSync(2);
    console.log('✨ Sync finished.');
    process.exit(0);
}

testSync().catch(err => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
});
