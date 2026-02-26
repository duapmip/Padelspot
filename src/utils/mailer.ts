import { Resend } from 'resend';
import * as dotenv from 'dotenv';

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
    console.warn("RESEND_API_KEY environment variable is not set.");
}

const resend = new Resend(resendApiKey || 'dummy_key');

/**
 * Envoie un email via l'API Resend
 * @param to L'adresse email du destinataire
 * @param subject Le sujet de l'email
 * @param htmlContent Le contenu HTML de l'email
 */
export async function sendEmail(to: string, subject: string, htmlContent: string) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: to,
            subject: subject,
            html: htmlContent
        });

        if (error) {
            console.error("Erreur lors de l'envoi de l'email Resend:", error);
            return { success: false, error };
        }

        console.log("Email envoyé avec succès ! ID:", data?.id);
        return { success: true, data };
    } catch (e) {
        console.error("Erreur critique Resend:", e);
        return { success: false, error: e };
    }
}
