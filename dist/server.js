// Force timezone to Paris — all clubs are in France.
// Without this, Render (UTC) shifts all slot times by +1h.
process.env.TZ = 'Europe/Paris';
import express from 'express';
import cors from 'cors';
import { SlotAggregator } from './aggregator.js';
import { parseISO, isValid } from 'date-fns';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
// Render is now ONLY an API backend worker. The frontend is on Vercel.
const aggregator = new SlotAggregator();
// Render Cron-Job Sync Route
app.get('/cron-sync', async (req, res) => {
    // Basic protection against random people clicking the link
    const secret = req.query.secret;
    if (secret !== process.env.CRON_SECRET) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    // Set a long timeout since scraping 15 days takes a while
    req.setTimeout(5 * 60 * 1000); // 5 minutes
    const daysStr = req.query.days;
    const daysToScrape = daysStr ? parseInt(daysStr) : 15; // default to 15 days for Render Cron!
    console.log(`[CRON] Started Sync for ${daysToScrape} days...`);
    // We send back an immediate response so the cron-job service doesn't timeout
    // and let the scraping run asynchronously.
    res.json({ message: `Sync started for ${daysToScrape} days. Data will be saved to Supabase shortly.` });
    try {
        await aggregator.runFullSync(daysToScrape);
        console.log(`[CRON] ✅ Total Sync cycle finished successfully.`);
    }
    catch (e) {
        console.error(`[CRON] ❌ Sync failed:`, e);
    }
});
app.get('/api/slots', async (req, res) => {
    try {
        const dateParam = req.query.date;
        if (!dateParam) {
            return res.status(400).json({ error: 'Missing date parameter' });
        }
        const date = parseISO(dateParam);
        if (!isValid(date)) {
            return res.status(400).json({ error: 'Invalid date parameter. Use YYYY-MM-DD' });
        }
        const days = parseInt(req.query.days) || 1;
        const safeDays = Math.min(Math.max(1, days), 15);
        console.log(`[API] Fetching slots for date: ${dateParam}, days: ${safeDays}`);
        const slots = await aggregator.fetchSlotsRange(date, safeDays);
        res.json({
            count: slots.length,
            requestedDate: dateParam,
            requestedDays: safeDays,
            slots: slots
        });
    }
    catch (error) {
        console.error('Error in /api/slots endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'PadelSpot Cron Worker API is running.' });
});
app.listen(port, () => {
    console.log(`Slot Aggregator API running on http://localhost:${port}`);
});
