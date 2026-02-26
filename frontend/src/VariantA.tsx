import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Zap, ArrowLeft, CheckSquare, Square, Share2, Users, ChevronDown, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import './VariantA.css';

interface Slot {
    id: string;
    provider: string;
    centerName: string;
    startTime: string;
    endTime: string;
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
    'MB Padel (Sainte-Eulalie)': [44.9126, -0.4735],
    'Padel House (Cenon)': [44.8540, -0.5217],
    '3D Padel (Le Haillan)': [44.8603, -0.6738],
    'Big Padel Mérignac': [44.8217, -0.6628],
    '4PADEL Bordeaux': [44.8687, -0.5694],
    'UCPA Sport Station Bordeaux': [44.8624, -0.5484],
    'Padel 33': [44.8519, -0.5750],
    'Squashbad33 Bordeaux Nord': [44.8519, -0.5750],
    'US Cenon Tennis': [44.8620, -0.5120]
};



// Auto-fit bounds component
function MapBounds({ slots }: { slots: Slot[] }) {
    const map = useMap();
    useEffect(() => {
        if (slots.length > 0) {
            const bounds = L.latLngBounds(slots.map(s => [s.lat, s.lng]));
            map.fitBounds(bounds, { padding: [50, 50], animate: true });
        }
    }, [slots, map]);
    return null;
}

export default function VariantA() {
    const [view, setView] = useState<'home' | 'results' | 'poll'>('home');
    const [date, setDate] = useState<string>(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    const [targetTime, setTargetTime] = useState<string>('19:00');
    // Internal smart sort: by time group, then distance, then price
    const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
    const [showClubDropdown, setShowClubDropdown] = useState(false);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [externalBookingSlot, setExternalBookingSlot] = useState<Slot | null>(null);

    const allClubNames = useMemo(() => {
        const names = [...new Set(slots.map(s => s.centerName))];
        return names.sort();
    }, [slots]);

    const toggleClub = (name: string) => {
        setSelectedClubs(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    useEffect(() => {
        if (view === 'results') {
            const fetchSlots = async () => {
                setLoading(true);
                try {
                    const response = await fetch(`http://localhost:3000/api/slots?date=${date}`);
                    const data = await response.json();
                    // Map mock cords to slots
                    const enrichedSlots = (data.slots || []).map((slot: any) => {
                        const coords = bordeauxCoordinates[slot.centerName] || [44.84, -0.57 + Math.random() * 0.1];
                        return {
                            ...slot,
                            distance: (Math.random() * 5 + 1).toFixed(1) + ' km',
                            lat: coords[0] + (Math.random() * 0.005 - 0.0025), // slight jitter to unstack
                            lng: coords[1] + (Math.random() * 0.005 - 0.0025),
                            indoor: Math.random() > 0.3 // Mock indoor/outdoor
                        };
                    });
                    setSlots(enrichedSlots);
                    setSelectedClubs([]);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchSlots();
        }
    }, [view, date]);

    const filteredSlots = useMemo(() => {
        const [targetH, targetM] = targetTime.split(':').map(Number);
        const targetTotalMins = targetH * 60 + targetM;

        const preFiltered = slots.filter((slot) => {
            const d = parseISO(slot.startTime);
            const hour = d.getHours();
            const min = d.getMinutes();
            const slotTotalMins = hour * 60 + min;

            const isTimeMatch = slotTotalMins >= targetTotalMins && slotTotalMins <= targetTotalMins + 45;
            const isClubMatch = selectedClubs.length === 0 || selectedClubs.includes(slot.centerName);

            return isTimeMatch && isClubMatch;
        });

        // Smart internal sort: time group → distance → price
        return preFiltered.sort((a, b) => {
            const timeA = new Date(a.startTime).getTime();
            const timeB = new Date(b.startTime).getTime();
            if (timeA !== timeB) return timeA - timeB;
            const distA = parseFloat(a.distance || '999');
            const distB = parseFloat(b.distance || '999');
            if (distA !== distB) return distA - distB;
            return (a.price || 0) - (b.price || 0);
        });
    }, [slots, targetTime, selectedClubs]);

    // Group by start time for clustered display
    const timeGroups = useMemo(() => {
        const groups: Record<string, Slot[]> = {};
        filteredSlots.forEach((slot: Slot) => {
            const key = format(parseISO(slot.startTime), 'HH:mm');
            if (!groups[key]) groups[key] = [];
            groups[key].push(slot);
        });
        const sortedKeys = Object.keys(groups).sort();
        return sortedKeys.map(key => ({
            time: key,
            endTime: groups[key].length > 0 ? format(parseISO(groups[key][0].endTime), 'HH:mm') : '',
            slots: groups[key]
        }));
    }, [filteredSlots]);

    const clubClusters = useMemo(() => {
        const clusters: Record<string, any> = {};
        filteredSlots.forEach((slot: Slot) => {
            if (!clusters[slot.centerName]) {
                clusters[slot.centerName] = {
                    centerName: slot.centerName,
                    lat: slot.lat,
                    lng: slot.lng,
                    distance: slot.distance || '',
                    slots: [],
                    minPrice: slot.price || 999
                };
            }
            clusters[slot.centerName].slots.push(slot);
            if (slot.price && slot.price < clusters[slot.centerName].minPrice) {
                clusters[slot.centerName].minPrice = slot.price;
            }
        });

        Object.values(clusters).forEach(cluster => {
            cluster.slots.sort((a: Slot, b: Slot) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        });

        return Object.values(clusters).sort((a: any, b: any) => {
            if (a.slots.length === 0) return 1;
            if (b.slots.length === 0) return -1;
            const timeA = new Date(a.slots[0].startTime).getTime();
            const timeB = new Date(b.slots[0].startTime).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return a.centerName.localeCompare(b.centerName);
        });
    }, [filteredSlots]);

    const [hoveredMapSlot, setHoveredMapSlot] = useState<string | null>(null);

    const handleSearch = () => {
        setView('results');
        setSelectedSlots([]);
    };

    const toggleSlotSelection = (id: string) => {
        if (selectedSlots.includes(id)) {
            setSelectedSlots(selectedSlots.filter(s => s !== id));
        } else {
            if (selectedSlots.length < 4) {
                setSelectedSlots([...selectedSlots, id]);
                // Scroll map or list to view? Maybe highlight it later.
            } else {
                alert("Maximum 4 slots for the poll.");
            }
        }
    };

    const selectedSlotObjects = useMemo(() =>
        slots.filter(s => selectedSlots.includes(s.id)),
        [slots, selectedSlots]);

    return (
        <div className={`variant-a-container ${view === 'home' ? 'view-home' : ''}`}>
            <nav className="variant-a-nav">
                <div className="variant-a-logo" onClick={() => setView('home')} style={{ cursor: 'pointer' }}>
                    <Zap fill="#fff" color="#fff" /> PADELSPOT
                </div>

                {view === 'results' && (
                    <div className="variant-a-nav-context">
                        <strong>Bordeaux</strong> • {format(parseISO(date), 'd MMM yyyy')} • {filteredSlots.length} terrains
                    </div>
                )}

                {(view === 'results' || view === 'poll') && (
                    <button className="variant-a-back-btn" onClick={() => setView('home')}>
                        <ArrowLeft size={16} /> NEW SEARCH
                    </button>
                )}
            </nav>

            <AnimatePresence mode="wait">
                {view === 'home' && (
                    <motion.div
                        key="home"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        transition={{ duration: 0.4 }}
                        className="variant-a-full-centered"
                    >
                        <h1 className="variant-a-hero-title">UNLEASH YOUR<br /><span>PADEL SPEED.</span></h1>
                        <p className="variant-a-hero-subtitle">Instantly scan Bordeaux's fastest courts and secure your slot before the competition.</p>

                        <div className="variant-a-megasearch">
                            <div className="variant-a-mega-group">
                                <span className="variant-a-mega-label">Ville</span>
                                <input className="variant-a-mega-input" type="text" defaultValue="Bordeaux, FR" />
                            </div>
                            <div className="variant-a-mega-divider" />
                            <div className="variant-a-mega-group variant-a-mega-clickable" onClick={() => {
                                const el = document.getElementById('va-date-dropdown');
                                if (el) el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
                                const el2 = document.getElementById('va-time-dropdown');
                                if (el2) el2.style.display = 'none';
                            }}>
                                <span className="variant-a-mega-label">Date</span>
                                <span className="variant-a-mega-value">{format(parseISO(date), 'EEE d MMM', { locale: fr })}</span>
                                <div id="va-date-dropdown" className="variant-a-dropdown" style={{ display: 'none' }}>
                                    {Array.from({ length: 14 }, (_, i) => {
                                        const d = addDays(new Date(), i + 1);
                                        const val = format(d, 'yyyy-MM-dd');
                                        const isActive = val === date;
                                        return (
                                            <button
                                                key={val}
                                                className={`variant-a-dropdown-item ${isActive ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDate(val);
                                                    const el = document.getElementById('va-date-dropdown');
                                                    if (el) el.style.display = 'none';
                                                }}
                                            >
                                                <span style={{ fontWeight: 700, minWidth: 40, textTransform: 'capitalize' }}>{format(d, 'EEE', { locale: fr })}</span>
                                                <span style={{ opacity: 0.7, textTransform: 'capitalize' }}>{format(d, 'd MMM', { locale: fr })}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="variant-a-mega-divider" />
                            <div className="variant-a-mega-group variant-a-mega-clickable" onClick={() => {
                                const el = document.getElementById('va-time-dropdown');
                                if (el) el.style.display = el.style.display === 'grid' ? 'none' : 'grid';
                                const el2 = document.getElementById('va-date-dropdown');
                                if (el2) el2.style.display = 'none';
                            }}>
                                <span className="variant-a-mega-label">Heure</span>
                                <span className="variant-a-mega-value">{targetTime}</span>
                                <div id="va-time-dropdown" className="variant-a-dropdown variant-a-time-grid" style={{ display: 'none' }}>
                                    {Array.from({ length: 17 * 4 }, (_, i) => {
                                        const h = Math.floor(i / 4) + 7;
                                        const m = (i % 4) * 15;
                                        if (h > 23) return null;
                                        const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                        const isActive = val === targetTime;
                                        return (
                                            <button
                                                key={val}
                                                className={`variant-a-dropdown-item variant-a-time-item ${isActive ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTargetTime(val);
                                                    const el = document.getElementById('va-time-dropdown');
                                                    if (el) el.style.display = 'none';
                                                }}
                                            >
                                                {val}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <button className="variant-a-mega-btn" onClick={handleSearch}>
                                RECHERCHER
                            </button>
                        </div>
                    </motion.div>
                )}

                {view === 'results' && (
                    <motion.div
                        key="results"
                        className="variant-a-results-layout"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* Left side: Maps via Leaflet */}
                        <div className="variant-a-map-pane">
                            <MapContainer
                                center={[44.84, -0.57]}
                                zoom={12}
                                className="variant-a-leaflet"
                                zoomControl={false}
                            >
                                {/* CartoDB Dark Matter */}
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                                />
                                {!loading && <MapBounds slots={filteredSlots} />}
                                {!loading && clubClusters.map((cluster: any) => {
                                    const hasSelectedSlot = cluster.slots.some((s: Slot) => selectedSlots.includes(s.id));
                                    const isHovered = hoveredMapSlot === cluster.centerName;

                                    return (
                                        <Marker
                                            key={cluster.centerName}
                                            position={[cluster.lat, cluster.lng]}
                                            icon={L.divIcon({
                                                className: `variant-a-map-club-bubble ${hasSelectedSlot ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`,
                                                html: `<div class="v-a-marker-pill"><span class="v-a-marker-time">${format(parseISO(cluster.slots[0].startTime), 'HH:mm')}</span><div style="width: 1px; height: 12px; background: rgba(255,255,255,0.2);"></div><span class="v-a-marker-price">${cluster.minPrice}€</span></div>`,
                                                iconSize: [85, 36],
                                                iconAnchor: [42, 36],
                                            })}
                                            eventHandlers={{
                                                mouseover: () => setHoveredMapSlot(cluster.centerName),
                                                mouseout: () => setHoveredMapSlot(null)
                                            }}
                                        />
                                    )
                                })}
                            </MapContainer>
                        </div>

                        {/* Right side: List */}
                        <div className="variant-a-list-pane">
                            <div className="variant-a-filters">
                                <span style={{ color: '#888', fontSize: 13, fontWeight: 800, fontStyle: 'italic', textTransform: 'uppercase' }}>{filteredSlots.length} terrains</span>
                                <div style={{ position: 'relative' }}>
                                    <button
                                        className={`variant-a-pill ${selectedClubs.length > 0 ? 'active' : ''}`}
                                        onClick={() => setShowClubDropdown(!showClubDropdown)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <Filter size={12} />
                                        Clubs {selectedClubs.length > 0 && `(${selectedClubs.length})`}
                                        <ChevronDown size={12} />
                                    </button>
                                    {showClubDropdown && (
                                        <div className="variant-a-dropdown variant-a-club-dropdown" style={{ display: 'flex', position: 'absolute', top: 'calc(100% + 8px)', right: 0, left: 'auto', transform: 'none' }}>
                                            {selectedClubs.length > 0 && (
                                                <button
                                                    className="variant-a-dropdown-item"
                                                    style={{ color: '#0088ff', fontWeight: 800 }}
                                                    onClick={() => setSelectedClubs([])}
                                                >
                                                    Tout afficher
                                                </button>
                                            )}
                                            {allClubNames.map(name => (
                                                <button
                                                    key={name}
                                                    className={`variant-a-dropdown-item ${selectedClubs.includes(name) ? 'active' : ''}`}
                                                    onClick={() => toggleClub(name)}
                                                >
                                                    <span style={{ flex: 1 }}>{name}</span>
                                                    {selectedClubs.includes(name) && <span>✓</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {loading ? (
                                <div className="variant-a-loading">
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                        <Zap size={32} color="#fff" />
                                    </motion.div>
                                    <p>SCANNING ARENAS FAST...</p>
                                </div>
                            ) : (
                                <div className="variant-a-results-grid">
                                    {filteredSlots.length === 0 && <div style={{ color: '#666', marginTop: 40 }}>Aucun créneau trouvé.</div>}
                                    {timeGroups.map(group => (
                                        <div key={group.time} className="variant-a-time-group">
                                            <div className="variant-a-time-group-header">
                                                <span className="variant-a-time-group-label">{group.time}</span>
                                                <span className="variant-a-time-group-arrow">→ {group.endTime}</span>
                                                <span className="variant-a-time-group-count">{group.slots.length} terrain{group.slots.length > 1 ? 's' : ''}</span>
                                            </div>
                                            {/* Deduplicate within group */}
                                            {Object.values(group.slots.reduce((acc: Record<string, any>, slot) => {
                                                const key = `${slot.centerName}-${slot.price}`;
                                                if (!acc[key]) acc[key] = { ...slot, matchCount: 1 };
                                                else acc[key].matchCount++;
                                                return acc;
                                            }, {})).map((slot: any) => {
                                                const isSelected = selectedSlots.includes(slot.id);
                                                return (
                                                    <div
                                                        key={slot.id}
                                                        className={`variant-a-card-court ${isSelected ? 'selected' : ''}`}
                                                    >
                                                        <div className="court-net-line"></div>

                                                        <div className="va-card-center">
                                                            <div className="va-card-club">{slot.centerName}</div>
                                                            <div className="va-card-meta">
                                                                {slot.price < 32 && <span className="variant-a-court-badge">1V1</span>}
                                                                <span className="va-card-distance"><MapPin size={10} /> {slot.distance || '0.0km'}</span>
                                                            </div>
                                                        </div>

                                                        <div className="va-card-price">{slot.price}€</div>

                                                        <div className="va-card-actions">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExternalBookingSlot(slot);
                                                                }}
                                                                className="variant-a-book-btn"
                                                                style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
                                                            >
                                                                RÉSERVER
                                                            </button>
                                                            <button
                                                                className={`variant-a-select-btn ${isSelected ? 'selected' : ''} ${hoveredMapSlot === slot.centerName ? 'hovered' : ''}`}
                                                                onClick={() => toggleSlotSelection(slot.id)}
                                                                onMouseEnter={() => setHoveredMapSlot(slot.centerName)}
                                                                onMouseLeave={() => setHoveredMapSlot(null)}
                                                            >
                                                                {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                                                {isSelected ? 'Ajouté' : 'Ajouter'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>


                    </motion.div>
                )}

                {view === 'poll' && (
                    <motion.div
                        key="poll"
                        className="variant-a-full-centered"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="variant-a-poll-creator">
                            <div className="variant-a-poll-header">
                                <h2><Users size={24} /> SONDAGE PADELSPORT</h2>
                                <p>Générez un lien pour demander l'avis de vos amis.</p>
                            </div>

                            <div className="variant-a-poll-grid">
                                {selectedSlotObjects.map((slot, idx) => (
                                    <div key={slot.id} className="variant-a-poll-card">
                                        <div style={{ position: 'absolute', top: 12, left: 16, color: '#444', fontWeight: 900, fontSize: 32 }}>#{idx + 1}</div>
                                        <div className="variant-a-poll-time" style={{ marginTop: 8 }}>{format(parseISO(slot.startTime), 'HH:mm')}</div>
                                        <div className="variant-a-poll-club">{slot.centerName.toUpperCase()}</div>
                                        <div className="variant-a-poll-price">{slot.price}€ - 1h30</div>
                                        <button className="variant-a-vote-btn">VOTER POUR CE TERRAIN</button>
                                    </div>
                                ))}
                            </div>

                            <div className="variant-a-poll-actions" style={{ maxWidth: 400, margin: '0 auto' }}>
                                <input className="variant-a-mega-input" placeholder="Your Name" style={{ border: '1px solid #fff', padding: '16px', borderRadius: 8, textAlign: 'center', width: '100%', fontSize: 20 }} />
                                <button className="variant-a-mega-btn" style={{ width: '100%', marginTop: 16, display: 'flex', justifyContent: 'center', margin: '16px auto 0' }}>
                                    CRÉER LE LIEN WHATSAPP
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Action Menu for Polls */}
            <AnimatePresence>
                {view === 'results' && selectedSlots.length > 0 && (
                    <motion.div
                        className="variant-a-fab"
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                    >
                        <span className="variant-a-fab-text">
                            🗳️ <strong>{selectedSlots.length}</strong> créneau{selectedSlots.length > 1 ? 'x' : ''} sélectionné{selectedSlots.length > 1 ? 's' : ''} — Envoyez un sondage à vos potes !
                        </span>
                        <button className="variant-a-fab-btn" onClick={() => setView('poll')}>
                            CRÉER LE SONDAGE <Share2 size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* External Booking Interception Modal */}
            <AnimatePresence>
                {externalBookingSlot && (
                    <motion.div
                        className="variant-a-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                            display: 'flex', justifyContent: 'center', alignItems: 'center'
                        }}
                        onClick={() => setExternalBookingSlot(null)}
                    >
                        <motion.div
                            className="variant-a-modal-content"
                            initial={{ y: 50, scale: 0.95 }}
                            animate={{ y: 0, scale: 1 }}
                            exit={{ y: 20, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#000', borderRadius: 0, padding: 32,
                                maxWidth: 450, width: '90%', border: '1px solid #333',
                                boxShadow: '0 20px 40px rgba(0,136,255,0.1)'
                            }}
                        >
                            <div style={{ background: 'rgba(0, 136, 255, 0.1)', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, border: '1px solid #0088ff' }}>
                                <Zap fill="#0088ff" color="#0088ff" size={32} />
                            </div>
                            <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 12px 0', letterSpacing: '0.05em', color: '#fff', textTransform: 'uppercase' }}>
                                REDIRECTION EN COURS
                            </h2>
                            <p style={{ color: '#aaa', fontSize: 13, lineHeight: 1.5, marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                LE CLUB <strong style={{ color: '#fff' }}>{externalBookingSlot.centerName}</strong> UTILISE UN SYSTÈME DE RÉSERVATION EXTERNE ({externalBookingSlot.provider}).
                            </p>

                            <div style={{ background: '#111', padding: 16, border: '1px solid #333', marginBottom: 24 }}>
                                <div style={{ fontSize: 11, color: '#0088ff', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 900, marginBottom: 8 }}>VOTRE SÉLECTION :</div>
                                <div style={{ fontWeight: 600, color: '#fff' }}>LE {format(parseISO(date), 'dd/MM/yyyy')} À {format(parseISO(externalBookingSlot.startTime), 'HH:mm')}</div>
                                <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>TERRAIN: {externalBookingSlot.courtName || 'COURT STANDARD'}</div>
                            </div>

                            <p style={{ color: '#888', fontSize: 12, fontWeight: 500, marginBottom: 24 }}>
                                IL EST POSSIBLE QUE CES HORAIRES NE SOIENT RÉSERVABLES QUE DEPUIS L'APPLICATION MOBILE OBLIGATOIRE DU CLUB.
                            </p>

                            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
                                <a
                                    href={externalBookingSlot.bookingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => setExternalBookingSlot(null)}
                                    style={{
                                        background: '#0088ff', color: '#fff', textDecoration: 'none',
                                        padding: '16px', textAlign: 'center', fontWeight: 900,
                                        display: 'block', letterSpacing: '0.05em', border: 'none'
                                    }}
                                >
                                    OUVRIR L'APPLICATION
                                </a>
                                <button
                                    onClick={() => setExternalBookingSlot(null)}
                                    style={{
                                        background: 'transparent', border: '1px solid #333', color: '#aaa',
                                        padding: '16px', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    ABANDONNER
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
