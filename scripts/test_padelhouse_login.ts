import axios from 'axios';
import { format } from 'date-fns';

async function test() {
    try {
        console.log("Fetching home to get session cookies...");
        const res = await axios.get('https://padelhousefrance.gestion-sports.com/connexion.php');
        const sessionCookies = res.headers['set-cookie'] || [];

        console.log("Making POST request to /traitement/connexion.php...");
        const params = new URLSearchParams();
        params.append('ajax', 'connexionUser');
        params.append('id_club', '291');
        params.append('email', 'astin.jotham@minuteafter.com');
        params.append('form_ajax', '1');
        params.append('pass', 'Test123');
        params.append('compte', 'user');
        params.append('playeridonesignal', '0');
        params.append('identifiant', 'identifiant');
        params.append('externCo', 'true');

        const cookieStr = sessionCookies.map((c: string) => c.split(';')[0]).join('; ');

        const postRes = await axios.post('https://padelhousefrance.gestion-sports.com/traitement/connexion.php', params, {
            headers: {
                'Cookie': cookieStr,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0'
            },
        });

        const loginCookies = postRes.headers['set-cookie'] || [];
        const allCookies = [...sessionCookies, ...loginCookies];
        const finalCookieStr = allCookies.map((c: string) => c.split(';')[0]).join('; ');

        let xsrf = '';
        const csrfTokenCookie = loginCookies.find((c: string) => c.startsWith('CSRF_TOKEN='));
        if (csrfTokenCookie) xsrf = csrfTokenCookie.split(';')[0].split('=')[1];

        let userId = '';
        const cookUser = loginCookies.find((c: string) => c.startsWith('COOK_USER='));
        if (cookUser) {
            const rawJson = decodeURIComponent(cookUser.split(';')[0].split('=')[1]);
            const parsed = JSON.parse(rawJson);
            userId = parsed.idUser.toString();
        }

        console.log("User ID:", userId, "XSRF:", xsrf);

        // GET SLOTS
        const dateStr = format(new Date(), 'yyyy-MM-dd');
        for (let tries = 0; tries < 2; tries++) {
            const apiRes = await axios.post('https://padelhousefrance.gestion-sports.com/gs-api', {
                event: "reservationManager.getAvailableSlotsForDay",
                args: {
                    day: dateStr,
                    idSport: 832,
                    subjectUserId: parseInt(userId),
                    targetClubId: 291
                }
            }, {
                headers: {
                    'Cookie': finalCookieStr,
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': xsrf,
                    'X-USER-ID': userId,
                    'X-CLUB-ID': '291'
                }
            });
            console.log("GS-API Object Response:", Object.keys(apiRes.data));
            if (Object.keys(apiRes.data).length > 2) {
                break;
            }
        }

    } catch (e: any) {
        console.error(e.response ? e.response.data : e.message);
    }
}
test();
