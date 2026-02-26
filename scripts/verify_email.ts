import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = "https://anybuddy-91142.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=fLE4rnYTV4CXn98U2g62V8JRfFIxkt2w91Qv2hu2aeoAAAGcjMoC5A&apiKey=AIzaSyA3H8XcpOvtiSOVea-jf9QVOKqSRXMy9DQ&lang=fr";
    await page.goto(url, { waitUntil: 'networkidle' });
    console.log("Email Verified using Playwright!");
    await browser.close();
})();
