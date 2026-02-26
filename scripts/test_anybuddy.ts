import { chromium } from 'playwright';

async function authAnybuddy() {
    console.log("Extraction du token Firebase / Auth d'Anybuddy en mode Headless...");
    const browser = await chromium.launch({ headless: true });

    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        let targetToken = "";

        // 1. Ecoute l'API de base
        page.on('request', request => {
            const url = request.url();
            if (url.includes('api-booking') || url.includes('api.anybuddy')) {
                const headers = request.headers();
                if (headers['authorization']) {
                    targetToken = headers['authorization'];
                }
            }
        });

        // Anybuddy login URL
        await page.goto(`https://www.anybuddyapp.com/login`, { waitUntil: 'domcontentloaded' });

        await page.waitForTimeout(2000);

        // Remplissage. Parfois React masque les vrais inputs. On force le clic.
        const inputs = page.locator('input');
        await inputs.nth(0).fill('lnyankpg@guerrillamailblock.com');
        await inputs.nth(1).fill('PadelBot!2026');

        // Force l'appui sur 'Entrée' pour soumettre le formulaire
        await inputs.nth(1).press('Enter');

        await page.waitForTimeout(5000);

        if (targetToken) {
            console.log("✅ Token Auth récupéré avec succès :", targetToken.substring(0, 30) + '...');
        } else {
            console.log("❌ Échec de la récupération du token.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

authAnybuddy();
