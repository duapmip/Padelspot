const axios = require('axios');
const cheerio = require('cheerio');
(async () => {
    const MATCHPOINT_BASE = 'https://squashbad33-fr.matchpoint.com.es';
    const initRes = await axios.get(MATCHPOINT_BASE + '/Login.aspx', { headers: { 'User-Agent': 'Mozilla/5.0' }, validateStatus: () => true });
    let cookies = initRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
    const $ = cheerio.load(initRes.data);
    const params = new URLSearchParams();
    params.append('__VIEWSTATE', $('#__VIEWSTATE').val() || '');
    params.append('__VIEWSTATEGENERATOR', $('#__VIEWSTATEGENERATOR').val() || '');
    params.append('__EVENTVALIDATION', $('#__EVENTVALIDATION').val() || '');
    params.append('ctl00$ContentPlaceHolderContenido$Login1$UserName', 'padelbot.scraper@gmail.com');
    params.append('ctl00$ContentPlaceHolderContenido$Login1$Password', 'PadelBot!2026');
    params.append('ctl00$ContentPlaceHolderContenido$Login1$LoginButton', 'Connexion');

    const postRes = await axios.post(MATCHPOINT_BASE + '/Login.aspx', params, {
        headers: { 'Cookie': cookies, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' }, maxRedirects: 0, validateStatus: () => true
    });
    const newCookies = postRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
    if (newCookies) cookies += '; ' + newCookies;

    const gridRes = await axios.get(MATCHPOINT_BASE + '/Booking/Grid.aspx', { headers: { 'Cookie': cookies, 'User-Agent': 'Mozilla/5.0' }, validateStatus: () => true });
    console.log('LOGGED IN?', gridRes.data.includes('Cerrar sesi') || gridRes.data.includes('Déconnexion'));
    const match = gridRes.data.match(/hl90njda2b89k='([^']+)'/);
    console.log('API KEY:', match ? match[1] : null);

    for (const id of [5, 6, 7, 8]) {
        const res = await axios.post(MATCHPOINT_BASE + '/booking/srvc.aspx/ObtenerCuadro', { idCuadro: id, fecha: '04/03/2026', key: match?.[1] || '' }, { headers: { 'Cookie': cookies, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' } });
        console.log(`Grid ${id}: TieneClienteAcceso=${res.data.d.TieneClienteAcceso} Columnas=${res.data.d.Columnas?.length}`);
    }
})();
