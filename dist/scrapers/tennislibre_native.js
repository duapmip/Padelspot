import axios from 'axios';
import { format } from 'date-fns';
export class TennisLibreScraper {
    name = 'Tennis Club de Bordeaux';
    clubId = '5962';
    async fetchSlots(date) {
        const slots = [];
        const dateday = format(date, 'yyyyMMdd');
        const url = `https://www.tennislibre.com/tennis/front/view/viewday.php?idclub=${this.clubId}&dateday=${dateday}`;
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                },
                responseType: 'arraybuffer' // TennisLibre uses Latin-1 encoding
            });
            // Decode as latin-1 since the site uses ISO-8859-1
            const html = Buffer.from(response.data).toString('latin1');
            // 1. Find all terrain labels to identify Padel columns
            const labelRegex = /terrain_label/g;
            const labelPositions = [];
            let match;
            while ((match = labelRegex.exec(html)) !== null) {
                labelPositions.push(match.index);
            }
            // Extract terrain names from <b> tags inside terrain_label cells
            const terrainNames = [];
            const nameRegex = /terrain_label[^>]*>[\s\S]*?<b>([\s\S]*?)<\/b>/g;
            while ((match = nameRegex.exec(html)) !== null) {
                terrainNames.push(match[1].trim());
            }
            // Find padel court indices
            const padelCourts = [];
            terrainNames.forEach((name, idx) => {
                if (name.toLowerCase().includes('padel')) {
                    padelCourts.push({ index: idx, name });
                }
            });
            if (padelCourts.length === 0) {
                console.log(`[TennisLibre] No padel courts found at ${this.name}`);
                return [];
            }
            // 2. For each padel court, extract the HTML section and parse reservations
            for (const court of padelCourts) {
                const sectionStart = labelPositions[court.index];
                const sectionEnd = court.index + 1 < labelPositions.length
                    ? labelPositions[court.index + 1]
                    : html.length;
                const section = html.substring(sectionStart, sectionEnd);
                // Strip HTML tags for text analysis
                const textCells = section.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
                const cellTexts = textCells.map(cell => cell.replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 0);
                // 3. Extract reservation time ranges (format: "12h30-13h30" or "18h-20h")
                const reservations = [];
                for (const text of cellTexts) {
                    const timeMatch = text.match(/(\d{1,2})h(\d{2})?\s*-\s*(\d{1,2})h(\d{2})?/);
                    if (timeMatch) {
                        const startH = parseInt(timeMatch[1]) + parseInt(timeMatch[2] || '0') / 60;
                        const endH = parseInt(timeMatch[3]) + parseInt(timeMatch[4] || '0') / 60;
                        reservations.push({ start: startH, end: endH });
                    }
                }
                // 4. Generate potential 90-min slots and check availability against reservations
                const potentialStarts = [8, 9.5, 11, 12.5, 14, 15.5, 17, 18.5, 20];
                for (const ps of potentialStarts) {
                    const pe = ps + 1.5; // 90 minutes
                    // Check overlap with any reservation
                    const isOccupied = reservations.some(r => ps < r.end && pe > r.start);
                    if (!isOccupied) {
                        const startTime = new Date(date);
                        startTime.setHours(Math.floor(ps), (ps % 1) * 60, 0, 0);
                        const endTime = new Date(startTime.getTime() + 90 * 60 * 1000);
                        // Skip slots in the past
                        if (startTime <= new Date())
                            continue;
                        slots.push({
                            id: `tennislibre-${this.clubId}-${startTime.getTime()}-${court.name}`,
                            provider: 'tennislibre',
                            centerName: this.name,
                            startTime,
                            endTime,
                            durationMinutes: 90,
                            price: 42, // TCB: 7€/h/person × 4 players × 1.5h = 42€ (non-member)
                            currency: 'EUR',
                            bookingUrl: `https://www.tennislibre.com/tennis/front/view/viewday.php?idclub=${this.clubId}&dateday=${dateday}`,
                            courtName: court.name,
                            availableCourts: 1,
                            indoor: false,
                        });
                    }
                }
            }
            console.log(`[TennisLibre] ✅ ${slots.length} REAL available padel slots for ${this.name} on ${dateday}`);
        }
        catch (error) {
            console.error(`[TennisLibre] Error: ${error.message}`);
        }
        return slots;
    }
}
