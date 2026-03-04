"use client";

import { useState } from 'react';
import './BrandShowcase.css';

interface Brand {
    name: string;
    tagline: string;
    description: string;
    logo: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        bg: string;
        text: string;
        muted: string;
    };
    font: string;
    vibe: string;
    mockNav: string[];
    mockHeroTitle: string;
    mockHeroSub: string;
    mockCta: string;
    mockFeatures: { icon: string; label: string }[];
}

const brands: Brand[] = [
    {
        name: 'VIBORAPP',
        tagline: 'Strike. Track. Dominate.',
        description: 'Esthétique serpent/tech — premium, sombre, puissant. Évoque la précision du cobra qui frappe. Pour les joueurs sérieux qui veulent tout tracker.',
        logo: '/brands/viborapp.png',
        colors: {
            primary: '#0D7C4A',
            secondary: '#7FE856',
            accent: '#0D7C4A',
            bg: '#0A0F0D',
            text: '#E8F5E9',
            muted: '#2E4A3A',
        },
        font: "'Inter', sans-serif",
        vibe: 'Dark Premium Tech',
        mockNav: ['Créneaux', 'Tournois', 'Classement', 'Mon Profil'],
        mockHeroTitle: 'TROUVE TON\nTERRAIN.',
        mockHeroSub: 'Tous les créneaux de padel à Bordeaux. En temps réel.',
        mockCta: 'CHERCHER UN CRÉNEAU',
        mockFeatures: [
            { icon: '🐍', label: 'Tracking live' },
            { icon: '⚡', label: 'Résa instantanée' },
            { icon: '🏆', label: 'Tournois & scores' },
            { icon: '📊', label: 'Stats joueur' },
        ],
    },
    {
        name: 'VIBORA SCORE',
        tagline: 'Every point counts.',
        description: 'Esthétique luxe sportif — noir & or, premium, exclusif. Le serpent enroulé autour du score. Pour ceux qui veulent dominer le classement.',
        logo: '/brands/vibora-score.png',
        colors: {
            primary: '#C8952E',
            secondary: '#F5D77A',
            accent: '#C8952E',
            bg: '#0C0C0C',
            text: '#F0E6D2',
            muted: '#2A2418',
        },
        font: "'Playfair Display', serif",
        vibe: 'Luxury Sport',
        mockNav: ['Terrains', 'Scores', 'Tournois', 'Profil'],
        mockHeroTitle: 'CHAQUE POINT\nCOMPTE.',
        mockHeroSub: 'La plateforme premium du padel bordelais.',
        mockCta: 'RÉSERVER MAINTENANT',
        mockFeatures: [
            { icon: '🥇', label: 'Classement live' },
            { icon: '🎯', label: 'Score tracking' },
            { icon: '👑', label: 'Tournois premium' },
            { icon: '📈', label: 'Progression' },
        ],
    },
    {
        name: 'REMATE',
        tagline: 'Smash your limits.',
        description: "Esthétique feu & énergie — dynamique, passionné, athlétique. Le smash qui claque. Pour les compétiteurs, ceux qui jouent pour gagner.",
        logo: '/brands/remate.png',
        colors: {
            primary: '#E84420',
            secondary: '#FF7A50',
            accent: '#FF4500',
            bg: '#1A1010',
            text: '#FFF0EC',
            muted: '#3A2020',
        },
        font: "'Outfit', sans-serif",
        vibe: 'Athletic Energy',
        mockNav: ['Créneaux', 'Tournois', 'Clubs', 'Mon compte'],
        mockHeroTitle: 'SMASH\nTES LIMITES.',
        mockHeroSub: 'Créneaux live. Tournois. Stats. Tout le padel de Bordeaux.',
        mockCta: 'TROUVER UN TERRAIN',
        mockFeatures: [
            { icon: '🔥', label: 'Créneaux live' },
            { icon: '💪', label: 'Tournois locaux' },
            { icon: '⚡', label: 'Résa flash' },
            { icon: '🏅', label: 'Classement FFT' },
        ],
    },
    {
        name: 'CHIQUITRACKER',
        tagline: 'Track every shot.',
        description: "Esthétique moderne & fun — coloré, accessible, tech. La chiquita qui trace son arc. Pour toute la communauté padel, du débutant au pro.",
        logo: '/brands/chiquitracker.png',
        colors: {
            primary: '#2872F6',
            secondary: '#6EAAFF',
            accent: '#FF6B6B',
            bg: '#F0F4FF',
            text: '#1A2040',
            muted: '#D4DFFF',
        },
        font: "'DM Sans', sans-serif",
        vibe: 'Modern & Playful',
        mockNav: ['Créneaux', 'Tournois', 'Outils', 'Profil'],
        mockHeroTitle: 'TRACK EVERY\nSHOT.',
        mockHeroSub: 'Créneaux, tournois, classements. Le padel simplifié.',
        mockCta: 'C\'EST PARTI',
        mockFeatures: [
            { icon: '🎾', label: 'Dispos live' },
            { icon: '📍', label: 'Tous les clubs' },
            { icon: '🧮', label: 'Calcul points FFT' },
            { icon: '🔔', label: 'Alertes créneau' },
        ],
    },
];

function BrandCard({ brand, isActive, onClick }: { brand: Brand; isActive: boolean; onClick: () => void }) {
    return (
        <button
            className={`brand-tab ${isActive ? 'active' : ''}`}
            onClick={onClick}
            style={{
                '--tab-color': brand.colors.primary,
                '--tab-bg': isActive ? brand.colors.primary : 'transparent',
                '--tab-text': isActive ? '#fff' : brand.colors.text,
            } as React.CSSProperties}
        >
            <img src={brand.logo} alt={brand.name} className="brand-tab-logo" />
            <span>{brand.name}</span>
        </button>
    );
}

function MockApp({ brand }: { brand: Brand }) {
    return (
        <div
            className="mock-app"
            style={{
                '--brand-primary': brand.colors.primary,
                '--brand-secondary': brand.colors.secondary,
                '--brand-accent': brand.colors.accent,
                '--brand-bg': brand.colors.bg,
                '--brand-text': brand.colors.text,
                '--brand-muted': brand.colors.muted,
                '--brand-font': brand.font,
                fontFamily: brand.font,
            } as React.CSSProperties}
        >
            {/* Mock Navbar */}
            <nav className="mock-nav">
                <div className="mock-nav-logo">
                    <img src={brand.logo} alt="" className="mock-nav-logo-img" />
                    <span className="mock-nav-brand">{brand.name}</span>
                </div>
                <div className="mock-nav-links">
                    {brand.mockNav.map(item => (
                        <span key={item} className="mock-nav-link">{item}</span>
                    ))}
                </div>
                <button className="mock-nav-cta">Connexion</button>
            </nav>

            {/* Mock Hero */}
            <section className="mock-hero">
                <div className="mock-hero-content">
                    <h1 className="mock-hero-title">
                        {brand.mockHeroTitle.split('\n').map((line, i) => (
                            <span key={i}>{line}<br /></span>
                        ))}
                    </h1>
                    <p className="mock-hero-sub">{brand.mockHeroSub}</p>
                    <button className="mock-hero-cta">{brand.mockCta}</button>
                </div>
                <div className="mock-hero-visual">
                    <img src={brand.logo} alt="" className="mock-hero-logo-float" />
                </div>
            </section>

            {/* Mock Features */}
            <section className="mock-features">
                {brand.mockFeatures.map(f => (
                    <div key={f.label} className="mock-feature-card">
                        <span className="mock-feature-icon">{f.icon}</span>
                        <span className="mock-feature-label">{f.label}</span>
                    </div>
                ))}
            </section>

            {/* Mock Slot Card */}
            <section className="mock-slots">
                <h2 className="mock-section-title">Créneaux disponibles — Mercredi 4 mars</h2>
                <div className="mock-slot-list">
                    {[
                        { time: '18:00', club: 'Big Padel', price: '48€', court: 'Terrain 3' },
                        { time: '19:30', club: '3D Padel', price: '52€', court: 'Court A' },
                        { time: '20:00', club: 'Padel 33', price: '44€', court: 'Piste 2' },
                    ].map(slot => (
                        <div key={slot.time + slot.club} className="mock-slot-card">
                            <div className="mock-slot-time">{slot.time}</div>
                            <div className="mock-slot-info">
                                <div className="mock-slot-club">{slot.club}</div>
                                <div className="mock-slot-court">{slot.court} · 90 min · Indoor</div>
                            </div>
                            <div className="mock-slot-price">{slot.price}</div>
                            <button className="mock-slot-btn">RÉSERVER</button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Vibe label */}
            <div className="mock-vibe-badge">{brand.vibe}</div>
        </div>
    );
}

export default function BrandsPage() {
    const [activeIdx, setActiveIdx] = useState(0);
    const activeBrand = brands[activeIdx];

    return (
        <div className="brand-showcase">
            <header className="brand-showcase-header">
                <h1>🎾 Brand Identity Exploration</h1>
                <p>4 directions artistiques pour ta plateforme padel</p>
            </header>

            <div className="brand-tabs">
                {brands.map((b, i) => (
                    <BrandCard key={b.name} brand={b} isActive={i === activeIdx} onClick={() => setActiveIdx(i)} />
                ))}
            </div>

            <div className="brand-info-bar">
                <div className="brand-info-left">
                    <h2 className="brand-info-name" style={{ color: activeBrand.colors.primary }}>{activeBrand.name}</h2>
                    <p className="brand-info-tagline">{activeBrand.tagline}</p>
                </div>
                <p className="brand-info-desc">{activeBrand.description}</p>
                <div className="brand-color-swatches">
                    {Object.entries(activeBrand.colors).map(([key, val]) => (
                        <div key={key} className="brand-swatch">
                            <div className="brand-swatch-color" style={{ background: val }} />
                            <span className="brand-swatch-label">{key}</span>
                            <span className="brand-swatch-hex">{val}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="brand-mock-container">
                <MockApp brand={activeBrand} />
            </div>
        </div>
    );
}
