async function testV2Centers() {
    // 1. Get Firebase token
    const authRes = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyA3H8XcpOvtiSOVea-jf9QVOKqSRXMy9DQ", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Referer': 'https://www.anybuddyapp.com/',
            'Origin': 'https://www.anybuddyapp.com'
        },
        body: JSON.stringify({
            email: 'lnyankpg@guerrillamailblock.com',
            password: 'PadelBot!2026',
            returnSecureToken: true
        })
    });
    const authData = await authRes.json();
    const token = authData.idToken;
    console.log("✅ Firebase Token OK");

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.anybuddyapp.com/',
        'Origin': 'https://www.anybuddyapp.com'
    };

    // THE REAL ENDPOINT: /v2/centers/{slug}/availabilities
    const url = `https://api-booking.anybuddyapp.com/v2/centers/4padel-bordeaux/availabilities?date.from=2026-02-25T00:00&date.to=2026-02-26T00:00&activities=padel&partySize=0`;

    console.log("Fetching 4PADEL slots via centers endpoint...");
    const res = await fetch(url, { headers });

    if (!res.ok) {
        console.error("❌ Failed:", res.status, await res.text());
        return;
    }

    const data = await res.json();
    console.log("Data keys:", Object.keys(data));

    if (data.data && Array.isArray(data.data)) {
        console.log(`\n✅ ${data.data.length} time slots found!`);
        for (const timeSlot of data.data) {
            const time = timeSlot.startDateTime;
            const services = timeSlot.services || [];
            const prices = services.map((s: any) => `${s.price / 100}€ (${s.duration}min)`).join(", ");
            console.log(`  ${time} → ${services.length} terrains: ${prices}`);
        }
    }
}

testV2Centers();
