import axios from 'axios';
import { format } from 'date-fns';
import { Slot, BookingProvider } from '../types/slot.js';
import * as cheerio from 'cheerio';

interface LiveXperienceClub {
    name: string;
    baseUrl: string;
    clubId: string;
    email: string;
    pass: string;
}

export class LiveXperienceScraper implements BookingProvider {
    name: string;
    private config: LiveXperienceClub;
    private siteToken: string | null = null;
    private siteCookie: string = '';
    private lastLoginTime = 0;

    constructor(config: LiveXperienceClub) {
        this.name = config.name;
        this.config = config;
    }

    private async ensureLoggedIn(): Promise<void> {
        const now = Date.now();
        if (this.siteToken && this.siteCookie && (now - this.lastLoginTime) < 30 * 60 * 1000) {
            return;
        }

        console.log(`[LiveXperience] 🔑 Logging into ${this.name} (${this.config.baseUrl})...`);

        try {
            // 1. Get the login page to extract the hidden CSRF token
            const loginPageRes = await axios.get(`${this.config.baseUrl}/login.asp`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
            });
            const $login = cheerio.load(loginPageRes.data);
            const hiddenToken = $login('#token').val() || '';

            let cookies = loginPageRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';

            // 2. Perform the actual login
            const params = new URLSearchParams();
            params.append('email', this.config.email);
            params.append('mot_de_passe', this.config.pass);
            params.append('id_club', this.config.clubId);
            params.append('token', hiddenToken as string);

            const loginRes = await axios.post(`${this.config.baseUrl}/master/scriptLogin.asp`, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': `${this.config.baseUrl}/login.asp`,
                    'Cookie': cookies
                }
            });

            const newCookies = loginRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
            if (newCookies) {
                cookies = cookies ? `${cookies}; ${newCookies}` : newCookies;
            }

            const data = loginRes.data;

            // Check for the script-based token response
            const tokenMatch = data.match(/localStorage\.setItem\("livexperience_site_token",\s*"([^"]+)"\)/);

            if (tokenMatch && tokenMatch[1]) {
                this.siteToken = tokenMatch[1];
                this.siteCookie = cookies;
                this.lastLoginTime = now;
                console.log(`[LiveXperience] ✅ Logged into ${this.name}, token extracted from script.`);
            } else if (typeof data === 'string' && data.startsWith('ok|')) {
                const parts = data.split('|');
                this.siteToken = parts[1];
                this.siteCookie = cookies;
                this.lastLoginTime = now;
                console.log(`[LiveXperience] ✅ Logged into ${this.name}, token acquired.`);
            } else {
                console.warn(`[LiveXperience] ❌ Login failed for ${this.name}. Body snippet: ${data.toString().substring(0, 100)}`);
            }
        } catch (error: any) {
            console.error(`[LiveXperience] Login error for ${this.name}:`, error.message);
        }
    }

    async fetchSlots(date: Date): Promise<Slot[]> {
        const slots: Slot[] = [];
        const dateStr = format(date, 'yyyyMMdd');

        try {
            await this.ensureLoggedIn();

            if (!this.siteToken) {
                console.warn(`[LiveXperience] Skipping ${this.name} - No valid session token.`);
                return [];
            }

            // The calendar grid is loaded dynamically via POST to loadcalendrier_capsule_regroupe.asp
            // myDate format: DD/MM/YYYY
            const dateFormatted = format(date, 'dd/MM/yyyy');
            const url = `${this.config.baseUrl}/loadcalendrier_capsule_regroupe.asp`;

            const params = new URLSearchParams();
            params.append('myDate', dateFormatted);
            params.append('duree', '90');
            params.append('id_sport', '2'); // 2 is typically Padel
            params.append('livexperience_site_token', this.siteToken);
            params.append('dd', Date.now().toString());

            const response = await axios.post(url, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cookie': this.siteCookie
                }
            });

            console.log(`[LiveXperience] Debug: POST response length: ${response.data.length} chars.`);
            try {
                const fs = await import('node:fs');
                fs.writeFileSync('/tmp/livex_post.html', response.data);
            } catch (e) { }

            const $ = cheerio.load(response.data);

            // The capsule format returns <button data-heure="..."><h1 ...>
            const timeSections = $('button[data-heure]');
            console.log(`[LiveXperience] Debug: Found ${timeSections.length} time buttons.`);

            timeSections.each((_, btn) => {
                const onClickStr = $(btn).attr('onclick') || '';
                // choosePop('04/03/2026 09:00:00','999;2042;2044;2046;2047','999;48,00;48,00;48,00;48,00','4;0');
                if (onClickStr.includes('choosePop')) {
                    const match = onClickStr.match(/choosePop\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
                    if (match && match[1] && match[2] && match[3]) {
                        const dateTimeStr = match[1]; // '04/03/2026 09:00:00'
                        const terrainsStr = match[2]; // '999;2042;2044'
                        const pricesStr = match[3];   // '999;48,00;48,00'

                        const terrains = terrainsStr.split(';');
                        const prices = pricesStr.split(';');

                        // terrains[0] is typically '999' or a dummy value. Valid ones follow.
                        if (terrains.length > 1) {
                            const numCourts = terrains.length - 1;
                            let price = 40; // Default price fallback
                            if (prices.length > 1 && prices[1]) {
                                price = parseFloat(prices[1].replace(',', '.'));
                            }

                            const timeStr = $(btn).attr('data-heure') || '';
                            const timeMatch = timeStr.match(/^(\d{2})(\d{2})$/);
                            if (!timeMatch) return;

                            const h = parseInt(timeMatch[1], 10);
                            const m = parseInt(timeMatch[2], 10);
                            const startTime = new Date(date);
                            startTime.setHours(h, m, 0, 0);

                            slots.push({
                                id: `lx-${this.config.clubId}-${startTime.getTime()}`,
                                provider: 'livexperience',
                                centerName: this.name,
                                startTime,
                                endTime: new Date(startTime.getTime() + 90 * 60 * 1000), // 90 mins
                                durationMinutes: 90,
                                price,
                                currency: 'EUR',
                                bookingUrl: `${this.config.baseUrl}/reservation_capsule.asp?id_sport=2`,
                                courtName: `${numCourts} Terrain${numCourts > 1 ? 's' : ''}`,
                                availableCourts: numCourts,
                                indoor: true,
                            });
                        }
                    }
                }
            });

            // Find court names from headers (legacy just in case)
            const courtHeaders: string[] = [];

            console.log(`[LiveXperience] Debug: Found ${courtHeaders.length} courts. (${courtHeaders.join(', ')})`);

            // Find rows (time slots)
            const rows = $('tr.reservation_row, .reservation_row, tr');
            console.log(`[LiveXperience] Debug: Found ${rows.length} potential time rows.`);

            rows.each((_, row) => {
                const timeCell = $(row).find('.reservation_time, .res_time, td:first-child');
                const timeStr = timeCell.text().trim();

                const timeMatch = timeStr.match(/^(\d{2})[:h](\d{2})$/);
                if (!timeMatch) return;

                const h = parseInt(timeMatch[1], 10);
                const m = parseInt(timeMatch[2], 10);
                const startTime = new Date(date);
                startTime.setHours(h, m, 0, 0);

                let cellIdx = 0;
                $(row).find('td').each((i, cell) => {
                    // Skip time column
                    if (i === 0 && $(cell).text().trim() === timeStr) return;

                    const $cell = $(cell);

                    // Specific LiveXperience classes for available slots
                    const isAvailable = $cell.hasClass('reservation_cell_libred') ||
                        $cell.hasClass('libre') ||
                        $cell.html()?.toLowerCase().includes('réserver') ||
                        $cell.css('background-color') === '#fff' ||
                        $cell.attr('onclick')?.includes('reservation_validation');

                    if (isAvailable) {
                        const courtName = courtHeaders[cellIdx] || `Court ${cellIdx + 1}`;
                        const durationMinutes = 90;
                        const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
                        const price = 40;

                        slots.push({
                            id: `lx-${this.config.clubId}-${startTime.getTime()}-${cellIdx}`,
                            provider: 'livexperience',
                            centerName: this.name,
                            startTime,
                            endTime,
                            durationMinutes,
                            price,
                            currency: 'EUR',
                            bookingUrl: `${this.config.baseUrl}/reservation_capsule.asp?id_sport=2`,
                            courtName,
                            availableCourts: 1,
                            indoor: true, // Assuming indoor based on 3D Padel
                        });
                    }
                    cellIdx++;
                });
            });

            console.log(`[LiveXperience] ✅ Found ${slots.length} potential slots for ${this.name} on ${dateStr}`);
        } catch (error: any) {
            console.error(`[LiveXperience] Error for ${this.name}: ${error.message}`);
        }

        return slots;
    }
}
