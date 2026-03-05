import { SlotAggregator } from './aggregator.js';

async function testSync() {
    console.log('🚀 Starting Test Sync for all clubs...');
    const aggregator = new SlotAggregator();
    // Scrape 15 days to fill the database correctly
    await aggregator.runFullSync(15);
    console.log('✨ Sync finished.');
    process.exit(0);
}

testSync().catch(err => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
});
