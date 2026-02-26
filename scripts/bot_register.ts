import { chromium } from 'playwright';
import axios from 'axios';

class TempMail {
    email: string = '';
    sid_token: string = '';

    async generate() {
        // Utilisation de GuerrillaMail (1secmail étant instable)
        const res = await axios.get('https://api.guerrillamail.com/ajax.php?f=get_email_address');
        this.email = res.data.email_addr;
        this.sid_token = res.data.sid_token;
        return this.email;
    }

    async getMessages() {
        if (!this.sid_token) return [];
        const res = await axios.get(`https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${this.sid_token}`);
        return res.data.list || [];
    }

    async readMessage(id: string) {
        const res = await axios.get(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${id}&sid_token=${this.sid_token}`);
        return res.data;
    }

    async waitForEmail(subjectIncludes: string, timeoutMs: number = 60000): Promise<any> {
        console.log(`En attente de l'email contenant "${subjectIncludes}" sur ${this.email}...`);
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const msgs = await this.getMessages();
            // ignorer l'email de bienvenue
            const targetMsg = msgs.find((m: any) => m.mail_subject.toLowerCase().includes(subjectIncludes.toLowerCase()));
            if (targetMsg) {
                console.log("✅ Email trouvé !");
                return await this.readMessage(targetMsg.mail_id);
            }
            await new Promise(r => setTimeout(r, 5000));
        }
        throw new Error("Timeout en attendant l'email.");
    }
}

async function startBot() {
    const tm = new TempMail();
    console.log("Création de l'adresse email jetable...");
    const email = await tm.generate();
    const password = "PadelBot!2026";

    console.log('=============================================');
    console.log(`🚀 COMPTE GÉNÉRÉ POUR LE BOT (GARDE LE PRÉCIEUSEMENT) :`);
    console.log(`📧 Email : ${email}`);
    console.log(`🔑 Mot de passe : ${password}`);
    console.log('=============================================');

    console.log("Ouverture du navigateur automatisé...");
    // headless: false permet de voir ce que fait le robot en direct sur ton écran !
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log("Navigation vers l'inscription 4PADEL / Anybuddy...");

        // On va directement sur la page d'inscription de Anybuddy
        await page.goto('https://www.anybuddyapp.com/signup', { waitUntil: 'load' });

        console.log("Le navigateur est ouvert. Je te laisse voir la page...");

        // Attendre 5 minutes pour te laisser voir la page ou remplir manuellement.
        // Si tu le fais manuellement avec cet email, on pourra lire l'email de validation en dessous.
        await page.waitForTimeout(300000);

        // Exemple d'attente d'un email de confirmation
        // const code = await tm.waitForEmail("confirmation");
        // console.log("Code reçu : ", code.mail_body);

    } catch (e) {
        console.error("Erreur du bot :", e);
    } finally {
        await browser.close();
    }
}

startBot();
