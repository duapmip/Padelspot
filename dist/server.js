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
// Serve static files from the frontend react build
app.use(express.static(path.join(__dirname, '../frontend/dist')));
const aggregator = new SlotAggregator();
// Démarrer le daemon de mise en cache automatique toutes les 10 minutes
aggregator.startCacheDaemon(10 * 60 * 1000);
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
        const maxDays = 7;
        const safeDays = Math.min(Math.max(1, days), maxDays);
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
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
app.listen(port, () => {
    console.log(`Slot Aggregator API running on http://localhost:${port}`);
});
