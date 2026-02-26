async function listClubs() {
    const authRes = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyA3H8XcpOvtiSOVea-jf9QVOKqSRXMy9DQ', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Referer': 'https://www.anybuddyapp.com/', 'Origin': 'https://www.anybuddyapp.com' },
        body: JSON.stringify({ email: 'lnyankpg@guerrillamailblock.com', password: 'PadelBot!2026', returnSecureToken: true })
    });
    const { idToken } = await authRes.json();

    const res = await fetch('https://api-booking.anybuddyapp.com/v2/availabilities?city=bordeaux-33000-fr&activities=padel&date.from=2026-02-25T08:00&date.to=2026-02-25T23:59&isPartner=true&limit=50', {
        headers: { 'Authorization': 'Bearer ' + idToken, 'Accept': 'application/json', 'Referer': 'https://www.anybuddyapp.com/', 'Origin': 'https://www.anybuddyapp.com' }
    });
    const data = await res.json();
    console.log("Total clubs on Anybuddy within radius:", data.data.length);
    for (const c of data.data) {
        console.log(`${c.id} | ${c.name} | ${c.distance}m | partner=${c.isPartner} | fullAnybuddy=${c.isFullAnybuddy}`);
    }
}
listClubs();
