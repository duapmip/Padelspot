import * as dotenv from 'dotenv';
dotenv.config();

import { SlotAggregator } from '../src/aggregator.js';

async function main() {
    console.log("🚀 Starting isolated sync job...");
    const aggregator = new SlotAggregator();

    // the startCacheDaemon handles the loop itself, but we need a single execution for GitHub Actions
    // Let's modify the way we call it, or just reproduce the loop here for a one-off run.
    const runSingleSync = async () => {
        try {
            const today = new Date();
            const { format, addDays } = await import('date-fns');
            const datesToCache = [today, addDays(today, 1), addDays(today, 2), addDays(today, 3)];

            for (const date of datesToCache) {
                const dateKey = format(date, 'yyyy-MM-dd');
                console.log(`[Daemon] Scraping fresh slots for ${dateKey}...`);
                const slots = await aggregator.fetchFreshSlotsForDate(date);

                const dbSlots = slots.map(slot => ({
                    id: slot.id,
                    provider: slot.provider,
                    center_name: slot.centerName,
                    court_name: slot.courtName || 'Default Court',
                    start_time: slot.startTime.toISOString(),
                    end_time: slot.endTime.toISOString(),
                    duration_minutes: slot.durationMinutes,
                    price: slot.price,
                    currency: slot.currency || 'EUR',
                    booking_url: slot.bookingUrl
                }));

                const startOfDay = new Date(date).setHours(0, 0, 0, 0);
                const endOfDay = new Date(date).setHours(23, 59, 59, 999);

                const { supabase } = await import('../src/supabase.js');
                const { error: delError } = await supabase.from('slots')
                    .delete()
                    .gte('start_time', new Date(startOfDay).toISOString())
                    .lte('start_time', new Date(endOfDay).toISOString());

                if (delError) {
                    console.error(`[Supabase Error] Can't delete old slots for ${dateKey}:`, delError);
                    continue;
                }

                if (dbSlots.length > 0) {
                    const { error: insError } = await supabase.from('slots').insert(dbSlots);
                    if (insError) {
                        console.error(`[Supabase Error] Can't insert fresh slots for ${dateKey}:`, insError);
                    } else {
                        console.log(`[Supabase] ✅ Successfully synced ${dbSlots.length} slots for ${dateKey}`);
                    }
                } else {
                    console.log(`[Supabase] ⚠️ No slots found for ${dateKey}`);
                }
            }
            console.log("✅ Synchronization cycle finished successfully.");
            process.exit(0);
        } catch (error) {
            console.error("❌ Error during sync:", error);
            process.exit(1);
        }
    };

    await runSingleSync();
}

main();
