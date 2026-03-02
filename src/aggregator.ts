import { Slot, BookingProvider } from './types/slot.js';
import { BigPadelScraper } from './scrapers/bigpadel.js';
import { AnybuddyBordeauxScraper } from './scrapers/padel4.js';
import { MBPadelScraper } from './scrapers/mbpadel.js';
import { Padel33Scraper } from './scrapers/padel33_native.js';
import { GingaStadiumScraper } from './scrapers/ginga.js';
import { UCPAScraper } from './scrapers/ucpa_native.js';
import { PadelHouseScraper } from './scrapers/padelhouse_native.js';

import { format, addDays } from 'date-fns';
import { supabase } from './supabase.js';

export class SlotAggregator {
    private providers: BookingProvider[] = [];
    private isUpdating = false;

    constructor() {
        // Native API scrapers (priority — real data)
        this.providers.push(new BigPadelScraper());        // Doinsport API
        this.providers.push(new MBPadelScraper());         // Doinsport API
        this.providers.push(new GingaStadiumScraper());    // Doinsport API
        this.providers.push(new UCPAScraper());             // UCPA public API
        this.providers.push(new PadelHouseScraper());      // Gestion Sports API
        this.providers.push(new Padel33Scraper());         // MatchPoint API

        // Anybuddy fallback (4PADEL - clubs without native API)
        this.providers.push(new AnybuddyBordeauxScraper());
    }

    async runFullSync(daysToScrape: number) {
        if (this.isUpdating) {
            console.log("[Aggregator] Sync already in progress, skipping...");
            return;
        }
        this.isUpdating = true;
        try {
            const today = new Date();
            const datesToCache = Array.from({ length: daysToScrape }, (_, i) => addDays(today, i));

            for (const date of datesToCache) {
                const dateKey = format(date, 'yyyy-MM-dd');
                console.log(`[Sync] Scraping fresh slots for ${dateKey}...`);
                const slots = await this.fetchFreshSlotsForDate(date);

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

                // Clear existing old slots for this specific date range
                const startOfDay = new Date(date).setHours(0, 0, 0, 0);
                const endOfDay = new Date(date).setHours(23, 59, 59, 999);

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
            console.log("[Sync] Synchronization cycle finished.");
        } catch (error) {
            console.error("[Sync] Error during sync:", error);
        } finally {
            this.isUpdating = false;
        }
    }

    async fetchAllSlots(date: Date): Promise<Slot[]> {
        const startOfDay = new Date(date).setHours(0, 0, 0, 0);
        const endOfDay = new Date(date).setHours(23, 59, 59, 999);

        // Fetch from Supabase directly instead of local memory cache
        const { data: dbSlots, error } = await supabase.from('slots')
            .select('*')
            .gte('start_time', new Date(startOfDay).toISOString())
            .lte('start_time', new Date(endOfDay).toISOString())
            .order('start_time', { ascending: true });

        if (error) {
            console.error('[Supabase API Error] fetchAllSlots:', error);
            return [];
        }

        if (dbSlots && dbSlots.length > 0) {
            return dbSlots.map((row: any) => ({
                id: row.id,
                provider: row.provider,
                centerName: row.center_name,
                courtName: row.court_name,
                startTime: new Date(row.start_time),
                endTime: new Date(row.end_time),
                durationMinutes: row.duration_minutes,
                price: parseFloat(row.price),
                currency: row.currency,
                bookingUrl: row.booking_url
            }));
        }

        return [];
    }

    async fetchSlotsRange(startDate: Date, days: number): Promise<Slot[]> {
        const allSlots: Slot[] = [];
        for (let i = 0; i < days; i++) {
            const date = addDays(startDate, i);
            const daySlots = await this.fetchAllSlots(date);
            allSlots.push(...daySlots);
        }
        return allSlots;
    }

    async fetchFreshSlotsForDate(date: Date): Promise<Slot[]> {
        const fetchPromises = this.providers.map(provider =>
            provider.fetchSlots(date).catch(err => {
                console.error(`Error fetching slots from ${provider.name}:`, err);
                return []; // Return empty array on failure so one provider doesn't crash the rest
            })
        );

        const results = await Promise.all(fetchPromises);

        // Flatten the array of arrays
        const allSlots = results.flat();

        // Deduplicate/Cluster slots: same center, same time, same price.
        const clusterMap = new Map<string, Slot>();

        for (const slot of allSlots) {
            const timeKey = slot.startTime.getTime();
            // Create a pseudo-unique hash for the database to safely upsert/delete and track counts.
            const clusterKey = `${slot.provider}--${slot.centerName}-${timeKey}-${slot.price}-${slot.durationMinutes}`.replace(/\s+/g, "_");

            if (clusterMap.has(clusterKey)) {
                const existing = clusterMap.get(clusterKey)!;
                // Sum up available courts
                existing.availableCourts = (existing.availableCourts || 0) + (slot.availableCourts || 1);
            } else {
                clusterMap.set(clusterKey, { ...slot, id: clusterKey, availableCourts: slot.availableCourts || 1 });
            }
        }

        const finalSlots = Array.from(clusterMap.values());
        return finalSlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    }
}
