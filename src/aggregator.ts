import { Slot, BookingProvider } from './types/slot.js';
import { BigPadelScraper } from './scrapers/bigpadel.js';
import { AnybuddyBordeauxScraper } from './scrapers/padel4.js';
import { MBPadelScraper } from './scrapers/mbpadel.js';
import { Padel33Scraper } from './scrapers/padel33_native.js';
import { GingaStadiumScraper } from './scrapers/ginga.js';
import { UCPAScraper } from './scrapers/ucpa_native.js';
import { PadelHouseScraper } from './scrapers/padelhouse_native.js';

import { format, addDays } from 'date-fns';

export class SlotAggregator {
    private providers: BookingProvider[] = [];
    private cache = new Map<string, { slots: Slot[], timestamp: number }>();
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

    startCacheDaemon(refreshIntervalMs = 5 * 60 * 1000) {
        console.log("[Aggregator] Starting background cache daemon...");

        const updateCache = async () => {
            if (this.isUpdating) return;
            this.isUpdating = true;
            try {
                const today = new Date();
                const datesToCache = [today, addDays(today, 1), addDays(today, 2)];
                for (const date of datesToCache) {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    console.log(`[Daemon] Updating cache for ${dateKey}...`);
                    const slots = await this.fetchFreshSlotsForDate(date);
                    this.cache.set(dateKey, { slots, timestamp: Date.now() });
                }
                console.log("[Daemon] Cache updated successfully.");
            } catch (error) {
                console.error("[Daemon] Error updating cache:", error);
            } finally {
                this.isUpdating = false;
            }
        };

        // Run immediately, then every X ms
        updateCache();
        setInterval(updateCache, refreshIntervalMs);
    }

    async fetchAllSlots(date: Date): Promise<Slot[]> {
        const dateKey = format(date, 'yyyy-MM-dd');
        const cachedContent = this.cache.get(dateKey);

        if (cachedContent) {
            console.log(`[Aggregator] Serving slots for ${dateKey} from CACHE (${cachedContent.slots.length} slots). Age: ${Math.round((Date.now() - cachedContent.timestamp) / 1000)}s`);
            return cachedContent.slots;
        }

        console.log(`[Aggregator] Cache miss for ${dateKey}. Fetching live...`);
        const slots = await this.fetchFreshSlotsForDate(date);
        this.cache.set(dateKey, { slots, timestamp: Date.now() });
        return slots;
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

    private async fetchFreshSlotsForDate(date: Date): Promise<Slot[]> {
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
            const clusterKey = `${slot.centerName}-${timeKey}-${slot.price}-${slot.durationMinutes}`;

            if (clusterMap.has(clusterKey)) {
                const existing = clusterMap.get(clusterKey)!;
                // Sum up available courts
                existing.availableCourts = (existing.availableCourts || 0) + (slot.availableCourts || 1);
            } else {
                clusterMap.set(clusterKey, { ...slot, availableCourts: slot.availableCourts || 1 });
            }
        }

        const finalSlots = Array.from(clusterMap.values());
        return finalSlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    }
}
