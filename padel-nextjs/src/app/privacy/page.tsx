import Link from 'next/link';

export default function PrivacyPolicy() {
    return (
        <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#1A1A1A', padding: '80px 24px', fontFamily: 'sans-serif' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
                <Link href="/" style={{ color: '#FF6B00', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', marginBottom: '40px' }}>
                    ← Retour à l'accueil
                </Link>

                <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '24px', letterSpacing: '-0.02em' }}>Politique de Confidentialité</h1>
                <p style={{ color: '#666', marginBottom: '32px' }}>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>1. Collecte des données</h2>
                    <p>Dans le cadre de l'utilisation de PadelSpot, nous collectons les informations suivantes lors de votre inscription via Google :</p>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li>Votre nom et prénom</li>
                        <li>Votre adresse e-mail</li>
                        <li>Votre photo de profil (le cas échéant)</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>2. Utilisation des données</h2>
                    <p>Vos données sont exclusivement utilisées pour :</p>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li>Créer et gérer votre compte utilisateur PadelSpot.</li>
                        <li>Vous permettre de créer et de voter dans des sondages de réservation.</li>
                        <li>Vous connecter avec vos amis sur la plateforme.</li>
                    </ul>
                    <p><strong>Nous ne revendons aucune de vos données personnelles à des tiers.</strong></p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>3. Conservation des données</h2>
                    <p>Nous conservons vos informations tant que votre compte est actif. Vous pouvez demander la suppression de votre compte et de toutes vos données associées à tout moment en nous contactant.</p>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>4. Vos droits</h2>
                    <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Pour exercer ces droits, vous pouvez nous contacter via l'application.</p>
                </section>

                <footer style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid #EDEDED', color: '#999', fontSize: '14px' }}>
                    &copy; {new Date().getFullYear()} PadelSpot. Tous droits réservés.
                </footer>
            </div>
        </div>
    );
}
