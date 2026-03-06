"use client";

import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO, addDays, startOfToday, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, Zap, Filter, X, ChevronLeft, ChevronRight, ChevronUp, Plus, MapPin, Calendar, Users, CheckCircle2, UserPlus, Share2, Check, Lock, Heart, Trash2, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
// Leaflet is loaded dynamically only client-side
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let L: any;
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    L = require('leaflet');
}
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supabase } from '../utils/supabase/client';
import { User } from '@supabase/supabase-js';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { logout, createPoll } from '@/app/auth/actions';
import DashboardView from './DashboardView';
import './ClubBookingInterface.css';

// Dynamic imports for Leaflet (SSR-incompatible)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

gsap.registerPlugin(ScrollTrigger);

// --- CONSTANTS ---
const TIMELINE_PICKER_HOURS = Array.from({ length: 17 }, (_, i) => i + 7);

const ALL_DAYS = Array.from({ length: 28 }, (_, i) => {
    const d = addDays(startOfToday(), i);
    return {
        key: format(d, 'yyyy-MM-dd'),
        date: d,
        dayName: format(d, 'EEEE', { locale: fr }).toUpperCase(),
        dateNum: format(d, 'd'),
        monthShort: format(d, 'MMM', { locale: fr })
    };
});

interface Slot {
    id: string;
    provider: string;
    centerName: string;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    price: number;
    currency: string;
    bookingUrl: string;
    courtName?: string;
    distance?: string;
    lat: number;
    lng: number;
    indoor?: boolean;
}

const bordeauxCoordinates: Record<string, [number, number]> = {
    'MB Padel': [44.90326, -0.49225],
    'Padel House': [44.85440, -0.52238],
    '3D Padel': [44.86906, -0.67104],
    'Ginga Stadium': [44.8181, -0.6780],
    'Big Padel': [44.82874, -0.6793],
    '4PADEL': [44.8911, -0.5448],
    'UCPA Sport Station': [44.8624, -0.5484],
    'Padel 33': [44.8519, -0.5750],
    'Squashbad33': [44.88893, -0.54437],
    'THE PADEL': [44.7973, -0.5297],
    'Buenavista': [44.7746, -0.3523],
    'Tennis Club de Bordeaux': [44.8371, -0.5960],
    'USTCT Talence': [44.8020, -0.5915],
    'MY PADEL': [44.6684, -0.2974],
};

// Auto-fit map bounds to visible club markers
function MapAutoFit({ clusters }: { clusters: { lat: number; lng: number }[] }) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useMap } = require('react-leaflet');
    const map = useMap();
    useEffect(() => {
        if (clusters.length === 0 || !L) return;
        const bounds = L.latLngBounds(clusters.map(c => [c.lat, c.lng] as [number, number]));
        // If only 1 club, keep a general Bordeaux-level view (maxZoom 13)
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: true });
    }, [clusters, map]);
    return null;
}

// --- HELPER COMPONENTS ---

function InteractiveCalendarCard() {
    const [selectedDate, setSelectedDate] = useState<number | null>(null);
    const [tapScaleDate, setTapScaleDate] = useState<number | null>(null);

    // Hour row state
    const [selectedHour, setSelectedHour] = useState<string | null>(null);
    const [tapScaleHour, setTapScaleHour] = useState<string | null>(null);

    // Slots row state
    const [tapScaleTime, setTapScaleTime] = useState<string | null>(null);
    const [activeTime, setActiveTime] = useState<string | null>(null);

    // Cursor state
    const [cursorX, setCursorX] = useState('80%');
    const [cursorY, setCursorY] = useState('80%');
    const [cursorScale, setCursorScale] = useState(1);
    const [cursorOpacity, setCursorOpacity] = useState(0);

    useEffect(() => {
        let isActive = true;
        const runLoop = async () => {
            while (isActive) {
                // Séquence 1 : initial state
                setCursorOpacity(0);
                setCursorX('80%');
                setCursorY('80%');
                await new Promise(resolve => setTimeout(resolve, 800));
                if (!isActive) break;

                // Move cursor to "27"
                setCursorOpacity(1);
                setCursorX('35%'); // roughly 2nd item of 4
                setCursorY('20%');
                await new Promise(resolve => setTimeout(resolve, 600));
                if (!isActive) break;

                // Simulate "press" date
                setCursorScale(0.85);
                setTapScaleDate(27);
                await new Promise(resolve => setTimeout(resolve, 150));
                setTapScaleDate(null);
                setCursorScale(1);

                if (!isActive) break;
                setSelectedDate(27);

                // Move cursor to Hour "17h"
                await new Promise(resolve => setTimeout(resolve, 400));
                if (!isActive) break;

                setCursorX('15%'); // 1st item of 4
                setCursorY('50%');
                await new Promise(resolve => setTimeout(resolve, 600));
                if (!isActive) break;

                // Simulate "press" hour
                setCursorScale(0.85);
                setTapScaleHour('17h');
                await new Promise(resolve => setTimeout(resolve, 150));
                setTapScaleHour(null);
                setCursorScale(1);

                if (!isActive) break;
                setSelectedHour('17h');

                // Move cursor to Slot "17:30" (2nd item in row)
                await new Promise(resolve => setTimeout(resolve, 400));
                if (!isActive) break;

                setCursorX('40%');
                setCursorY('75%');
                await new Promise(resolve => setTimeout(resolve, 600));
                if (!isActive) break;

                // Simulate "press" slot
                setCursorScale(0.85);
                setTapScaleTime("17:30");
                await new Promise(resolve => setTimeout(resolve, 150));
                if (!isActive) break;

                setTapScaleTime(null);
                setCursorScale(1);
                setActiveTime("17:30");

                // Pause & Reset
                await new Promise(resolve => setTimeout(resolve, 2500));

                if (!isActive) break;
                setCursorOpacity(0);
                setActiveTime(null);
                setSelectedHour(null);
                setSelectedDate(null);

                await new Promise(resolve => setTimeout(resolve, 500));
            }
        };

        runLoop();
        return () => { isActive = false; };
    }, []);

    const days = [
        { label: 'JEU..', date: 26 },
        { label: 'VEN..', date: 27 },
        { label: 'SAM..', date: 28 },
        { label: 'DIM..', date: 1 }
    ];

    const hours = ['17h', '18h', '19h', '20h'];

    const slotsData = [
        { time: '17:00', price: '24€', clubs: '2 complexes' },
        { time: '17:30', price: '28€', clubs: '4 complexes' },
        { time: '18:00', price: '36€', clubs: '1 complexe' },
        { time: '18:30', price: '36€', clubs: '3 complexes' }
    ];

    return (
        <motion.div layout style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', width: '100%', justifyContent: 'center', minHeight: '180px', position: 'relative', pointerEvents: 'none' }}>
            <motion.div layout style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%', overflow: 'hidden' }}>
                {days.map((d) => {
                    const isSelected = selectedDate === d.date;
                    const isTapped = tapScaleDate === d.date;
                    const isPreselected = d.date === 28;

                    let bg = 'var(--off-white-clay)';
                    let color = 'var(--pitch-black)';
                    let border = '2px solid transparent';
                    let bottomText = null;

                    if (isSelected) {
                        bg = 'var(--pitch-black)';
                        color = '#fff';
                        bottomText = <div style={{ fontSize: '0.45rem', fontWeight: 800, marginTop: '2px', color: '#fff' }}>19H</div>;
                    } else if (isPreselected) {
                        bg = '#fff';
                        border = '2px solid var(--sun-blaze)';
                        bottomText = <div style={{ fontSize: '0.45rem', fontWeight: 800, marginTop: '2px', color: 'var(--sun-blaze)' }}>19H</div>;
                    }

                    return (
                        <motion.div
                            layout
                            key={d.date}
                            animate={{
                                background: bg,
                                color: color,
                                borderColor: border,
                                scale: isTapped ? 0.90 : 1
                            }}
                            transition={{ duration: 0.2, ease: "easeOut", layout: { type: "spring", stiffness: 300, damping: 30 } }}
                            style={{
                                flex: 1,
                                borderRadius: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.6rem 0',
                                border: '2px solid transparent'
                            }}
                        >
                            <div style={{ fontSize: '0.4rem', opacity: 0.8, marginBottom: '2px', fontWeight: 600 }}>{d.label}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{d.date}</div>
                            {bottomText && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    {bottomText}
                                </motion.div>
                            )}
                        </motion.div>
                    );
                })}
            </motion.div>

            <AnimatePresence>
                {selectedDate && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ layout: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                        style={{
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            marginTop: '1rem',
                            gap: '4rem'
                        }}
                    >
                        <motion.div
                            layout
                            style={{ display: 'flex', gap: '6px', width: '100%', overflow: 'hidden' }}
                        >
                            {hours.map(hour => {
                                const isTapped = tapScaleHour === hour;
                                const isSelected = selectedHour === hour;
                                return (
                                    <motion.div
                                        key={hour}
                                        animate={{
                                            scale: isTapped ? 0.95 : 1,
                                            background: isSelected ? 'var(--pitch-black)' : 'var(--off-white-clay)',
                                            color: isSelected ? '#fff' : 'var(--pitch-black)'
                                        }}
                                        transition={{ duration: 0.2 }}
                                        style={{
                                            flex: 1,
                                            fontSize: '0.65rem',
                                            padding: '0.4rem 0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '20px',
                                            fontWeight: 800
                                        }}
                                    >
                                        {hour}
                                    </motion.div>
                                );
                            })}
                        </motion.div>

                        <AnimatePresence>
                            {selectedHour && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    layout
                                    style={{ overflow: 'hidden' }}
                                >
                                    <motion.div
                                        initial="hidden"
                                        animate="visible"
                                        exit="hidden"
                                        variants={{
                                            visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
                                            hidden: { transition: { staggerChildren: 0.05, staggerDirection: -1 } }
                                        }}
                                        className="dp-timeline-scroll"
                                        style={{ display: 'flex', gap: '4rem', overflowX: 'visible', padding: '0.4rem 0', paddingLeft: '4px' }}
                                    >
                                        {slotsData.map(slot => {
                                            const isTapped = tapScaleTime === slot.time;
                                            const isActive = activeTime === slot.time;
                                            return (
                                                <motion.div
                                                    key={slot.time}
                                                    variants={{
                                                        hidden: { opacity: 0, y: 15 },
                                                        visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20 } }
                                                    }}
                                                    animate={{
                                                        scale: isTapped ? 0.92 : 1,
                                                        background: isActive ? 'var(--sun-blaze)' : '#fff',
                                                        color: isActive ? '#fff' : 'var(--pitch-black)',
                                                        borderColor: isActive ? 'var(--sun-blaze)' : 'rgba(0,0,0,0.05)',
                                                        boxShadow: isActive ? '0 8px 20px rgba(255,107,0,0.2)' : '0 4px 10px rgba(0,0,0,0.02)'
                                                    }}
                                                    className="dp-slot-card"
                                                    style={{ flexShrink: 0, width: '80px', margin: 0 }}
                                                >
                                                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.65rem', marginBottom: '2rem', color: isActive ? 'rgba(255,255,255,0.9)' : 'inherit' }}>{slot.time}</div>
                                                    <div style={{ fontSize: '1.05rem', fontWeight: 950 }}>{slot.price}</div>
                                                    <div style={{ fontSize: '0.55rem', opacity: isActive ? 0.9 : 0.6 }}>{slot.clubs}</div>
                                                </motion.div>
                                            );
                                        })}
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CURSOR for Calendar */}
            <motion.div
                animate={{ x: cursorX, y: cursorY, scale: cursorScale, opacity: cursorOpacity }}
                transition={{ type: 'spring', damping: 25, stiffness: 200, opacity: { duration: 0.2 } }}
                style={{
                    position: 'absolute',
                    zIndex: 999,
                    width: '24px',
                    height: '24px',
                    pointerEvents: 'none',
                    left: 0,
                    top: 0
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--pitch-black)" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                    <path d="M13 13l6 6" />
                </svg>
            </motion.div>

        </motion.div>
    );
}

function InteractiveBookingModalCard() {
    const [isHoveringOrTapping, setIsHoveringOrTapping] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Cursor position state
    const [cursorX, setCursorX] = useState('110%');
    const [cursorY, setCursorY] = useState('110%');
    const [cursorScale, setCursorScale] = useState(1);

    useEffect(() => {
        let isActive = true;
        const runLoop = async () => {
            while (isActive) {
                // Séquence 1 : Etat initial
                setCursorX('80%');
                setCursorY('120%');
                setShowModal(false);
                setIsHoveringOrTapping(false);
                await new Promise(resolve => setTimeout(resolve, 800));
                if (!isActive) break;

                // Move cursor to "RESERVER" on the first row
                setCursorX('78%');
                setCursorY('22%');
                await new Promise(resolve => setTimeout(resolve, 600));
                if (!isActive) break;

                // Séquence 2 : Simulation du clic (0.15s)
                setCursorScale(0.85);
                setIsHoveringOrTapping(true);
                await new Promise(resolve => setTimeout(resolve, 150));
                if (!isActive) break;

                setCursorScale(1);
                setIsHoveringOrTapping(false);

                // Séquence 3 : Apparition de la Modale (0.3s)
                setShowModal(true);

                await new Promise(resolve => setTimeout(resolve, 400));
                // Move cursor to middle of modal, passively reading
                setCursorX('50%');
                setCursorY('60%');

                // Séquence 4 : Pause
                await new Promise(resolve => setTimeout(resolve, 2000));
                if (!isActive) break;

                // Séquence 5 : Fermeture & Reset
                setShowModal(false);

                await new Promise(resolve => setTimeout(resolve, 800));
            }
        };

        runLoop();
        return () => { isActive = false; };
    }, []);

    const clubs = [
        { name: "Padel Club", desc: "Terrain 2 - 90 min - Indoor", price: "48€", target: true },
        { name: "UCPA Sport Station", desc: "Padel · 90 min · Indoor", price: "0€", target: false },
        { name: "4PADEL", desc: "Terrain 96fa113c · 120 min · Indoor", price: "80€", target: false }
    ];

    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>

            {/* COUCHE 1 : Arrière-plan (La Liste) */}
            <motion.div
                style={{ width: '90%', display: 'flex', flexDirection: 'column', zIndex: 1, background: '#fff', borderRadius: '1rem', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}
            >
                {clubs.map((club, idx) => (
                    <div key={idx} style={{
                        padding: '0.8rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: 'var(--pitch-black)',
                        borderBottom: idx !== clubs.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none'
                    }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <div style={{ width: 16, height: 16, borderRadius: '4px', border: '2px solid rgba(0,0,0,0.15)', background: 'transparent' }} />
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 900 }}>{club.name}</div>
                                <div style={{ fontSize: '0.5rem', fontWeight: 800, color: 'rgba(0,0,0,0.4)', marginTop: '2px' }}>{club.desc}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4rem' }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: 950, color: '#FF6B00' }}>{club.price}</div>
                            <motion.div
                                animate={{
                                    scale: (club.target && isHoveringOrTapping) ? 0.95 : 1,
                                    background: (club.target && (cursorX === '78%' && cursorY === '22%')) ? 'var(--sun-blaze)' : 'var(--pitch-black)'
                                }}
                                transition={{ duration: 0.2 }}
                                style={{ color: '#fff', fontSize: '0.55rem', fontWeight: 900, padding: '8px 14px', borderRadius: '99px' }}
                            >
                                RÉSERVER
                            </motion.div>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* CURSOR - Put it at the root of the card so it floats above everything easily */}
            <motion.div
                animate={{ x: cursorX, y: cursorY, scale: cursorScale }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{
                    position: 'absolute',
                    zIndex: 999,
                    width: '24px',
                    height: '24px',
                    pointerEvents: 'none',
                    left: 0,
                    top: 0
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--pitch-black)" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                    <path d="M13 13l6 6" />
                </svg>
            </motion.div>

            {/* COUCHE 2 : Overlay et Modale */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        style={{ position: 'absolute', inset: -20, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {/* Overlay sombre */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(24, 24, 27, 0.9)' }}
                        />

                        {/* Modale */}
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            style={{ background: '#fff', borderRadius: '2rem', padding: '1.5rem', width: '85%', maxWidth: '300px', zIndex: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                        >
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,107,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                                <Zap size={20} fill="#FF6B00" stroke="none" />
                            </div>

                            <div style={{ fontSize: '1rem', fontWeight: 950, color: 'var(--pitch-black)', lineHeight: 1.1 }}>RÉSERVATION LIVE</div>
                            <div style={{ fontSize: '1rem', fontWeight: 950, color: '#FF6B00', marginBottom: '2rem' }}>Padel Club</div>

                            <p style={{ fontSize: '0.55rem', fontWeight: 600, color: '#888', textAlign: 'center', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                                Confirmez-vous la réservation pour le Terrain 2 en Indoor (90 min) ?
                            </p>

                            <div style={{ display: 'flex', width: '100%', gap: '0.5rem' }}>
                                <div style={{ flex: 1, padding: '0.6rem', borderRadius: '99px', background: '#fff', border: '2px solid var(--pitch-black)', color: 'var(--pitch-black)', fontSize: '0.6rem', fontWeight: 900, textAlign: 'center' }}>
                                    RETOUR
                                </div>
                                <div style={{ flex: 1, padding: '0.6rem', borderRadius: '99px', background: '#FF6B00', color: '#fff', fontSize: '0.6rem', fontWeight: 900, textAlign: 'center' }}>
                                    CONTINUER ➔
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}


function InteractiveGroupPollCard() {
    const [checkedState, setCheckedState] = useState([false, false, false]);
    const [showFAB, setShowFAB] = useState(false);
    const [btnFABCli, setBtnFABCli] = useState(false);
    const [viewB, setViewB] = useState(false);
    const [btnInviteCli, setBtnInviteCli] = useState(false);
    const [counterScale, setCounterScale] = useState(1);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        let isActive = true;
        const runLoop = async () => {
            while (isActive) {
                setIsFadingOut(false);
                setCheckedState([false, false, false]);
                setShowFAB(false);
                setViewB(false);
                setBtnFABCli(false);
                setBtnInviteCli(false);
                setCounterScale(1);

                await new Promise(r => setTimeout(r, 800));
                if (!isActive) break;

                // Checked 1
                setCheckedState([true, false, false]);
                setShowFAB(true);
                setCounterScale(1.3);
                setTimeout(() => { if (isActive) setCounterScale(1) }, 150);

                await new Promise(r => setTimeout(r, 800));
                if (!isActive) break;

                // Checked 2
                setCheckedState([true, true, false]);
                setCounterScale(1.3);
                setTimeout(() => { if (isActive) setCounterScale(1) }, 150);

                await new Promise(r => setTimeout(r, 800));
                if (!isActive) break;

                // Checked 3
                setCheckedState([true, true, true]);
                setCounterScale(1.3);
                setTimeout(() => { if (isActive) setCounterScale(1) }, 150);

                await new Promise(r => setTimeout(r, 800));
                if (!isActive) break;

                setBtnFABCli(true);
                await new Promise(r => setTimeout(r, 150));
                if (!isActive) break;
                setBtnFABCli(false);

                setViewB(true);

                await new Promise(r => setTimeout(r, 1200));
                if (!isActive) break;

                setBtnInviteCli(true);
                await new Promise(r => setTimeout(r, 150));
                if (!isActive) break;
                setBtnInviteCli(false);

                await new Promise(r => setTimeout(r, 2000));
                if (!isActive) break;

                setIsFadingOut(true);
                await new Promise(r => setTimeout(r, 600));
            }
        };
        runLoop();
        return () => { isActive = false; };
    }, []);

    const pollSlots = [
        { name: 'UCPA Sport Station', desc: 'Padel · 90 min', date: 'Jeu 27', time: '17:30', price: '0€' },
        { name: 'Padel House', desc: 'Court 3 DFA · 90 min', date: 'Ven 28', time: '18:00', price: '32€' },
        { name: '4PADEL', desc: 'Terrain Indoor · 120 min', date: 'Sam 1', time: '10:00', price: '48€' }
    ];

    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', pointerEvents: 'none' }}>
            <AnimatePresence>
                {!viewB && (
                    <motion.div
                        key="viewA"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isFadingOut ? 0 : 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.4 }}
                        style={{ position: 'absolute', inset: 0, padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                    >
                        {pollSlots.map((s, i) => (
                            <div key={i} style={{ background: '#fff', borderRadius: '0.8rem', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                                <motion.div
                                    animate={{
                                        backgroundColor: checkedState[i] ? 'var(--sun-blaze)' : 'transparent',
                                        borderColor: checkedState[i] ? 'var(--sun-blaze)' : 'rgba(0,0,0,0.15)'
                                    }}
                                    style={{ width: 18, height: 18, borderRadius: '4px', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <AnimatePresence>
                                        {checkedState[i] && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                                <Check size={12} color="#fff" strokeWidth={3} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--pitch-black)' }}>{s.name}</div>
                                    <div style={{ fontSize: '0.55rem', opacity: 0.6, fontWeight: 700, color: 'var(--pitch-black)' }}>{s.desc}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 950, color: '#FF6B00' }}>{s.price}</div>
                                    <div style={{ background: 'var(--pitch-black)', color: '#fff', fontSize: '0.5rem', fontWeight: 900, padding: '6px 12px', borderRadius: '99px' }}>
                                        RÉSERVER
                                    </div>
                                </div>
                            </div>
                        ))}

                        <AnimatePresence>
                            {showFAB && (
                                <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 50, opacity: 0 }}
                                    transition={{ type: 'spring', damping: 20 }}
                                    style={{ position: 'absolute', bottom: '1.25rem', left: '10%', right: '10%', background: 'var(--pitch-black)', borderRadius: '99px', padding: '0.6rem 0.6rem 0.6rem 0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <motion.div animate={{ scale: counterScale }} style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--sun-blaze)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                                            {checkedState.filter(Boolean).length}
                                        </motion.div>
                                        <div style={{ color: '#fff', fontSize: '0.55rem', fontWeight: 900, maxWidth: '100px', lineHeight: 1.1 }}>CRÉNEAUX SÉLECTIONNÉS</div>
                                    </div>
                                    <motion.div animate={{ scale: btnFABCli ? 0.95 : 1 }} style={{ background: 'var(--sun-blaze)', color: '#fff', fontSize: '0.6rem', fontWeight: 900, padding: '0.5rem 0.8rem', borderRadius: '99px' }}>
                                        SONDAGE AMIS ➔
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {viewB && (
                    <motion.div
                        key="viewB"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: isFadingOut ? 0 : 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{ position: 'absolute', inset: 0, background: 'var(--off-white-clay)', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column' }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--pitch-black)', opacity: 0.5, marginBottom: '2rem', fontWeight: 800 }}>
                            <ChevronLeft size={16} />
                            <span style={{ fontSize: '0.6rem' }}>RETOUR AUX CRÉNEAUX</span>
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 950, lineHeight: 1, color: 'var(--pitch-black)', marginBottom: '2rem', fontFamily: 'var(--font-heading)' }}>
                            SONDAGE<br /><span style={{ color: 'var(--sun-blaze)' }}>DISPO.</span>
                        </div>

                        {/* Slots List cascade */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                            {pollSlots.map((s, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + i * 0.1, duration: 0.4, type: 'spring', damping: 20 }}
                                    style={{ background: '#fff', borderRadius: '0.6rem', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                        <Calendar size={18} color="rgba(0,0,0,0.4)" strokeWidth={2.5} />
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--pitch-black)' }}>{s.date} à {s.time}</div>
                                            <div style={{ fontSize: '0.55rem', fontWeight: 800, opacity: 0.5, color: 'var(--pitch-black)' }}>{s.name}</div>
                                        </div>
                                    </div>
                                    <motion.div whileHover={{ scale: 1.1 }} style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '50%', padding: '0.3rem' }}>
                                        <X size={14} color="var(--pitch-black)" opacity={0.6} strokeWidth={3} />
                                    </motion.div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Validation Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.5, type: 'spring', damping: 20 }}
                            style={{ background: 'var(--pitch-black)', borderRadius: '1.2rem', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', gap: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
                        >
                            <div>
                                <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 950, marginBottom: '2px' }}>Inviter des joueurs</div>
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.55rem', fontWeight: 700 }}>Partage ce sondage</div>
                            </div>
                            <motion.div animate={{ scale: btnInviteCli ? 0.95 : 1 }} style={{ background: 'var(--sun-blaze)', color: '#fff', fontSize: '0.65rem', fontWeight: 950, padding: '0.6rem 1.2rem', borderRadius: '99px', flexShrink: 0 }}>
                                INVITER
                            </motion.div>
                        </motion.div>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function ClubBookingInterface({ user, initialPollId }: { user: User | null, initialPollId?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const guestNameParam = searchParams.get('guest');

    // --- STATE ---
    const [view, setView] = useState<'home' | 'results' | 'poll' | 'profile' | 'dashboard'>(
        initialPollId ? 'poll' : (user ? 'dashboard' : 'home')
    );

    // Strict separation: if logged in, never show home. If not, never show dashboard.
    useEffect(() => {
        if (user && view === 'home') {
            setView('dashboard');
        } else if (!user && view === 'dashboard') {
            setView('home');
        }
    }, [user, view]);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [userStats, setUserStats] = useState({ matchesPlayed: 12, rating: 4.5, level: 'Intermédiaire' });
    const [userPolls, setUserPolls] = useState<any[]>([]);
    const [pollId, setPollId] = useState<string | null>(initialPollId || null);
    const [pollCreatorId, setPollCreatorId] = useState<string | null>(null);
    const [pollCreatorName, setPollCreatorName] = useState<string>('Organisateur');
    const [voterName, setVoterName] = useState(() => {
        if (typeof window !== 'undefined') {
            return guestNameParam || localStorage.getItem('padelspot_guest_name') || '';
        }
        return guestNameParam || '';
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && voterName) {
            localStorage.setItem('padelspot_guest_name', voterName);
        }
    }, [voterName]);
    const [showGuestNameModal, setShowGuestNameModal] = useState(false);
    const [isVotesDirty, setIsVotesDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showSelectedModal, setShowSelectedModal] = useState(false);
    const [targetVoters, setTargetVoters] = useState(4);
    const [friends, setFriends] = useState<any[]>([]);
    const [newFriendName, setNewFriendName] = useState('');

    // Nouveaux champs profil
    const [profileFields, setProfileFields] = useState({
        firstName: '',
        lastName: '',
        maxDistance: 25,
        preferredSide: 'left' as 'left' | 'right' | 'both'
    });

    // Liste des clubs disponibles pour ajout favoris (uniquement ceux scrappés/connus)
    const availableClubs = useMemo(() => {
        const fromSlots = Array.from(new Set(slots.map(s => s.centerName)));
        const fromRef = Object.keys(bordeauxCoordinates);
        // On fusionne les deux sources pour n'avoir que le réel
        return Array.from(new Set([...fromSlots, ...fromRef])).sort();
    }, [slots]);

    const [pollVotes, setPollVotes] = useState<any[]>([]);
    const [isLoadingPoll, setIsLoadingPoll] = useState(false);

    // Post-Booking Flow States
    const [showBookingConfirmation, setShowBookingConfirmation] = useState<{ id: string, clubName: string, slot?: Slot } | null>(null);
    const [showAddPlayersModal, setShowAddPlayersModal] = useState(false);
    const [currentReservationId, setCurrentReservationId] = useState<string | null>(null);
    const [addedPlayers, setAddedPlayers] = useState<string[]>([]);
    const [newPlayerName, setNewPlayerName] = useState('');

    useEffect(() => {
        if (pollId && view === 'poll') {
            const fetchPollData = async () => {
                console.log("Fetching poll data for ID:", pollId);
                setIsLoadingPoll(true);
                try {
                    // Step 1: Attempt to get poll metadata
                    const { data: pollData, error: pError } = await supabase
                        .from('polls')
                        .select('target_voters_count, user_id, creator_name')
                        .eq('id', pollId)
                        .single();

                    if (pollData) {
                        setTargetVoters(pollData.target_voters_count || 4);
                        const cId = pollData.user_id;
                        setPollCreatorId(cId);
                        setPollCreatorName(pollData.creator_name || 'Organisateur');
                    } else {
                        console.warn("Could not fetch poll metadata, check RLS or ID:", pError);
                    }

                    // Step 2: Fetch Slot IDs (The most important part for visibility)
                    const { data: psData, error: psError } = await supabase
                        .from('poll_slots')
                        .select('slot_id')
                        .eq('poll_id', pollId);

                    if (psError) console.error("Poll slots fetch error:", psError);

                    const slotIds = psData?.map((ps: any) => ps.slot_id) || [];
                    console.log("Slot IDs found for this poll:", slotIds);
                    setSelectedSlots(slotIds);

                    if (slotIds.length > 0) {
                        // Step 3: Fetch Full Slot Details
                        const { data: sData, error: sError } = await supabase
                            .from('slots')
                            .select('*')
                            .in('id', slotIds);

                        if (sError) console.error("Slots details fetch error:", sError);

                        if (sData) {
                            const enriched = sData.map((slot: any) => {
                                let normalizedName = slot.center_name;
                                let coords = bordeauxCoordinates[slot.center_name];
                                if (!coords) {
                                    const entry = Object.entries(bordeauxCoordinates).find(([key]) =>
                                        slot.center_name.toUpperCase().includes(key.toUpperCase()) ||
                                        key.toUpperCase().includes(slot.center_name.toUpperCase())
                                    );
                                    if (entry) {
                                        coords = entry[1];
                                        normalizedName = entry[0];
                                    }
                                }
                                return {
                                    id: slot.id,
                                    provider: slot.provider,
                                    centerName: normalizedName,
                                    courtName: slot.court_name,
                                    startTime: new Date(slot.start_time),
                                    endTime: new Date(slot.end_time),
                                    durationMinutes: slot.duration_minutes,
                                    price: parseFloat(slot.price),
                                    currency: slot.currency,
                                    bookingUrl: slot.booking_url,
                                    lat: coords?.[0] || 44.84,
                                    lng: coords?.[1] || -0.57
                                };
                            });

                            setSlots(prev => {
                                const map = new Map(prev.map(s => [s.id, s]));
                                enriched.forEach(s => map.set(s.id, s));
                                return Array.from(map.values());
                            });
                        }
                    }

                    // Step 4: Fetch Votes
                    // Explicit select to avoid 400 errors if some columns are missing
                    const { data: vData, error: vError } = await supabase
                        .from('poll_votes')
                        .select('id, slot_id, user_name, vote_value')
                        .eq('poll_id', pollId);

                    if (vError) console.error("Votes fetch error:", vError);
                    if (vData) setPollVotes(vData);

                    // Name prompting logic for guests
                    if (!user && !voterName) {
                        setShowGuestNameModal(true);
                    }
                } catch (err) {
                    console.error("Critical error in fetchPollData:", err);
                } finally {
                    setIsLoadingPoll(false);
                }
            };
            fetchPollData();
        }
    }, [pollId, view, user, voterName]);

    useEffect(() => {
        if (user && view === 'profile') {
            const fetchPolls = async () => {
                const { data, error } = await supabase
                    .from('polls')
                    .select(`
                        id,
                        created_at,
                        poll_slots (
                            slot_id
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    setUserPolls(data);
                }
            };
            fetchPolls();
        }
    }, [user, view]);
    const [isMobileMapView, setIsMobileMapView] = useState(false);
    const [showMap, setShowMap] = useState(true);
    const [externalBookingSlot, setExternalBookingSlot] = useState<Slot | null>(null);
    const [isSticky, setIsSticky] = useState(false);

    // Filters
    const [durationFilter, setDurationFilter] = useState<string>('90');
    const [matchTypeFilter, setMatchTypeFilter] = useState<'all' | '1v1' | '2v2'>('2v2');
    const [onlyFavorites, setOnlyFavorites] = useState(false);

    // Hero Search State
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

    // UI State
    const [expandedDays, setExpandedDays] = useState<Record<string, string>>({});
    const [dayLimits, setDayLimits] = useState<Record<string, number>>({});
    const [windowStart, setWindowStart] = useState(0);
    const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
    const [pollViewMode, setPollViewMode] = useState<'list' | 'calendar'>('list');
    const [previousView, setPreviousView] = useState<'home' | 'results' | 'poll' | 'profile' | 'dashboard'>('results');

    // Update view helper to track history
    const navigateTo = (newView: 'home' | 'results' | 'poll' | 'profile' | 'dashboard') => {
        let targetView = newView;

        // Block invalid transitions
        if (user && targetView === 'home') targetView = 'dashboard';
        if (!user && targetView === 'dashboard') targetView = 'home';

        if (targetView === 'poll' && view !== 'poll') {
            savedResultsSelection.current = selectedSlots;
        }
        if (view === 'poll' && (targetView === 'results' || targetView === 'dashboard')) {
            setSelectedSlots(savedResultsSelection.current);
        }
        if (targetView === 'results' && (view === 'home' || view === 'dashboard')) {
            setSelectedSlots([]);
        }
        setPreviousView(view);
        setView(targetView);
    };

    // Ref to preserve results selection when entering poll view
    const savedResultsSelection = useRef<string[]>([]);

    // Refs
    const calbarRef = useRef<HTMLDivElement>(null);
    const courtRef = useRef<SVGSVGElement>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const searchTriggerRef = useRef<HTMLDivElement>(null);
    const timeRowRef = useRef<HTMLDivElement>(null);

    // Selections per day
    const [selections, setSelections] = useState<{ dayIndex: number, hour: number, minute: number }[]>([
        { dayIndex: 1, hour: 19, minute: 0 }
    ]);



    // --- COMPUTED ---
    const allFilteredSlots = useMemo(() => {
        return slots.filter((slot) => {
            const d = slot.startTime;
            const slotTotalMins = d.getHours() * 60 + d.getMinutes();
            // Use local date string for the key to match ALL_DAYS keys
            const dayKey = format(d, 'yyyy-MM-dd');
            const sel = selections.find(s => ALL_DAYS[s.dayIndex].key === dayKey);
            if (!sel) return false;

            const selTotalMins = sel.hour * 60 + sel.minute;
            // Let's show everything from the selected hour until the end of that day (up to 18 hours later)
            const isTimeMatch = (slotTotalMins >= selTotalMins - 60 && slotTotalMins <= selTotalMins + 1080);

            const isDurationMatch = durationFilter === 'all' || slot.durationMinutes === parseInt(durationFilter);

            const is1v1 = slot.courtName ? (slot.courtName.toLowerCase().includes('simple') || slot.courtName.toLowerCase().includes('1v1')) : false;
            const is2v2 = !is1v1;
            const isMatchTypeMatch = matchTypeFilter === 'all' || (matchTypeFilter === '1v1' && is1v1) || (matchTypeFilter === '2v2' && is2v2);

            const isFavoriteMatch = !onlyFavorites || favorites.includes(slot.centerName);

            if (dayKey === '2026-03-19') {
                // Log only for the problematic day
                // console.log(`Slot at ${slot.startTime} match?`, { isTimeMatch, isDurationMatch, isMatchTypeMatch, isFavoriteMatch });
            }

            return isTimeMatch && isDurationMatch && isMatchTypeMatch && isFavoriteMatch;
        });
    }, [slots, selections, durationFilter, matchTypeFilter, onlyFavorites, favorites]);

    const filteredSlots = useMemo(() => {
        return allFilteredSlots.filter(slot => {
            const d = slot.startTime;
            const dayKey = format(d, 'yyyy-MM-dd');
            const sel = selections.find(s => ALL_DAYS[s.dayIndex].key === dayKey);
            if (!sel) return false;

            const slotTotalMins = d.getHours() * 60 + d.getMinutes();
            const selStartMins = sel.hour * 60 + sel.minute;
            return slotTotalMins >= selStartMins && slotTotalMins < selStartMins + 1 * 60; // 1h window
        });
    }, [allFilteredSlots, selections]);

    const dailyGroups = useMemo(() => {
        const daysGroup: Record<string, any[]> = {};
        allFilteredSlots.forEach(slot => {
            const dayKey = format(slot.startTime, 'yyyy-MM-dd');
            if (!daysGroup[dayKey]) daysGroup[dayKey] = [];

            const timeKey = format(slot.startTime, 'HH:mm');
            let timeGroup = daysGroup[dayKey].find(g => g.time === timeKey);
            if (!timeGroup) {
                timeGroup = { time: timeKey, slots: [] };
                daysGroup[dayKey].push(timeGroup);
            }
            timeGroup.slots.push(slot);
        });

        selections.forEach(sel => {
            const key = ALL_DAYS[sel.dayIndex].key;
            if (!daysGroup[key]) daysGroup[key] = [];
        });

        return Object.keys(daysGroup).sort().map(date => ({
            date,
            timeGroups: daysGroup[date].sort((a, b) => a.time.localeCompare(b.time)).map(g => {
                const clubs: Record<string, Slot[]> = {};
                g.slots.forEach((s: Slot) => {
                    if (!clubs[s.centerName]) clubs[s.centerName] = [];
                    clubs[s.centerName].push(s);
                });
                const uniqueClubSlots = Object.values(clubs).map(cs => cs.sort((a, b) => a.durationMinutes - b.durationMinutes)[0]);
                return { ...g, slots: uniqueClubSlots, fullSlots: g.slots };
            })
        }));
    }, [filteredSlots, selections]);

    const clubClusters = useMemo(() => {
        const clusters: Record<string, any> = {};
        filteredSlots.forEach((slot: Slot) => {
            if (!clusters[slot.centerName]) {
                clusters[slot.centerName] = { centerName: slot.centerName, lat: slot.lat, lng: slot.lng, slots: [], minPrice: slot.price || 999 };
            }
            clusters[slot.centerName].slots.push(slot);
            if (slot.price < clusters[slot.centerName].minPrice) clusters[slot.centerName].minPrice = slot.price;
        });
        return Object.values(clusters);
    }, [filteredSlots]);

    const selectedBeforeCount = selections.filter(s => s.dayIndex < windowStart).length;
    const selectedAfterCount = selections.filter(s => s.dayIndex >= windowStart + 7).length;

    // --- LOGIC: Post-Booking Flow ---
    const handleConfirmBooking = async (confirmed: boolean) => {
        if (!showBookingConfirmation || !user) {
            setShowBookingConfirmation(null);
            return;
        }

        if (confirmed) {
            const { slot } = showBookingConfirmation;
            if (slot) {
                // Save to DB
                try {
                    const { data, error } = await supabase.from('reservations').insert({
                        user_id: user.id,
                        slot_id: slot.id,
                        center_name: slot.centerName,
                        court_name: slot.courtName,
                        start_time: slot.startTime.toISOString(),
                        duration_minutes: slot.durationMinutes,
                        price: slot.price
                    }).select().single();

                    if (!error && data) {
                        setCurrentReservationId(data.id);
                        setAddedPlayers([]);
                        setShowAddPlayersModal(true);
                    } else {
                        console.error("Error saving reservation:", error);
                    }
                } catch (err) {
                    console.error("Critical error saving reservation:", err);
                }
            }
        }
        setShowBookingConfirmation(null);
    };

    const handleAddPlayer = async () => {
        if (!currentReservationId || !newPlayerName.trim()) return;

        const pName = newPlayerName.trim();
        const { error } = await supabase.from('reservation_players').insert({
            reservation_id: currentReservationId,
            player_name: pName
        });

        if (!error) {
            setAddedPlayers(prev => [...prev, pName]);
            setNewPlayerName('');
        } else {
            console.error("Error adding player:", error);
        }
    };

    const handleInviteFriendToReservation = async (friendName: string) => {
        if (!currentReservationId) return;
        const { error } = await supabase.from('reservation_players').insert({
            reservation_id: currentReservationId,
            player_name: friendName
        });

        if (!error) {
            setAddedPlayers(prev => [...prev, friendName]);
        }
    };

    // --- EFFECTS ---
    // Detect return from external booking site
    useEffect(() => {
        const handleFocus = () => {
            const pending = localStorage.getItem('padelspot_pending_reservation');
            if (pending) {
                try {
                    const data = JSON.parse(pending);
                    // Only show if it matches the current user (if logged in) and is recent (2h)
                    if (Date.now() - data.timestamp < 2 * 60 * 60 * 1000) {
                        // We need the slot details. If it was stored, we use it.
                        setShowBookingConfirmation({
                            id: data.id,
                            clubName: data.clubName,
                            slot: data.slot ? {
                                ...data.slot,
                                startTime: new Date(data.slot.startTime),
                                endTime: new Date(data.slot.endTime)
                            } : undefined
                        });
                    }
                } catch (e) { console.error("Error parsing pending reservation:", e); }
                localStorage.removeItem('padelspot_pending_reservation');
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    useEffect(() => {
        if (!user) {
            setFavorites([]);
            setProfileFields({ firstName: '', lastName: '', maxDistance: 25, preferredSide: 'left' });
            setUserPolls([]);
            return;
        }

        const fetchUserData = async () => {
            try {
                // Fetch Favorites
                const { data: favs, error: favError } = await supabase
                    .from('favorites')
                    .select('club_name')
                    .eq('user_id', user.id);

                if (!favError && favs) {
                    setFavorites(favs.map(f => f.club_name));
                }

                // Fetch Friends
                const { data: frds } = await supabase
                    .from('friends')
                    .select('*')
                    .eq('user_id', user.id);
                if (frds) setFriends(frds);

                // Fetch Profile
                const { data: prof, error: profError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (!profError && prof) {
                    setProfileFields({
                        firstName: prof.first_name || '',
                        lastName: prof.last_name || '',
                        maxDistance: prof.max_distance || 25,
                        preferredSide: prof.preferred_side || 'left'
                    });
                }
            } catch (err) {
                console.error('Erreur lors du chargement des données utilisateur:', err);
            }
        };

        fetchUserData();
    }, [user]);

    useEffect(() => {
        if (view === 'results') {
            const fetchSlots = async () => {
                try {
                    const fetchToday = startOfToday();
                    const fetchStartStr = fetchToday.toISOString();
                    const fetchEndStr = addDays(fetchToday, 21).toISOString();

                    let allSupabaseSlots: any[] = [];
                    let from = 0;
                    let to = 999;
                    let hasMore = true;

                    while (hasMore) {
                        const { data, error } = await supabase
                            .from('slots')
                            .select('*')
                            .gte('start_time', fetchStartStr)
                            .lte('start_time', fetchEndStr)
                            .order('start_time', { ascending: true })
                            .range(from, to);

                        if (error) {
                            console.error('Error fetching Supabase slots:', error);
                            hasMore = false;
                            break;
                        }

                        if (data && data.length > 0) {
                            allSupabaseSlots = [...allSupabaseSlots, ...data];
                            if (data.length < 1000) {
                                hasMore = false;
                            } else {
                                from += 1000;
                                to += 1000;
                            }
                        } else {
                            hasMore = false;
                        }
                    }

                    const enrichedSlots = (allSupabaseSlots || []).map((slot: any) => {
                        let normalizedName = slot.center_name;
                        let coords = bordeauxCoordinates[slot.center_name];
                        if (!coords) {
                            const entry = Object.entries(bordeauxCoordinates).find(([key]) =>
                                slot.center_name.toUpperCase().includes(key.toUpperCase()) ||
                                key.toUpperCase().includes(slot.center_name.toUpperCase())
                            );
                            if (entry) {
                                coords = entry[1];
                                normalizedName = entry[0];
                            }
                        }
                        return {
                            id: slot.id,
                            provider: slot.provider,
                            centerName: normalizedName,
                            courtName: slot.court_name,
                            startTime: new Date(slot.start_time),
                            endTime: new Date(slot.end_time),
                            durationMinutes: slot.duration_minutes,
                            price: parseFloat(slot.price),
                            currency: slot.currency,
                            bookingUrl: slot.booking_url,
                            lat: coords?.[0] || 44.84,
                            lng: coords?.[1] || -0.57 + Math.random() * 0.05
                        };
                    });
                    setSlots(enrichedSlots);
                } catch (err) { console.error(err); }
            };
            fetchSlots();
        }
    }, [view, selections]);

    // Sticky Search Logic
    useEffect(() => {
        const handleScroll = () => {
            if (searchTriggerRef.current) {
                const triggerPos = searchTriggerRef.current.getBoundingClientRect().top;
                setIsSticky(triggerPos <= 24);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // GSAP Animations
    useLayoutEffect(() => {
        if (view !== 'home') return;
        if (courtRef.current) {
            gsap.fromTo(courtRef.current.querySelectorAll('line, rect, path'),
                { strokeDasharray: 2000, strokeDashoffset: 2000 },
                { strokeDashoffset: 0, duration: 4, ease: 'expo.out', stagger: 0.1 }
            );
        }
        return () => { ScrollTrigger.getAll().forEach(t => t.kill()); };
    }, [view]);

    // Auto-expand first slot for each selection
    useEffect(() => {
        if (view === 'results' && dailyGroups.length > 0) {
            setExpandedDays(prev => {
                const next = { ...prev };
                let changed = false;
                selections.forEach(sel => {
                    const dateKey = ALL_DAYS[sel.dayIndex].key;
                    // Auto-expand ONLY if the day hasn't been handled yet (prevents re-opening on manual close)
                    if (!(dateKey in next)) {
                        const timeStr = `${String(sel.hour).padStart(2, '0')}:${String(sel.minute).padStart(2, '0')}`;
                        const dayData = dailyGroups.find(dg => dg.date === dateKey);
                        const group = dayData?.timeGroups.find((tg: any) => tg.time === timeStr);

                        if (group && group.slots.length > 0) {
                            next[dateKey] = timeStr;
                            changed = true;
                        } else {
                            // Mark as handled even if no slot found, to avoid retrying every render
                            next[dateKey] = '';
                        }
                    }
                });
                return changed ? next : prev;
            });
        }
    }, [view, selections, dailyGroups]);

    // Handle Time Picker scroll on open
    useEffect(() => {
        if (editingDayIndex !== null && timeRowRef.current) {
            const sel = selections.find(s => s.dayIndex === editingDayIndex);
            const targetHour = sel?.hour || 19;
            const btn = timeRowRef.current.querySelector(`.time-btn-${targetHour}`);
            if (btn) {
                const containerWidth = timeRowRef.current.offsetWidth;
                const btnLeft = (btn as HTMLElement).offsetLeft;
                const btnWidth = (btn as HTMLElement).offsetWidth;
                timeRowRef.current.scrollLeft = btnLeft - (containerWidth / 2) + (btnWidth / 2);
            }
        }
    }, [editingDayIndex, selections]);

    // Close popovers on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (editingDayIndex !== null && calbarRef.current && !calbarRef.current.contains(target)) {
                setEditingDayIndex(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [editingDayIndex]);

    // --- ACTIONS ---
    const handleDayClick = (absIndex: number) => {
        const dateKey = ALL_DAYS[absIndex].key;
        const exists = selections.find(s => s.dayIndex === absIndex);
        if (exists) {
            setEditingDayIndex(editingDayIndex === absIndex ? null : absIndex);
        } else {
            setEditingDayIndex(absIndex);
            // Prepare for expansion
            setExpandedDays(prev => ({ ...prev, [dateKey]: '19:00' }));
            setSelections(prev => [...prev, { dayIndex: absIndex, hour: 19, minute: 0 }].sort((a, b) => a.dayIndex - b.dayIndex));

            setTimeout(() => {
                document.getElementById('day-section-' + dateKey)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    };

    const navigateCalendar = (dir: 'left' | 'right') => {
        if (dir === 'left') setWindowStart(Math.max(0, windowStart - 7));
        else setWindowStart(Math.min(ALL_DAYS.length - 7, windowStart + 7));
    };

    const updateTime = (hour: number) => {
        if (editingDayIndex === null) return;
        const dateKey = ALL_DAYS[editingDayIndex].key;
        const timeStr = `${String(hour).padStart(2, '0')}:00`;

        // Immediate UI feedback for expansion
        setExpandedDays(prev => ({ ...prev, [dateKey]: timeStr }));
        setSelections(prev => prev.map(s => s.dayIndex === editingDayIndex ? { ...s, hour, minute: 0 } : s));
        setEditingDayIndex(null);
    };

    const toggleSlotSelection = (slotId: string) => {
        if (!user) {
            setShowAuthModal(true);
            return;
        }
        setSelectedSlots(prev => prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]);
    };

    const toggleFavorite = async (clubName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            router.push('/login?message=Connectez-vous pour ajouter des favoris');
            return;
        }

        const isFav = favorites.includes(clubName);
        if (isFav) {
            setFavorites(prev => prev.filter(f => f !== clubName));
            const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('club_name', clubName);
            if (error) console.error("Erreur suppression favori:", error);
        } else {
            setFavorites(prev => [...prev, clubName]);
            const { error } = await supabase.from('favorites').insert({ user_id: user.id, club_name: clubName });
            if (error) console.error("Erreur ajout favori:", error);
        }
    };

    const updateProfile = async (updates: Partial<typeof profileFields>) => {
        if (!user) return;
        const newFields = { ...profileFields, ...updates };
        setProfileFields(newFields);

        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            first_name: newFields.firstName,
            last_name: newFields.lastName,
            max_distance: newFields.maxDistance,
            preferred_side: newFields.preferredSide,
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.error("Erreur sauvegarde profil:", error);
        }
    };

    const handlePollCreation = async () => {
        if (!user) {
            router.push('/login?message=Connectez-vous pour créer un sondage');
            return;
        }
        const res = await createPoll(selectedSlots, targetVoters);
        if (res.id) {
            setPollId(res.id);
            setPollCreatorId(user.id);
            setPollCreatorName(profileFields.firstName || user.email?.split('@')[0] || 'Organisateur');
            navigateTo('poll');
        } else {
            console.error("Erreur création sondage:", res.error);
            alert("Impossible de créer le sondage. Assurez-vous d'avoir bien collé le script update_db.sql dans Supabase !\n\nDétail de l'erreur: " + res.error);
        }
    };

    const addFriend = async () => {
        if (!user || !newFriendName.trim()) return;
        const { data, error } = await supabase.from('friends').insert({
            user_id: user.id,
            friend_name: newFriendName.trim()
        }).select().single();

        if (!error && data) {
            setFriends(prev => [...prev, data]);
            setNewFriendName('');
        }
    };

    const removeFriend = async (friendId: string) => {
        const { error } = await supabase.from('friends').delete().eq('id', friendId);
        if (!error) {
            setFriends(prev => prev.filter(f => f.id !== friendId));
        }
    };

    const handleDeletePoll = async () => {
        if (!pollId || !confirm('Supprimer ce sondage ? Cette action est irréversible.')) return;
        await deleteGeneralPoll(pollId);
        navigateTo(user ? 'dashboard' : 'home');
    };

    const deleteGeneralPoll = async (id: string) => {
        if (!confirm('Supprimer ce sondage ?')) return;
        await supabase.from('poll_votes').delete().eq('poll_id', id);
        await supabase.from('poll_slots').delete().eq('poll_id', id);
        await supabase.from('polls').delete().eq('id', id);
        setUserPolls(prev => prev.filter(p => p.id !== id));
        if (pollId === id) setPollId(null);
    };

    const handleVote = async (slotId: string) => {
        const name = user ? (profileFields.firstName || user.email?.split('@')[0]) : voterName;
        if (!name) {
            alert("Merci de renseigner votre nom pour voter !");
            return;
        }

        const existing = pollVotes.find(v => v.slot_id === slotId && v.user_name === name);
        if (existing) {
            // Remove vote
            setPollVotes(prev => prev.filter(v => v.id !== existing.id));
            await supabase.from('poll_votes').delete().eq('id', existing.id);
        } else {
            // Add vote
            const newVote = { poll_id: pollId, slot_id: slotId, user_name: name };
            const { data, error } = await supabase.from('poll_votes').insert(newVote).select().single();
            if (!error && data) {
                setPollVotes(prev => [...prev, data]);
            } else {
                // Local fallback for dev
                setPollVotes(prev => [...prev, { id: Math.random().toString(), ...newVote }]);
            }
        }
    };

    const renderTimelineDaySlots = (day: any) => {
        const limit = dayLimits[day.date] || 4;
        const sel = selections.find(s => ALL_DAYS[s.dayIndex].key === day.date);
        const baseHour = sel?.hour || 19;

        const slotsToDisplay: any[] = [];
        for (let i = 0; i < limit; i++) {
            const totalMins = baseHour * 60 + i * 15;
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            const group = day.timeGroups.find((g: any) => g.time === timeStr);
            slotsToDisplay.push({ type: group ? 'available' : 'empty', time: timeStr, group });
        }

        return (
            <div className="dp-timeline-scroll" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '0.4rem 0' }}>
                {slotsToDisplay.map((item) => {
                    const isExpanded = expandedDays[day.date] === item.time;
                    const hasSelected = item.group?.slots.some((s: Slot) => selectedSlots.includes(s.id));

                    return (
                        <div key={item.time} className="dp-timeline-col" style={{ flexShrink: 0 }}>
                            <div
                                className={`dp-slot-card ${isExpanded ? 'active' : ''} ${hasSelected ? 'selected' : ''} ${item.type === 'empty' ? 'empty' : ''}`}
                                onClick={() => {
                                    if (item.type === 'available') {
                                        setExpandedDays(prev => ({
                                            ...prev,
                                            [day.date]: isExpanded ? '' : item.time
                                        }));
                                    }
                                }}
                            >
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.1rem', letterSpacing: '-0.02em' }}>{item.time}</div>
                                {item.type === 'available' ? (
                                    <>
                                        <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{Math.min(...item.group.slots.map((s: any) => s.price))}€</div>
                                        <div style={{ fontSize: '0.55rem', opacity: 0.6 }}>{item.group.slots.length} complexes</div>
                                    </>
                                ) : (
                                    <div style={{ fontSize: '0.55rem', opacity: 0.4 }}>COMPLET</div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {limit < 12 && (
                    <div className="dp-timeline-col" style={{ flexShrink: 0 }}>
                        <div
                            className="dp-plus-card"
                            onClick={() => setDayLimits(prev => ({ ...prev, [day.date]: limit + 4 }))}
                            style={{ background: 'none', border: 'none', boxShadow: 'none' }}
                        >
                            <Plus size={16} />
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, marginTop: '2px' }}>VOIR PLUS</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="dp-app-root">
            <div className="bg-grain-overlay" />

            <AnimatePresence mode="wait">
                {view === 'dashboard' && user && (
                    <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <DashboardView
                            user={user}
                            onNavigateToSearch={() => navigateTo('results')}
                            onViewPoll={(id) => { setPollId(id); navigateTo('poll'); }}
                            onNavigateToSettings={() => navigateTo('profile')}
                            selections={selections}
                            setSelections={setSelections}
                        />
                    </motion.div>
                )}

                {view === 'home' && (
                    <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                        {/* HERO SECTION */}
                        <section className="landing-hero" ref={heroRef}>
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3], x: [0, 50, 0] }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(255,107,0,0.1) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }}
                            />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2], y: [0, -50, 0] }}
                                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(255,107,0,0.15) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0 }}
                            />

                            <div className="home-navbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                                <div className="home-logo" style={{ color: '#fff', position: 'relative', top: 'auto', left: 'auto' }}>
                                    <Zap fill="var(--sun-blaze)" stroke="none" size={28} />
                                    PADELSPOT
                                </div>
                                <div className="navbar-auth">
                                    {user ? (
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <button
                                                onClick={() => navigateTo('dashboard')}
                                                style={{
                                                    width: 42, height: 42, borderRadius: '14px',
                                                    background: 'var(--sun-blaze)', color: '#fff', border: 'none',
                                                    fontSize: '1rem', fontWeight: 950, cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 10px 20px rgba(255,107,0,0.2)',
                                                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                {profileFields.firstName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                                            </button>
                                        </div>
                                    ) : (
                                        <Link href="/login" style={{ background: 'var(--sun-blaze)', color: '#fff', textDecoration: 'none', padding: '0.6rem 1.2rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900 }}>
                                            CONNEXION
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {/* Redone SVG Padel Court Simple Grid with Glowing Trace */}
                            <svg className="hero-court-svg" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: '5%', width: '90%', height: '90%', pointerEvents: 'none', zIndex: 1, transform: 'rotate(90deg)' }}>
                                <rect x="0" y="0" width="100" height="100" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                                <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                                <line x1="25" y1="0" x2="25" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                                <line x1="75" y1="0" x2="75" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

                                {/* Glowing Trail (Diffused) */}
                                <motion.path
                                    d="M 1 1 L 1 99 L 99 99 L 99 1 L 1 1 L 1 99"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.4)"
                                    strokeWidth="1.5"
                                    strokeDasharray="25 375"
                                    strokeLinecap="round"
                                    animate={{ strokeDashoffset: [400, 0] }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                    style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' }}
                                />

                                {/* Bright Core Point at the front of the trail */}
                                <motion.path
                                    d="M 1 1 L 1 99 L 99 99 L 99 1 L 1 1 L 1 99"
                                    fill="none"
                                    stroke="#fff"
                                    strokeWidth="2.5"
                                    strokeDasharray="2 398"
                                    strokeLinecap="round"
                                    animate={{ strokeDashoffset: [400 + 25, 0 + 25] }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                    style={{ filter: 'drop-shadow(0 0 10px #fff)' }}
                                />
                            </svg>

                            <div className="hero-title-group" style={{ zIndex: 2 }}>
                                <h1 className="hero-title-main" style={{ color: '#fff' }}>JOUE.</h1>
                                <p className="hero-title-sub" style={{ color: '#fff' }}>quand tu veux, où tu veux.</p>
                            </div>

                            <div
                                className="hero-search-wrapper"
                                ref={searchTriggerRef}
                                style={{
                                    minHeight: '80px',
                                    zIndex: 9999, width: '100%', maxWidth: '100%',
                                }}
                            >
                                <div style={{
                                    position: isSticky ? 'fixed' : 'relative',
                                    width: '100%',
                                    maxWidth: '800px',
                                    top: isSticky ? '1.5rem' : 'auto',
                                    left: '0',
                                    right: '0',
                                    margin: '0 auto',
                                    transform: isSticky ? 'scale(0.95)' : 'none',
                                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                    zIndex: 9999,
                                    padding: '0 1rem'
                                }}>
                                    <div className="hero-search-capsule" style={{ background: isSticky ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)', boxShadow: isSticky ? '0 10px 40px rgba(0,0,0,0.2)' : '0 30px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
                                        <div className="search-field-capsule" style={{ flex: 1, minWidth: 0, padding: '0.5rem 1rem' }}>
                                            <label>Localisation</label>
                                            <span className="value" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Bordeaux</span>
                                        </div>
                                        <div style={{ width: 1, margin: '10px 0', background: 'rgba(0,0,0,0.1)' }} />
                                        <div className="search-field-capsule" onClick={() => { setIsDatePickerOpen(!isDatePickerOpen); setIsTimePickerOpen(false); }} style={{ cursor: 'pointer', flex: 1, minWidth: 0, padding: '0.5rem 1rem' }}>
                                            <label>Quand ?</label>
                                            <span className="value" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{format(ALL_DAYS[selections[0].dayIndex].date, 'EEE d MMM', { locale: fr })}</span>
                                        </div>
                                        <div style={{ width: 1, margin: '10px 0', background: 'rgba(0,0,0,0.1)' }} />
                                        <div className="search-field-capsule" onClick={() => { setIsTimePickerOpen(!isTimePickerOpen); setIsDatePickerOpen(false); }} style={{ cursor: 'pointer', flex: 1, minWidth: 0, padding: '0.5rem 1rem' }}>
                                            <label>Heure</label>
                                            <span className="value" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selections[0].hour}h00</span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', padding: '0.2rem' }}>
                                            <button className="hero-search-btn" onClick={() => navigateTo('results')} style={{ margin: 0, padding: '1.2rem 2.2rem', whiteSpace: 'nowrap' }}>RECHERCHER</button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {isDatePickerOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                style={{ position: 'absolute', top: '120%', left: '50%', transform: 'translateX(-50%)', background: '#fff', borderRadius: '1.5rem', padding: '1.5rem', width: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem', border: '1px solid rgba(0,0,0,0.05)', zIndex: 10001 }}
                                            >
                                                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((dayStr, i) => (
                                                    <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 900, color: '#aaa', marginBottom: '2rem' }}>{dayStr}</div>
                                                ))}
                                                {Array.from({ length: parseISO(ALL_DAYS[0].key).getDay() === 0 ? 6 : parseISO(ALL_DAYS[0].key).getDay() - 1 }).map((_, i) => <div key={`empty-${i}`} />)}
                                                {ALL_DAYS.slice(0, 21).map((day, i) => (
                                                    <button
                                                        key={day.key}
                                                        onClick={() => { setSelections([{ dayIndex: i, hour: selections[0].hour, minute: selections[0].minute }]); setIsDatePickerOpen(false); }}
                                                        style={{
                                                            width: '100%', aspectRatio: '1/1', borderRadius: '50%', border: 'none', background: selections[0].dayIndex === i ? 'var(--sun-blaze)' : 'transparent',
                                                            color: selections[0].dayIndex === i ? '#fff' : 'var(--pitch-black)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                    >
                                                        {day.dateNum}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}

                                        {isTimePickerOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                style={{ position: 'absolute', top: '120%', right: '10%', background: '#fff', borderRadius: '1.5rem', padding: '1.5rem', width: '280px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', border: '1px solid rgba(0,0,0,0.05)', zIndex: 10001 }}
                                            >
                                                {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
                                                    <button
                                                        key={h}
                                                        onClick={() => { setSelections([{ dayIndex: selections[0].dayIndex, hour: h, minute: 0 }]); setIsTimePickerOpen(false); }}
                                                        style={{
                                                            padding: '0.5rem 0', borderRadius: '8px', border: selections[0].hour === h ? '2px solid var(--sun-blaze)' : '2px solid transparent',
                                                            background: selections[0].hour === h ? 'rgba(255,107,0,0.05)' : 'var(--off-white-clay)', color: 'var(--pitch-black)', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer'
                                                        }}
                                                    >
                                                        {h}h
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </section>

                        <div style={{ background: 'var(--off-white-clay)' }}>
                            <div className="section-title" style={{ color: 'var(--pitch-black)' }}>Expérience Padelspot</div>
                            <section className="home-features-grid">

                                {/* Card 1: Multi-Day Slot Picker */}
                                <div className="app-card">
                                    <div className="app-card-type"><MapPin size={12} /> Planification sur mesure</div>
                                    <h3 className="app-card-title">Sélection<br /><span style={{ color: 'var(--sun-blaze)' }}>multi-jours.</span></h3>
                                    <div className="app-card-preview">
                                        <div className="animate-mini-app" style={{ display: 'flex', flexDirection: 'column', width: '100%', justifyContent: 'center', position: 'relative', minHeight: '180px' }}>
                                            <InteractiveCalendarCard />
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Instant Club Availability */}
                                <div className="app-card" style={{ background: 'var(--pitch-black)', color: '#fff' }}>
                                    <div className="app-card-type" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}><Zap size={12} /> Temps réel</div>
                                    <h3 className="app-card-title" style={{ color: '#fff' }}>Disponibilité<br /><span style={{ color: 'var(--aqua-volt)' }}>immédiate.</span></h3>
                                    <div className="app-card-preview" style={{ background: 'var(--pitch-black)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div className="animate-mini-app" style={{ display: 'flex', flexDirection: 'column', width: '100%', justifyContent: 'center', pointerEvents: 'none', position: 'relative', minHeight: '180px' }}>
                                            <InteractiveBookingModalCard />
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3: Group Rally Poll */}
                                <div className="app-card">
                                    <div className="app-card-type"><Users size={12} /> Sans friction</div>
                                    <h3 className="app-card-title">Sondage<br />de <span style={{ color: 'var(--sun-blaze)' }}>groupe.</span></h3>
                                    <div className="app-card-preview" style={{ background: 'var(--off-white-clay)' }}>
                                        <div className="animate-mini-app" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', pointerEvents: 'none', position: 'relative', minHeight: '350px' }}>
                                            <InteractiveGroupPollCard />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section D: COMMUNITY SECTION */}
                            <section className="community-section" style={{ background: 'var(--pitch-black)', padding: '6rem 2rem' }}>
                                <div className="community-text-split" style={{ color: '#fff' }}>LE PADEL,</div>
                                <div className="community-text-split" style={{ color: '#fff' }}>C'EST DU JEU.</div>

                                <motion.div
                                    style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--sun-blaze)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4rem auto' }}
                                    whileInView={{ rotate: 360, scale: [0.8, 1.1, 1] }}
                                    transition={{ duration: 0.8 }}
                                    viewport={{ once: false, amount: 0.5 }}
                                >
                                    <Zap color="var(--sun-blaze)" size={32} />
                                </motion.div>

                                <div className="community-text-sub">mais aussi une vibe.</div>
                            </section>

                            {/* Section F: MEMBERSHIP & FOOTER */}
                            <section className="membership-section">
                                <div className="section-title" style={{ color: 'var(--pitch-black)' }}>Rejoignez le mouvement</div>
                                <div className="tier-grid">
                                    <div className="tier-card">
                                        <div className="tier-title">Découverte</div>
                                        <div className="tier-price">0€<span style={{ fontSize: '1rem', opacity: 0.5 }}>/mo</span></div>
                                        <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '2rem' }}>Recherche de créneaux et sondages entre amis illimités.</p>
                                        <button style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '12px', background: 'var(--off-white-clay)', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Créer un compte</button>
                                    </div>

                                    <div className="tier-card premium">
                                        <div className="tier-title" style={{ color: 'var(--sun-blaze)' }}>Régulier</div>
                                        <div className="tier-price">9€<span style={{ fontSize: '1rem', opacity: 0.5 }}>/mo</span></div>
                                        <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '2rem', color: '#fff' }}>Alertes SMS en temps réel, stats de jeu et accès tournois.</p>
                                        <button style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '12px', background: '#fff', color: 'var(--pitch-black)', border: 'none', fontWeight: 900, cursor: 'pointer' }}>Passer Premium</button>
                                    </div>

                                    <div className="tier-card">
                                        <div className="tier-title">Ambassadeur</div>
                                        <div className="tier-price">29€<span style={{ fontSize: '1rem', opacity: 0.5 }}>/mo</span></div>
                                        <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '2rem' }}>Pour les capitaines d'équipe. Organisation simplifiée et conciergerie.</p>
                                        <button style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '12px', background: 'var(--off-white-clay)', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Contacter</button>
                                    </div>
                                </div>
                            </section>

                            <footer className="app-footer" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                    <span style={{ color: '#fff', fontWeight: 900 }}>PADELSPOT</span>
                                    <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confidentialité</Link>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div className="status-dot" />
                                    Tous les clubs connectés
                                </div>
                            </footer>
                        </div>
                    </motion.div>
                )}

                {view === 'results' && (
                    <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dp-results-layout">
                        <div className={`dp-left ${isMobileMapView ? 'hide-on-mobile' : ''} ${!showMap ? 'full-width-desktop' : ''}`}>
                            <div className="dp-sticky-header">
                                <div className="results-header-top-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 950, fontSize: '1.35rem', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }} onClick={() => navigateTo(user ? 'dashboard' : 'home')}>
                                            <Zap fill="var(--sun-blaze)" stroke="none" size={26} /> PadelSpot
                                        </div>
                                    </div>

                                    <div className="dp-filters-row" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        <div style={{ background: 'rgba(0,0,0,0.06)', padding: '0.5rem 1.25rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                                            {filteredSlots.length} CRÉNEAUX LIVE
                                        </div>
                                        <div style={{ width: 1, height: 20, background: '#eee', margin: '0 0.25rem' }} />
                                        <button
                                            onClick={() => setOnlyFavorites(!onlyFavorites)}
                                            style={{
                                                background: onlyFavorites ? 'var(--sun-blaze)' : '#fff',
                                                color: onlyFavorites ? '#fff' : 'inherit',
                                                padding: '0.5rem 1.25rem',
                                                borderRadius: '999px',
                                                border: '1px solid rgba(0,0,0,0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <Heart size={12} fill={onlyFavorites ? "#fff" : "none"} /> Favoris
                                        </button>
                                        <div style={{ width: 1, height: 20, background: '#eee', margin: '0 0.25rem' }} />

                                        <select
                                            value={durationFilter}
                                            onChange={(e) => setDurationFilter(e.target.value)}
                                            style={{
                                                background: '#fff',
                                                color: 'inherit',
                                                border: '1px solid rgba(0,0,0,0.1)',
                                                borderRadius: '999px',
                                                padding: '0.5rem 1.25rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 900,
                                                cursor: 'pointer',
                                                outline: 'none',
                                                WebkitAppearance: 'none',
                                                MozAppearance: 'none',
                                                appearance: 'none',
                                                textAlign: 'center'
                                            }}
                                        >
                                            <option value="all">Toutes durées</option>
                                            <option value="60">60 min</option>
                                            <option value="90">90 min</option>
                                            <option value="120">120 min</option>
                                        </select>

                                        <div style={{ width: 1, height: 20, background: '#eee', margin: '0 0.25rem' }} />

                                        <button
                                            onClick={() => setMatchTypeFilter(matchTypeFilter === '2v2' ? '1v1' : '2v2')}
                                            style={{
                                                background: 'var(--sun-blaze)',
                                                color: '#fff',
                                                border: '1px solid rgba(0,0,0,0.1)',
                                                borderRadius: '999px',
                                                padding: '0.5rem 1.25rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 900,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem'
                                            }}
                                        >
                                            <Users size={12} /> {matchTypeFilter === '1v1' ? 'Solo (1v1)' : 'Double (2v2)'}
                                        </button>

                                        <div style={{ width: 1, height: 20, background: '#eee', margin: '0 0.25rem' }} />

                                        {!showMap && (
                                            <button
                                                className="desktop-map-toggle"
                                                onClick={() => setShowMap(true)}
                                                style={{
                                                    background: '#fff',
                                                    color: 'inherit',
                                                    border: '1px solid rgba(0,0,0,0.1)',
                                                    borderRadius: '999px',
                                                    padding: '0.5rem 1.25rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 900,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem'
                                                }}
                                            >
                                                <MapPin size={12} /> Carte
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="results-calendar-row">
                                    <div className="results-calendar-area" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} ref={calbarRef}>
                                        <div className="cal-nav-group">
                                            {selectedBeforeCount > 0 && <div className="cal-nav-badge">{selectedBeforeCount}</div>}
                                            <button className="cal-nav-btn" onClick={() => navigateCalendar('left')} disabled={windowStart === 0} style={{ opacity: windowStart === 0 ? 0.2 : 1 }}><ChevronLeft size={28} /></button>
                                        </div>

                                        <div className="dp-calbar" style={{ flex: 1, display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                            {ALL_DAYS.slice(windowStart, windowStart + 7).map((d) => {
                                                const absIdx = ALL_DAYS.findIndex(ad => ad.key === d.key);
                                                const sel = selections.find(s => s.dayIndex === absIdx);
                                                const isSelected = !!sel;
                                                const isEditing = editingDayIndex === absIdx;
                                                return (
                                                    <div key={d.key} style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
                                                        <div
                                                            className={`dp-date-pill ${isSelected ? 'active' : ''} ${isEditing ? 'editing' : ''}`}
                                                            onClick={() => handleDayClick(absIdx)}
                                                            style={{ width: '100%', height: '80px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}
                                                        >
                                                            {isSelected && (
                                                                <div
                                                                    className="dp-date-remove-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelections(prev => prev.filter(s => s.dayIndex !== absIdx));
                                                                        if (editingDayIndex === absIdx) setEditingDayIndex(null);
                                                                    }}
                                                                >
                                                                    <X size={12} />
                                                                </div>
                                                            )}
                                                            <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', opacity: isSelected ? 0.8 : 0.6, letterSpacing: '0.05em', marginBottom: '2px', color: isSelected && !isEditing ? '#fff' : 'var(--pitch-black)' }}>{d.dayName.slice(0, 3)}</div>
                                                            <div style={{ fontSize: '1.5rem', fontWeight: 950, lineHeight: 1, letterSpacing: '-0.02em', color: isSelected && !isEditing ? '#fff' : 'var(--pitch-black)' }}>{d.dateNum}</div>
                                                            {isSelected && <div style={{ fontSize: '0.65rem', fontWeight: 950, marginTop: '6px', color: '#fff', opacity: 0.8 }}>{sel?.hour}H</div>}
                                                        </div>

                                                        {isEditing && (
                                                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="dp-time-popover">
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                                                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.5, fontWeight: 900 }}>Session de jeu</div>
                                                                    <X size={18} onClick={() => setEditingDayIndex(null)} style={{ cursor: 'pointer' }} />
                                                                </div>
                                                                <div className="time-picker-row" ref={timeRowRef}>
                                                                    {TIMELINE_PICKER_HOURS.map(h => (
                                                                        <button
                                                                            key={h}
                                                                            className={`time-picker-btn time-btn-${h} ${sel?.hour === h ? 'active' : ''}`}
                                                                            onClick={() => updateTime(h)}
                                                                        >
                                                                            {h}h
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="cal-nav-group">
                                            {selectedAfterCount > 0 && <div className="cal-nav-badge">{selectedAfterCount}</div>}
                                            <button className="cal-nav-btn" onClick={() => navigateCalendar('right')} disabled={windowStart + 7 >= ALL_DAYS.length} style={{ opacity: windowStart + 7 >= ALL_DAYS.length ? 0.2 : 1 }}><ChevronRight size={28} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="dp-results-scroll">
                                {dailyGroups.map(day => (
                                    <div key={day.date} id={`day-section-${day.date}`} className="dp-day-section" style={{ marginBottom: '2.5rem' }}>
                                        <div className="dp-day-header" style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--pitch-black)', fontWeight: 900, marginBottom: '0.4rem', letterSpacing: '0.05em' }}>{format(parseISO(day.date), 'EEEE d MMMM', { locale: fr })}</div>
                                        {renderTimelineDaySlots(day)}

                                        <AnimatePresence>
                                            {expandedDays[day.date] && (
                                                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="dp-detail-panel" style={{ background: '#fff', borderRadius: '1.5rem', overflow: 'hidden', marginTop: '0.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.03)' }}>
                                                    {(() => {
                                                        const expandedTime = expandedDays[day.date];
                                                        const g = day.timeGroups.find((tg: any) => tg.time === expandedTime);
                                                        if (!g || g.slots.length === 0) return null;

                                                        const clubs: Record<string, Slot[]> = {};
                                                        g.fullSlots.forEach((s: Slot) => {
                                                            if (!clubs[s.centerName]) clubs[s.centerName] = [];
                                                            clubs[s.centerName].push(s);
                                                        });
                                                        return Object.entries(clubs).map(([clubName, info]) => {
                                                            const isAnySelected = info.some(s => selectedSlots.includes(s.id));
                                                            return (
                                                                <div key={clubName} className="dp-offer-item" onClick={() => toggleSlotSelection(info[0].id)} style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f2f2f2', background: isAnySelected ? 'rgba(255,107,0,0.05)' : 'none', cursor: 'pointer' }}>
                                                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '1.4rem', height: '1.4rem', border: `2px solid ${isAnySelected ? 'var(--sun-blaze)' : (user ? '#ddd' : 'rgba(0,0,0,0.1)')}`, background: isAnySelected ? 'var(--sun-blaze)' : (user ? '#fff' : 'rgba(0,0,0,0.02)'), borderRadius: '5px' }}>
                                                                            {isAnySelected && <CheckCircle2 size={16} color="#fff" style={{ display: 'block' }} />}
                                                                            {!user && !isAnySelected && <Lock size={12} color="rgba(0,0,0,0.3)" style={{ display: 'block' }} />}
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                <div style={{ fontWeight: 900, fontSize: '1rem' }}>{clubName}</div>
                                                                                <button
                                                                                    onClick={(e) => toggleFavorite(clubName, e)}
                                                                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                                >
                                                                                    <Heart
                                                                                        size={16}
                                                                                        fill={favorites.includes(clubName) ? "var(--sun-blaze)" : "none"}
                                                                                        color={favorites.includes(clubName) ? "var(--sun-blaze)" : "rgba(0,0,0,0.3)"}
                                                                                        strokeWidth={favorites.includes(clubName) ? 0 : 2}
                                                                                    />
                                                                                </button>
                                                                            </div>
                                                                            <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{info[0].courtName} · {info[0].durationMinutes} min · {info[0].indoor ? 'Indoor' : 'Outdoor'}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                                                                        <div style={{ fontSize: '3rem', fontWeight: 950, color: 'var(--sun-blaze)' }}>{info[0].price}€</div>
                                                                        <button onClick={(e) => { e.stopPropagation(); setExternalBookingSlot(info[0]); }} style={{ background: 'var(--pitch-black)', color: '#fff', border: 'none', padding: '0.65rem 1.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer' }}>RÉSERVER</button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>

                            {selectedSlots.length > 0 && (
                                <div className="dp-selection-bar" style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--pitch-black)', color: '#fff', padding: '1rem 1.25rem', borderRadius: '999px', width: 'auto', minWidth: 'min(90vw, 420px)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div
                                        onClick={() => setShowSelectedModal(true)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', flex: 1 }}
                                    >
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sun-blaze)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, fontSize: '1.2rem' }}>{selectedSlots.length}</div>
                                        <div style={{ marginRight: '1rem' }}>
                                            <div style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Voir la sélection <ChevronUp size={14} /></div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Prêts pour le sondage</div>
                                        </div>
                                    </div>
                                    <button onClick={handlePollCreation} style={{ background: 'var(--sun-blaze)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '999px', fontWeight: 950, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'transform 0.2s', whiteSpace: 'nowrap' }}>
                                        SONDAGE AMIS <ArrowRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {showMap && (
                            <div className={`dp-right ${!isMobileMapView ? 'hide-on-mobile' : ''}`}>
                                <MapContainer center={[44.86, -0.58]} zoom={12} className="variant-b-leaflet" zoomControl={false} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                    <MapAutoFit clusters={clubClusters} />
                                    {clubClusters.map((cluster: any) => {
                                        const isSelected = cluster.slots.some((s: Slot) => selectedSlots.includes(s.id));

                                        return (
                                            <Marker
                                                key={cluster.centerName}
                                                position={[cluster.lat, cluster.lng]}
                                                icon={L.divIcon({
                                                    className: `variant-b-map-club-bubble`,
                                                    html: `
                                                        <div style="
                                                            background: ${isSelected ? 'var(--sun-blaze)' : '#fff'}; 
                                                            color: ${isSelected ? '#fff' : 'var(--pitch-black)'};
                                                            border: 2px solid ${isSelected ? 'var(--sun-blaze)' : 'var(--pitch-black)'}; 
                                                            padding: 6px 14px; 
                                                            border-radius: 99px; 
                                                            font-weight: 950; 
                                                            font-size: 11px; 
                                                            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                                                            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                                                            transform: scale(${isSelected ? 1.1 : 1});
                                                            white-space: nowrap;
                                                            width: fit-content;
                                                            display: flex;
                                                            align-items: center;
                                                            justify-content: center;
                                                        ">
                                                            ${(() => {
                                                            const name = cluster.centerName.toLowerCase();
                                                            if (name.includes('house')) return 'PADEL HOUSE';
                                                            if (name.includes('mb')) return 'MB PADEL';
                                                            if (name.includes('big')) return 'BIG PADEL';
                                                            if (name.includes('padel 33')) return 'PADEL 33';
                                                            if (name.includes('4padel')) return '4PADEL';
                                                            if (name.includes('ucpa')) return 'UCPA';
                                                            if (name.includes('the padel')) return 'THE PADEL';
                                                            if (name.includes('buenavista')) return 'BUENAVISTA';
                                                            if (name.includes('ginga')) return 'GINGA';
                                                            if (name.includes('tennis club')) return 'TC BORDEAUX';
                                                            if (name.includes('ustct')) return 'USTCT';
                                                            if (name.includes('my padel')) return 'MY PADEL';
                                                            if (name.includes('3d')) return '3D PADEL';
                                                            return cluster.centerName.split(' ')[0].toUpperCase();
                                                        })()}
                                                        </div>
                                                    `,
                                                    iconSize: [120, 30],
                                                    iconAnchor: [60, 15],
                                                })}
                                            />
                                        );
                                    })}
                                </MapContainer>
                                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 1000 }}>
                                    <button
                                        className="desktop-map-toggle"
                                        onClick={() => setShowMap(false)}
                                        style={{
                                            background: 'var(--pitch-black)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '999px', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', cursor: 'pointer'
                                        }}
                                    >
                                        <X size={14} /> MASQUER LA CARTE
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Mobile Map/List Toggle FAB */}
                        <div className="mobile-map-toggle">
                            <button onClick={() => setIsMobileMapView(!isMobileMapView)} style={{ background: 'var(--pitch-black)', color: '#fff', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '999px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', pointerEvents: 'auto', zIndex: 99999, cursor: 'pointer' }}>
                                {isMobileMapView ? <><Zap size={16} /> LISTE</> : <><MapPin size={16} /> CARTE</>}
                            </button>
                        </div>
                    </motion.div>
                )}

                {view === 'poll' && (
                    <motion.div key="poll" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ padding: '0 0 5rem 0', background: '#FAFAFA', minHeight: '100vh' }}>
                        {(() => {
                            const isCreator = user?.id === pollCreatorId;
                            const pSlots = selectedSlots.map(id => slots.find(s => s.id === id)).filter(Boolean) as any[];
                            const sortedSlots = [...pSlots].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

                            const uniqueVotersSet = new Set(pollVotes.map(v => v.user_name));
                            // Add creator explicitly
                            uniqueVotersSet.add(pollCreatorName);
                            const voterCount = uniqueVotersSet.size;

                            const chaudVotesBySlot: Record<string, number> = {};

                            pollVotes.filter(v => v.vote_value === true).forEach(v => {
                                chaudVotesBySlot[v.slot_id] = (chaudVotesBySlot[v.slot_id] || 0) + 1;
                            });

                            // Ensure creator is counted for all slots IF not already in pollVotes (as a fallback for older polls)
                            pSlots.forEach(s => {
                                const creatorVoted = pollVotes.some(v => v.slot_id === s.id && (v.user_id === pollCreatorId || v.user_name === pollCreatorName));
                                if (!creatorVoted) {
                                    chaudVotesBySlot[s.id] = (chaudVotesBySlot[s.id] || 0) + 1;
                                }
                            });

                            const maxVotesOnASlot = Math.max(0, ...Object.values(chaudVotesBySlot));
                            const progress = Math.min((maxVotesOnASlot / targetVoters) * 100, 100);

                            // Get days that have slots for the mini-calendar
                            const slotsByDay = sortedSlots.reduce((acc: Record<string, any[]>, s) => {
                                const dayKey = format(s.startTime, 'yyyy-MM-dd');
                                if (!acc[dayKey]) acc[dayKey] = [];
                                acc[dayKey].push(s);
                                return acc;
                            }, {});
                            const activeDays = Object.keys(slotsByDay).sort();

                            const handleQuickVote = (slotId: string, isChaud: boolean) => {
                                const name = user ? (profileFields.firstName || user.email?.split('@')[0]) : voterName;
                                if (!name) {
                                    setShowGuestNameModal(true);
                                    return;
                                }

                                setIsVotesDirty(true);
                                const existing = pollVotes.find(v => v.slot_id === slotId && v.user_name === name);

                                if (existing && existing.vote_value === isChaud) {
                                    // Toggle off
                                    setPollVotes(prev => prev.filter(v => v.id !== existing.id));
                                    return;
                                }

                                if (existing) {
                                    // Switch vote directly
                                    setPollVotes(prev => prev.map(v => v.id === existing.id ? { ...v, vote_value: isChaud } : v));
                                } else {
                                    // Add new locally
                                    setPollVotes(prev => [...prev, {
                                        id: `temp-${Math.random()}`,
                                        poll_id: pollId,
                                        slot_id: slotId,
                                        user_name: name,
                                        vote_value: isChaud,
                                        is_temp: true
                                    }]);
                                }
                            };

                            const saveVotes = async () => {
                                setIsSaving(true);
                                const name = user ? (profileFields.firstName || user.email?.split('@')[0]) : voterName;
                                if (!name) {
                                    setIsSaving(false);
                                    return;
                                }

                                const myVotes = pollVotes.filter(v => v.user_name === name);

                                // Clean up old votes in DB for this user/poll
                                await supabase.from('poll_votes').delete().eq('poll_id', pollId).eq('user_name', name);

                                // Insert new votes
                                const votesToInsert = myVotes.map(v => ({
                                    poll_id: pollId,
                                    slot_id: v.slot_id,
                                    user_name: name,
                                    vote_value: v.vote_value
                                }));

                                const { data, error: insertError } = await supabase.from('poll_votes').insert(votesToInsert).select();
                                if (!insertError) {
                                    // Refresh local state with real IDs
                                    const others = pollVotes.filter(v => v.user_name !== name);
                                    setPollVotes([...others, ...(data || [])]);
                                    setIsVotesDirty(false);
                                    setSaveSuccess(true);
                                    setTimeout(() => setSaveSuccess(false), 3000);
                                }
                                setIsSaving(false);
                            };

                            const scrollToDay = (dayKey: string) => {
                                document.getElementById(`poll-day-${dayKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            };

                            return (
                                <>
                                    {/* STICKY HEADER */}
                                    <div style={{ position: 'sticky', top: 0, zIndex: 1000, background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', padding: '0.75rem 0' }}>
                                        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.25rem' }}>
                                            {/* LOGO & BACK BAR */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 950, fontSize: '1rem', textTransform: 'uppercase', cursor: 'pointer' }} onClick={() => navigateTo(user ? 'dashboard' : 'home')}>
                                                    <Zap fill="var(--sun-blaze)" stroke="none" size={20} /> PadelSpot
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    {!isCreator && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase' }}>Match de</div>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 950 }}>{pollCreatorName || 'Un pote'}</div>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => (initialPollId ? (user ? navigateTo('dashboard') : navigateTo('home')) : navigateTo(previousView || 'results'))}
                                                        style={{ background: 'rgba(0,0,0,0.04)', border: 'none', color: 'var(--pitch-black)', padding: '0.4rem 0.8rem', borderRadius: '99px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem' }}
                                                    >
                                                        <ChevronLeft size={14} /> RETOUR
                                                    </button>
                                                </div>
                                            </div>


                                            {/* MINI CALENDAR - Functional dots */}
                                            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem 0', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                                                {(() => {
                                                    const today = new Date();
                                                    // Start from today or beginning of current week? Let's stay with 14 days from today for polls.
                                                    return Array.from({ length: 14 }, (_, i) => {
                                                        const d = addDays(today, i);
                                                        const dKey = format(d, 'yyyy-MM-dd');
                                                        const hasActiveSlots = !!slotsByDay[dKey];
                                                        const isToday = isSameDay(d, today);

                                                        return (
                                                            <div
                                                                key={i}
                                                                onClick={() => hasActiveSlots && scrollToDay(dKey)}
                                                                style={{
                                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                                                    minWidth: '70px', cursor: hasActiveSlots ? 'pointer' : 'default',
                                                                    opacity: hasActiveSlots ? 1 : 0.2
                                                                }}
                                                            >
                                                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: isToday ? 'var(--sun-blaze)' : 'inherit' }}>
                                                                    {format(d, 'EEEE', { locale: fr }).toUpperCase()}
                                                                </div>
                                                                <div style={{ fontSize: '1rem', fontWeight: 950 }}>
                                                                    {format(d, 'd')}
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        width: 8, height: 8, borderRadius: '50%',
                                                                        background: hasActiveSlots ? 'var(--sun-blaze)' : 'rgba(0,0,0,0.1)',
                                                                        transform: hasActiveSlots ? 'scale(1.2)' : 'scale(1)',
                                                                        transition: 'all 0.2s',
                                                                        marginTop: '4px'
                                                                    }}
                                                                />
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>

                                        </div>
                                    </div>

                                    <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1.25rem' }}>
                                        {/* CREATOR DASHBOARD - HIGHLIGHTED COUNTER SINGLE LINE */}
                                        {isCreator && (
                                            <div style={{
                                                background: 'var(--pitch-black)',
                                                borderRadius: '1.25rem',
                                                padding: '0.75rem 1.25rem',
                                                marginBottom: '2rem',
                                                color: '#fff',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '1.5rem'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                    {/* Prominent Counter Pill */}
                                                    <div style={{
                                                        background: 'rgba(255,255,255,0.08)',
                                                        padding: '0.5rem 0.75rem',
                                                        borderRadius: '0.8rem',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        textAlign: 'center',
                                                        minWidth: '85px'
                                                    }}>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 950, color: 'var(--sun-blaze)', lineHeight: 1 }}>{voterCount} / {targetVoters}</div>
                                                        <div style={{ fontSize: '0.55rem', fontWeight: 900, opacity: 0.5, textTransform: 'uppercase', marginTop: '0.2rem', letterSpacing: '0.02em' }}>Réponses</div>
                                                    </div>

                                                    <div style={{ textAlign: 'left' }}>
                                                        <div style={{ fontSize: '0.95rem', fontWeight: 950, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            Invite tes potes ! 🎾
                                                        </div>
                                                        <p style={{ fontSize: '0.75rem', opacity: 0.4, margin: 0 }}>Partage sur WhatsApp pour remplir le match rapidement.</p>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                                    {friends.length > 0 && friends.slice(0, 2).map(f => (
                                                        <button
                                                            key={f.id}
                                                            onClick={() => {
                                                                const baseUrl = `${window.location.origin}/poll/${pollId}`;
                                                                const magicUrl = `${baseUrl}?guest=${encodeURIComponent(f.friend_name)}`;
                                                                const text = `Salut ${f.friend_name} ! On organise un Padel. Vote pour tes dispos ici : ${magicUrl}`;
                                                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                                            }}
                                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem 0.8rem', borderRadius: '0.8rem', fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                        >
                                                            {f.friend_name}
                                                        </button>
                                                    ))}

                                                    <button
                                                        onClick={() => {
                                                            const url = `${window.location.origin}/poll/${pollId}`;
                                                            navigator.clipboard.writeText(url);
                                                            alert("Lien copié !");
                                                        }}
                                                        style={{
                                                            background: 'var(--sun-blaze)',
                                                            color: '#fff',
                                                            border: 'none',
                                                            padding: '0.65rem 1.25rem',
                                                            borderRadius: '0.9rem',
                                                            fontWeight: 950,
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            boxShadow: '0 5px 15px rgba(255,107,0,0.2)',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        <Share2 size={14} /> COPIER LE LIEN
                                                    </button>

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); if (window.confirm('Es-tu sûr de vouloir supprimer ce sondage ? Cette action est irréversible.')) handleDeletePoll(); }}
                                                        style={{
                                                            background: 'rgba(255,0,0,0.1)',
                                                            color: '#ff4444',
                                                            border: 'none',
                                                            padding: '0.65rem 0.65rem',
                                                            borderRadius: '0.9rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,0,0,0.2)'}
                                                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,0,0,0.1)'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {isLoadingPoll ? (
                                            <div style={{ marginBottom: '2.5rem', background: '#fff', padding: '3rem', borderRadius: '2rem', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
                                                <div style={{ width: 40, height: 40, border: '4px solid rgba(0,0,0,0.05)', borderTopColor: 'var(--sun-blaze)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
                                                <div style={{ fontSize: '1.2rem', fontWeight: 700, opacity: 0.3 }}>Récupération du match...</div>
                                            </div>
                                        ) : !isCreator && (
                                            <div style={{ marginBottom: '2.5rem', background: '#fff', padding: '2rem', borderRadius: '2rem', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--sun-blaze)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Sondage en cours</div>
                                                <h2 style={{ fontSize: '2.5rem', fontWeight: 950, marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>
                                                    {voterName ? `Salut ${voterName} !` : `Salut !`}
                                                </h2>
                                                <p style={{ color: '#666', fontWeight: 600, fontSize: '1.1rem' }}>On attend tes dispos pour jouer avec {pollCreatorName}</p>
                                            </div>
                                        )}
                                        {Object.entries(slotsByDay).map(([dayKey, daySlots]: [string, any]) => (
                                            <div key={dayKey} id={`poll-day-${dayKey}`} style={{ marginBottom: '2.5rem' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 950, textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                                                    {format(parseISO(dayKey), 'EEEE d MMMM', { locale: fr })}
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {daySlots.map((slot: any) => {
                                                        const dbVotes = pollVotes.filter(v => v.slot_id === slot.id);
                                                        // Inject creator vote if not present
                                                        let votes = [...dbVotes];
                                                        const creatorInVotes = votes.find(v => v.user_name === (pollCreatorName || 'Organisateur'));
                                                        if (!creatorInVotes) {
                                                            votes = [{ user_name: pollCreatorName || 'Organisateur', vote_value: true }, ...votes];
                                                        }

                                                        const name = user ? (profileFields.firstName || user.email?.split('@')[0]) : voterName;
                                                        const userVote = dbVotes.find(v => v.user_name === name);
                                                        const isNotAvailable = userVote?.vote_value === false;
                                                        const hasVoted = dbVotes.some(v => v.user_name === name);

                                                        return (
                                                            <div key={slot.id} style={{
                                                                background: '#fff',
                                                                borderRadius: '1.75rem',
                                                                padding: '1.5rem',
                                                                boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                                                                border: '1px solid rgba(0,0,0,0.02)',
                                                                opacity: isNotAvailable ? 0.6 : 1,
                                                                filter: isNotAvailable ? 'grayscale(0.5)' : 'none',
                                                                transition: 'all 0.3s ease'
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                                                    <div>
                                                                        <div style={{ fontSize: '2rem', fontWeight: 950, letterSpacing: '-0.03em', lineHeight: 1 }}>{format(slot.startTime, 'HH:mm')}</div>
                                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.6, marginTop: '0.25rem' }}>{slot.centerName} · {slot.durationMinutes} min</div>
                                                                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--sun-blaze)', marginTop: '0.4rem' }}>{slot.price}€ / joueur</div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '50%' }}>
                                                                        {votes.map((v, i) => {
                                                                            const isCreatorVote = v.user_id === pollCreatorId || (v.user_name === pollCreatorName && i === 0);
                                                                            const name = v.user_name || (isCreatorVote ? pollCreatorName : 'Anonyme');
                                                                            const color = `hsl(${(i * 137) % 360}, 70%, 50%)`;

                                                                            return (
                                                                                <div
                                                                                    key={i}
                                                                                    style={{
                                                                                        padding: '0.4rem 0.8rem',
                                                                                        borderRadius: '2rem',
                                                                                        background: v.vote_value === false ? 'rgba(0,0,0,0.03)' : `hsla(${(i * 137) % 360}, 70%, 50%, 0.08)`,
                                                                                        border: `1px solid ${v.vote_value === false ? 'rgba(0,0,0,0.05)' : `hsla(${(i * 137) % 360}, 70%, 50%, 0.1)`}`,
                                                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                                                        color: v.vote_value === false ? '#aaa' : `hsl(${(i * 137) % 360}, 70%, 40%)`,
                                                                                        fontSize: '0.75rem', fontWeight: 900,
                                                                                        textDecoration: v.vote_value === false ? 'line-through' : 'none',
                                                                                        opacity: v.vote_value === false ? 0.6 : 1,
                                                                                        position: 'relative'
                                                                                    }}>
                                                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.vote_value === false ? '#ccc' : color }} />
                                                                                    {name}
                                                                                    {v.vote_value === false && (
                                                                                        <div style={{ position: 'absolute', top: -4, right: -4, background: '#ff4444', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(255,0,0,0.2)' }}>
                                                                                            <X size={8} color="#fff" strokeWidth={4} />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                                    <button
                                                                        onClick={() => handleQuickVote(slot.id, true)}
                                                                        style={{
                                                                            background: userVote?.vote_value === true ? 'var(--sun-blaze)' : 'rgba(0,0,0,0.03)',
                                                                            color: userVote?.vote_value === true ? '#fff' : 'var(--pitch-black)',
                                                                            border: 'none',
                                                                            padding: '1rem',
                                                                            borderRadius: '1.25rem',
                                                                            fontWeight: 950,
                                                                            fontSize: '0.85rem',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                                        }}
                                                                    >
                                                                        <Check size={18} strokeWidth={3} /> CHAUD
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleQuickVote(slot.id, false)}
                                                                        style={{
                                                                            background: userVote?.vote_value === false ? '#ff4444' : 'rgba(0,0,0,0.03)',
                                                                            color: userVote?.vote_value === false ? '#fff' : 'rgba(0,0,0,0.3)',
                                                                            border: 'none',
                                                                            padding: '1rem',
                                                                            borderRadius: '1.25rem',
                                                                            fontWeight: 950,
                                                                            fontSize: '0.85rem',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                    >
                                                                        <X size={18} strokeWidth={3} /> PAS DISPO
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}

                                    </div>

                                    <AnimatePresence>
                                        {isVotesDirty && (
                                            <motion.div
                                                initial={{ y: 100 }}
                                                animate={{ y: 0 }}
                                                exit={{ y: 100 }}
                                                style={{
                                                    position: 'fixed',
                                                    bottom: '3rem',
                                                    left: '1.25rem',
                                                    right: '1.25rem',
                                                    zIndex: 5000,
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    pointerEvents: 'none'
                                                }}
                                            >
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if (!isSaving) saveVotes(); }}
                                                    disabled={isSaving}
                                                    style={{
                                                        background: saveSuccess ? '#2E7D32' : 'var(--pitch-black)',
                                                        color: '#fff',
                                                        border: 'none',
                                                        padding: '1.25rem 3rem',
                                                        borderRadius: '2rem',
                                                        fontWeight: 950,
                                                        fontSize: '1.1rem',
                                                        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                                                        cursor: isSaving ? 'default' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem',
                                                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                        pointerEvents: 'auto',
                                                        transform: 'scale(1)',
                                                        borderBottom: '4px solid rgba(0,0,0,0.3)'
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-5px)'}
                                                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
                                                >
                                                    {isSaving ? (
                                                        <div style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                    ) : saveSuccess ? (
                                                        <><Check size={20} strokeWidth={4} /> ENREGISTRÉ !</>
                                                    ) : (
                                                        <><CheckCircle2 size={20} /> ENREGISTRER MES CHOIX</>
                                                    )}
                                                </button>
                                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {!user && (
                                        <div style={{ maxWidth: 600, margin: '4rem auto', padding: '0 1.25rem', textAlign: 'center' }}>
                                            <h3 style={{ fontSize: '1.5rem', fontWeight: 950, marginBottom: '1rem' }}>Tu joues souvent ?</h3>
                                            <button onClick={() => router.push('/login')} style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--pitch-black)', border: 'none', padding: '1rem 2rem', borderRadius: '1.25rem', fontWeight: 950, cursor: 'pointer' }}>CRÉER UN COMPTE</button>
                                        </div>
                                    )}

                                    {/* Modal Saisie Nom pour Invités */}
                                    <AnimatePresence>
                                        {showGuestNameModal && (
                                            <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
                                                />
                                                <motion.div
                                                    initial={{ scale: 0.9, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.9, opacity: 0 }}
                                                    style={{
                                                        position: 'relative',
                                                        background: '#fff',
                                                        borderRadius: '2rem',
                                                        padding: '3rem',
                                                        maxWidth: '400px',
                                                        width: '100%',
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    <div style={{ width: 64, height: 64, background: 'var(--off-white-clay)', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--sun-blaze)' }}>
                                                        <UserIcon size={32} />
                                                    </div>
                                                    <h3 style={{ fontSize: '1.75rem', fontWeight: 950, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>C'est qui ?</h3>
                                                    <p style={{ color: '#666', marginBottom: '2rem', fontWeight: 600 }}>Saisis ton prénom pour voter</p>

                                                    <input
                                                        type="text"
                                                        value={voterName}
                                                        onChange={(e) => setVoterName(e.target.value)}
                                                        placeholder="Ton prénom..."
                                                        autoFocus
                                                        style={{
                                                            width: '100%',
                                                            padding: '1.25rem',
                                                            borderRadius: '1.25rem',
                                                            border: '2px solid #eee',
                                                            fontSize: '1.1rem',
                                                            fontWeight: 700,
                                                            marginBottom: '1.5rem',
                                                            textAlign: 'center',
                                                            outline: 'none'
                                                        }}
                                                    />

                                                    <button
                                                        onClick={() => {
                                                            if (voterName.trim()) setShowGuestNameModal(false);
                                                        }}
                                                        disabled={!voterName.trim()}
                                                        style={{
                                                            width: '100%',
                                                            padding: '1.25rem',
                                                            borderRadius: '1.25rem',
                                                            background: voterName.trim() ? '#1A1A1A' : '#eee',
                                                            color: voterName.trim() ? '#fff' : '#aaa',
                                                            border: 'none',
                                                            fontWeight: 950,
                                                            fontSize: '1rem',
                                                            cursor: voterName.trim() ? 'pointer' : 'default',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        C'EST PARTI !
                                                    </button>
                                                </motion.div>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </>
                            );
                        })()}
                    </motion.div>
                )}



                {view === 'profile' && (
                    <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'var(--off-white-clay)', minHeight: '100vh', padding: '0 0 5rem 0' }}>
                        {/* UNIFIED HEADER BAR */}
                        <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '1rem 2rem', marginBottom: '3rem', position: 'sticky', top: 0, zIndex: 100 }}>
                            <div style={{ maxWidth: 1600, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 950, fontSize: '1.35rem', textTransform: 'uppercase', cursor: 'pointer' }} onClick={() => navigateTo('dashboard')}>
                                    <Zap fill="var(--sun-blaze)" stroke="none" size={26} /> PadelSpot
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button onClick={() => navigateTo('dashboard')} style={{ background: 'rgba(0,0,0,0.04)', border: 'none', color: 'var(--pitch-black)', padding: '0.5rem 1.25rem', borderRadius: '999px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                                        <ChevronLeft size={16} /> RETOUR AU DASHBOARD
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%', padding: '0 2rem' }}>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
                                <div style={{ width: 100, height: 100, borderRadius: '2rem', background: 'var(--sun-blaze)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 950 }}>{profileFields.firstName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}</div>
                                <div style={{ flex: 1 }}>
                                    <h1 style={{ fontSize: '3rem', fontWeight: 950, marginBottom: '0.5rem', color: 'var(--pitch-black)' }}>Mon Profil</h1>
                                    <p style={{ fontSize: '1.1rem', opacity: 0.5, fontWeight: 600, color: 'var(--pitch-black)' }}>{user?.email}</p>
                                </div>
                                <button
                                    onClick={() => logout()}
                                    style={{
                                        background: 'rgba(0,0,0,0.05)',
                                        color: 'var(--pitch-black)',
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '999px',
                                        fontWeight: 900,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                >
                                    DÉCONNEXION
                                </button>
                            </div>

                            <section style={{ marginBottom: '2rem', background: 'rgba(255,107,0,0.03)', padding: '3rem', borderRadius: '2.5rem', border: '1px solid rgba(255,107,0,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 950, textTransform: 'uppercase', margin: 0 }}>Mes Potes 👥</h2>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            placeholder="Nom du pote..."
                                            value={newFriendName}
                                            onChange={(e) => setNewFriendName(e.target.value)}
                                            style={{ padding: '0.75rem 1.5rem', borderRadius: '999px', border: '1px solid rgba(255,107,0,0.2)', background: '#fff', fontWeight: 700, fontSize: '0.85rem', color: 'var(--pitch-black)' }}
                                        />
                                        <button onClick={addFriend} style={{ background: 'var(--sun-blaze)', color: '#fff', border: 'none', padding: '0.75rem 1.75rem', borderRadius: '999px', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}>AJOUTER</button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                    {friends.map(friend => (
                                        <div key={friend.id} style={{ background: '#fff', padding: '1rem 1.5rem', borderRadius: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(0,0,0,0.05)', color: 'var(--pitch-black)' }}>
                                            <span style={{ fontWeight: 800 }}>{friend.friend_name}</span>
                                            <button onClick={() => removeFriend(friend.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3 }}><X size={16} /></button>
                                        </div>
                                    ))}
                                    {friends.length === 0 && <div style={{ opacity: 0.4, fontStyle: 'italic', fontSize: '0.9rem' }}>Aucun pote ajouté pour l'instant.</div>}
                                </div>
                            </section>

                            <section style={{ marginBottom: '2rem', background: '#fff', padding: '3rem', borderRadius: '2.5rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 950, marginBottom: '2.5rem', textTransform: 'uppercase', color: 'var(--pitch-black)' }}>Informations Personnelles</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 900, opacity: 0.5, textTransform: 'uppercase' }}>Prénom</label>
                                        <input
                                            type="text"
                                            value={profileFields.firstName}
                                            onChange={(e) => updateProfile({ firstName: e.target.value })}
                                            placeholder="Votre prénom"
                                            style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', padding: '1.25rem', borderRadius: '1.25rem', color: 'var(--pitch-black)', fontWeight: 700, fontSize: '1rem' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 900, opacity: 0.5, textTransform: 'uppercase', color: 'var(--pitch-black)' }}>Nom</label>
                                        <input
                                            type="text"
                                            value={profileFields.lastName}
                                            onChange={(e) => updateProfile({ lastName: e.target.value })}
                                            placeholder="Votre nom"
                                            style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', padding: '1.25rem', borderRadius: '1.25rem', color: 'var(--pitch-black)', fontWeight: 700, fontSize: '1rem' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 900, opacity: 0.5, textTransform: 'uppercase' }}>Distance Max (km)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <input
                                                type="range"
                                                min="5"
                                                max="100"
                                                step="5"
                                                value={profileFields.maxDistance}
                                                onChange={(e) => updateProfile({ maxDistance: parseInt(e.target.value) })}
                                                style={{ flex: 1, accentColor: 'var(--sun-blaze)' }}
                                            />
                                            <span style={{ fontWeight: 950, fontSize: '1.25rem', color: 'var(--sun-blaze)', width: '4rem', textAlign: 'right' }}>{profileFields.maxDistance}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 900, opacity: 0.5, textTransform: 'uppercase' }}>Côté Préféré</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4rem' }}>
                                            {(['left', 'right', 'both'] as const).map(side => (
                                                <button
                                                    key={side}
                                                    onClick={() => updateProfile({ preferredSide: side })}
                                                    style={{
                                                        background: profileFields.preferredSide === side ? 'var(--sun-blaze)' : 'rgba(0,0,0,0.05)',
                                                        color: profileFields.preferredSide === side ? '#fff' : 'var(--pitch-black)',
                                                        border: 'none',
                                                        padding: '1.25rem 0.5rem',
                                                        borderRadius: '1.25rem',
                                                        fontWeight: 900,
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        textTransform: 'uppercase'
                                                    }}
                                                >
                                                    {side === 'left' ? 'Gauche' : side === 'right' ? 'Droite' : 'Les deux'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                                    <h2 style={{ fontSize: '3rem', fontWeight: 950, textTransform: 'uppercase', color: 'var(--pitch-black)' }}>Mes Clubs Favoris</h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 900, opacity: 0.4 }}>AJOUTER UN CLUB</span>
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) toggleFavorite(e.target.value, e as any);
                                                e.target.value = '';
                                            }}
                                            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)', padding: '0.75rem 1.5rem', borderRadius: '1rem', color: 'var(--pitch-black)', fontWeight: 800, cursor: 'pointer', outline: 'none' }}
                                        >
                                            <option value="">Sélectionner...</option>
                                            {availableClubs.filter(c => !favorites.includes(c)).map(club => (
                                                <option key={club} value={club}>{club}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
                                    {favorites.map(club => (
                                        <div key={club} style={{ background: '#fff', padding: '1.5rem 2rem', borderRadius: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                <Heart fill="var(--sun-blaze)" color="var(--sun-blaze)" size={20} />
                                                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--pitch-black)' }}>{club}</span>
                                            </div>
                                            <button
                                                onClick={(e) => toggleFavorite(club, e)}
                                                style={{ background: 'none', border: 'none', color: 'var(--pitch-black)', opacity: 0.3, cursor: 'pointer', fontWeight: 800, fontSize: '0.7rem' }}
                                            >RETIRER</button>
                                        </div>
                                    ))}
                                    {favorites.length === 0 && (
                                        <div style={{ gridColumn: '1 / span 2', padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '2rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                            <p style={{ opacity: 0.3, fontWeight: 800 }}>Aucun club en favoris pour le moment.</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section style={{ marginTop: '4rem' }}>
                                <h2 style={{ fontSize: '3rem', fontWeight: 950, marginBottom: '2rem', textTransform: 'uppercase', color: 'var(--pitch-black)' }}>Sondages Partagés</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {userPolls.map((poll: any) => (
                                        <div key={poll.id} style={{ background: '#fff', padding: '1.5rem 2rem', borderRadius: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
                                            <div>
                                                <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '2rem', color: 'var(--pitch-black)' }}>Sondage {poll.id.slice(0, 8)}</div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.4, fontWeight: 700 }}>Créé le {format(new Date(poll.created_at), 'd MMMM yyyy', { locale: fr })}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <button
                                                    onClick={() => { setPollId(poll.id); navigateTo('poll'); }}
                                                    style={{ background: 'var(--sun-blaze)', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}
                                                >VOIR</button>
                                                <button
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/poll/${poll.id}`;
                                                        navigator.clipboard.writeText(url);
                                                        alert('Lien copié !');
                                                    }}
                                                    style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--pitch-black)', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}
                                                >PARTAGER</button>
                                                <button
                                                    onClick={() => deleteGeneralPoll(poll.id)}
                                                    style={{ background: 'rgba(255,0,0,0.05)', color: '#ff4444', border: 'none', padding: '0.6rem', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {userPolls.length === 0 && (
                                        <div style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '2rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                            <p style={{ opacity: 0.3, fontWeight: 800 }}>Aucun sondage créé pour le moment.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </motion.div>
                )}            </AnimatePresence >

            {
                externalBookingSlot && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 20000, background: 'rgba(16,16,16,0.92)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                        <div style={{ background: '#fff', padding: '3.5rem', borderRadius: '3rem', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 50px 100px rgba(0,0,0,0.5)' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '2rem', background: 'rgba(255,107,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem' }}>
                                <Zap size={40} fill="var(--sun-blaze)" stroke="none" />
                            </div>
                            <h2 style={{ fontSize: '3rem', fontWeight: 950, marginBottom: '2rem', textTransform: 'uppercase', lineHeight: 1 }}>RÉSERVATION LIVE<br /><span style={{ color: 'var(--sun-blaze)' }}>{externalBookingSlot.centerName}</span></h2>
                            <p style={{ opacity: 0.5, marginBottom: '3.5rem', fontSize: '1rem', fontWeight: 500 }}>Finalisez votre paiement sur l'interface sécurisée de notre partenaire de confiance.</p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <a
                                    href={externalBookingSlot.bookingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => {
                                        localStorage.setItem('padelspot_pending_reservation', JSON.stringify({
                                            id: externalBookingSlot.id,
                                            clubName: externalBookingSlot.centerName,
                                            slot: externalBookingSlot, // Store details for the confirmation modal
                                            timestamp: Date.now()
                                        }));
                                        setExternalBookingSlot(null);
                                    }}
                                    style={{ flex: 1, background: 'var(--sun-blaze)', color: '#fff', textDecoration: 'none', padding: '1.25rem', borderRadius: '1.5rem', fontWeight: 950, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    CONTINUER <ArrowRight size={20} />
                                </a>
                                <button onClick={() => setExternalBookingSlot(null)} style={{ background: '#f5f5f5', color: '#101010', border: 'none', padding: '1.25rem 2rem', borderRadius: '1.5rem', fontWeight: 900, cursor: 'pointer', fontSize: '1rem' }}>RETOUR</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Post-Booking Validation Popup */}
            <AnimatePresence>
                {showBookingConfirmation && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 25000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBookingConfirmation(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} style={{ position: 'relative', background: '#FFF', borderRadius: '32px', padding: '48px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.4)' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,107,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                                <CheckCircle2 size={40} color="var(--sun-blaze)" />
                            </div>
                            <h3 style={{ fontSize: '28px', fontWeight: 950, marginBottom: '12px', letterSpacing: '-0.02em' }}>Réservation réussie ?</h3>
                            <p style={{ color: '#666', marginBottom: '32px', fontWeight: 600, fontSize: '1.1rem' }}>Tu as bien bloqué le créneau à {showBookingConfirmation.clubName} ?</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button onClick={() => handleConfirmBooking(true)} style={{ padding: '1.25rem', borderRadius: '1.25rem', background: 'var(--sun-blaze)', color: '#FFF', fontWeight: 950, fontSize: '1.1rem', border: 'none', cursor: 'pointer' }}>Oui, c'est booké !</button>
                                <button onClick={() => handleConfirmBooking(false)} style={{ padding: '1.25rem', borderRadius: '1.25rem', background: '#F5F5F5', color: '#666', fontWeight: 800, fontSize: '1rem', border: 'none', cursor: 'pointer' }}>Non, c'était complet</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Players Modal */}
            <AnimatePresence>
                {showAddPlayersModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 26000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddPlayersModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)' }} />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} style={{ position: 'relative', background: '#fff', borderRadius: '2.5rem', width: '100%', maxWidth: '500px', padding: '2.5rem', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
                            <button onClick={() => setShowAddPlayersModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(0,0,0,0.05)', border: 'none', width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ width: 50, height: 50, borderRadius: '1rem', background: 'rgba(255,107,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sun-blaze)' }}>
                                    <UserPlus size={24} />
                                </div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 950, letterSpacing: '-0.02em' }}>Ajouter des joueurs</h2>
                            </div>

                            <p style={{ color: '#666', fontWeight: 600, fontSize: '1rem', marginBottom: '2rem' }}>Qui t'accompagne sur le terrain ?</p>

                            {/* Manual Entry */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                                <input
                                    type="text"
                                    placeholder="Nom du joueur..."
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                                    style={{ flex: 1, padding: '1rem 1.5rem', borderRadius: '1.25rem', border: '1px solid #eee', background: '#f9f9f9', fontWeight: 700, fontSize: '1rem', outline: 'none' }}
                                />
                                <button onClick={handleAddPlayer} style={{ padding: '1rem', borderRadius: '1.25rem', background: 'var(--pitch-black)', color: '#fff', border: 'none', cursor: 'pointer' }}><Plus size={20} /></button>
                            </div>

                            {/* Added Players List */}
                            {addedPlayers.length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {addedPlayers.map((p, i) => (
                                            <div key={i} style={{ background: 'rgba(255,107,0,0.1)', color: 'var(--sun-blaze)', padding: '0.5rem 1rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {p}
                                                {/* <Trash2 size={12} strokeWidth={3} style={{ cursor: 'pointer' }} /> */}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Suggestions from Friends */}
                            {friends.length > 0 && (
                                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '2rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 950, textTransform: 'uppercase', color: '#999', marginBottom: '1.25rem', display: 'block' }}>Tes potes récents</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        {friends.filter(f => !addedPlayers.includes(f.friend_name)).slice(0, 4).map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => handleInviteFriendToReservation(f.friend_name)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '1rem', border: '1px solid #f0f0f0', background: '#fff', cursor: 'pointer', textAlign: 'left' }}
                                            >
                                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>{f.friend_name[0]}</div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{f.friend_name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button onClick={() => setShowAddPlayersModal(false)} style={{ width: '100%', marginTop: '3rem', padding: '1.25rem', borderRadius: '1.25rem', background: 'var(--sun-blaze)', color: '#fff', border: 'none', fontWeight: 950, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 30px rgba(255,107,0,0.3)' }}>TOUT EST BON !</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSelectedModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0.75rem' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSelectedModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }} />
                        <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.95 }} style={{ position: 'relative', background: 'var(--off-white-clay)', width: '100%', maxWidth: '420px', borderRadius: '2rem', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--pitch-black)' }}>Créneaux sélectionnés ({selectedSlots.length})</h3>
                                <button onClick={() => setShowSelectedModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}><X size={20} color="var(--pitch-black)" /></button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {slots.filter((s: any) => selectedSlots.includes(s.id)).map((slot: any) => (
                                    <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#fff', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                                        <div>
                                            <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--pitch-black)' }}>{slot.centerName}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>{format(slot.startTime, 'EEEE d MMM • HH:mm', { locale: fr })} • {slot.durationMinutes} min</div>
                                        </div>
                                        <button onClick={() => toggleSlotSelection(slot.id)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                            <X size={14} color="var(--pitch-black)" />
                                        </button>
                                    </div>
                                ))}
                                {selectedSlots.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '5rem 0', color: '#888', fontStyle: 'italic', fontWeight: 500 }}>Vous avez retiré tous vos créneaux.</div>
                                )}
                            </div>

                            <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 950, textTransform: 'uppercase', marginBottom: '0.75rem', opacity: 0.6 }}>Combien de joueurs doivent répondre ?</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {[2, 3, 4, 6].map(num => (
                                        <button
                                            key={num}
                                            onClick={() => setTargetVoters(num)}
                                            style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.75rem', border: targetVoters === num ? '2px solid var(--sun-blaze)' : '1px solid #eee', background: targetVoters === num ? 'rgba(255,107,0,0.05)' : '#fff', fontWeight: 900, color: targetVoters === num ? 'var(--sun-blaze)' : 'var(--pitch-black)', cursor: 'pointer' }}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                                <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.75rem', fontWeight: 600 }}>Tu seras notifié dès que {targetVoters} personnes auront répondu.</p>
                            </div>

                            {selectedSlots.length > 0 && (
                                <button onClick={() => { setShowSelectedModal(false); handlePollCreation(); }} style={{ width: '100%', marginTop: '1rem', background: 'var(--sun-blaze)', color: '#fff', border: 'none', padding: '1.1rem', borderRadius: '1rem', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                                    CRÉER LE SONDAGE AMIS <ArrowRight size={16} />
                                </button>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAuthModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAuthModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)' }} />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} style={{ position: 'relative', background: '#fff', padding: '3rem', borderRadius: '3rem', maxWidth: '450px', width: '100%', textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.4)' }}>
                            <button onClick={() => setShowAuthModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(0,0,0,0.05)', border: 'none', width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>

                            <div style={{ width: 70, height: 70, borderRadius: '2rem', background: 'rgba(255,107,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                                <Users size={32} color="var(--sun-blaze)" />
                            </div>

                            <h2 style={{ fontSize: '1.8rem', fontWeight: 950, marginBottom: '2rem', lineHeight: 1.1 }}>Organiser un match<br />n'a jamais été aussi simple.</h2>

                            <p style={{ opacity: 0.6, fontSize: '0.95rem', fontWeight: 600, marginBottom: '2.5rem', lineHeight: 1.5 }}>
                                Sélectionne plusieurs créneaux qui t'arrangent, génère un lien de sondage, et envoie-le sur ton groupe WhatsApp. Tes potes indiquent leurs dispos en un clic, sans même avoir de compte.
                            </p>

                            <Link href="/login" style={{ width: '100%', background: 'var(--pitch-black)', color: '#fff', textDecoration: 'none', padding: '1.25rem', borderRadius: '1.5rem', fontWeight: 950, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4rem', marginBottom: '2rem' }}>
                                <Lock size={18} /> CRÉER MON COMPTE
                            </Link>

                            <Link href="/login" style={{ color: 'var(--pitch-black)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 900, opacity: 0.5 }}>
                                J'ai déjà un compte
                            </Link>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}
