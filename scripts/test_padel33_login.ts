import axios from 'axios';
import { format } from 'date-fns';

async function test() {
    try {
        const initRes = await axios.get('https://squashbad33-fr.matchpoint.com.es/Login.aspx', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const setCookie = initRes.headers['set-cookie'] || [];
        const cookieStr = setCookie.map((c: string) => c.split(';')[0]).join('; ');

        const viewStateMatch = initRes.data.match(/id="__VIEWSTATE" value="([^"]+)"/);
        const viewStateGenMatch = initRes.data.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/);
        const eventValMatch = initRes.data.match(/id="__EVENTVALIDATION" value="([^"]+)"/);

        const params = new URLSearchParams();
        if (viewStateMatch) params.append('__VIEWSTATE', viewStateMatch[1]);
        if (viewStateGenMatch) params.append('__VIEWSTATEGENERATOR', viewStateGenMatch[1]);
        if (eventValMatch) params.append('__EVENTVALIDATION', eventValMatch[1]);

        params.append('ctl00$ContentPlaceHolderContenido$Login1$UserName', 'padelbot.scraper@gmail.com');
        params.append('ctl00$ContentPlaceHolderContenido$Login1$Password', 'PadelBot!2026');
        params.append('ctl00$ContentPlaceHolderContenido$Login1$LoginButton', 'Connexion');

        const postRes = await axios.post('https://squashbad33-fr.matchpoint.com.es/Login.aspx', params, {
            headers: {
                'Cookie': cookieStr,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0'
            },
            maxRedirects: 0,
            validateStatus: () => true
        });

        const loginCookies = postRes.headers['set-cookie'] || [];
        const allCookiesStr = [...setCookie, ...loginCookies].map((c: string) => c.split(';')[0]).join('; ');

        const gridRes = await axios.get('https://squashbad33-fr.matchpoint.com.es/Booking/Grid.aspx', {
            headers: {
                'Cookie': allCookiesStr,
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const keyMatch = gridRes.data.match(/hl90njda2b89k='([^']+)'/);
        const apiKey = keyMatch ? keyMatch[1] : null;

        const dateStr = `${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}`;

        const res = await axios.post(`https://squashbad33-fr.matchpoint.com.es/booking/srvc.aspx/ObtenerCuadro`, {
            idCuadro: 5,
            fecha: dateStr,
            key: apiKey
        }, {
            headers: {
                'Cookie': allCookiesStr,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        console.log("TieneClienteAcceso:", res.data.d.TieneClienteAcceso);
        console.log("Columnas length:", res.data.d.Columnas?.length);

    } catch (e: any) {
        console.error(e.message);
    }
}
test();
