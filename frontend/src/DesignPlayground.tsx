import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, X, Zap, SlidersHorizontal, Search, ChevronUp, MoreHorizontal } from 'lucide-react';
import './DesignPlayground.css';

// Generate 28 days starting from today
const generateDays = () => {
    const days = [];
    const now = new Date(2026, 1, 25); // Feb 25, 2026
    for (let i = 0; i < 28; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const dayNames = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
        days.push({
            key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
            dayName: dayNames[d.getDay()].toUpperCase(),
            dateNum: d.getDate(),
            monthShort: ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][d.getMonth()],
            full: d,
        });
    }
    return days;
};

const ALL_DAYS = generateDays();

type DaySelection = { dayIndex: number; hour: number; minute: number };

// Mock clubs
const MOCK_CLUBS = [
    { name: 'Big Padel Mérignac', dist: '10.3 km', type: 'Indoor', court: 'Terrain 3', price: 12 },
    { name: '4Padel Bordeaux', dist: '5.1 km', type: 'Outdoor', court: 'Terrain A', price: 10 },
    { name: 'UCPA Bordeaux', dist: '3.2 km', type: 'Indoor', court: 'Court 1', price: 14 },
    { name: 'Padel House Cenon', dist: '7.8 km', type: 'Indoor', court: 'Terrain 2', price: 11 },
    { name: 'MB Padel Ste-Eulalie', dist: '12.1 km', type: 'Outdoor', court: 'Court B', price: 8 },
];

// Hours and minutes arrays
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

const DRUM_ITEM_H = 36; // height of each drum item in px

// Drum scroll column component
function DrumColumn({ items, value, onChange, formatFn }: {
    items: number[];
    value: number;
    onChange: (v: number) => void;
    formatFn: (v: number) => string;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const isUserScroll = useRef(true);

    // Scroll to item on mount or value change
    useEffect(() => {
        const idx = items.indexOf(value);
        if (idx >= 0 && scrollRef.current) {
            isUserScroll.current = false;
            scrollRef.current.scrollTo({ top: idx * DRUM_ITEM_H, behavior: 'smooth' });
            setTimeout(() => { isUserScroll.current = true; }, 200);
        }
    }, [value, items]);

    const handleScroll = useCallback(() => {
        if (!scrollRef.current || !isUserScroll.current) return;
        const scrollTop = scrollRef.current.scrollTop;
        const idx = Math.round(scrollTop / DRUM_ITEM_H);
        const clamped = Math.max(0, Math.min(items.length - 1, idx));
        if (items[clamped] !== value) {
            onChange(items[clamped]);
        }
    }, [items, value, onChange]);

    return (
        <div className="dpg-drum-col">
            <div
                className="dpg-drum-scroll"
                ref={scrollRef}
                onScroll={handleScroll}
            >
                <div className="dpg-drum-pad" />
                {items.map(item => (
                    <div
                        key={item}
                        className={`dp-drum-item ${item === value ? 'active' : ''}`}
                        onClick={() => onChange(item)}
                    >
                        {formatFn(item)}
                    </div>
                ))}
                <div className="dpg-drum-pad" />
            </div>
            <div className="dpg-drum-highlight" />
        </div>
    );
}

// Hours for the timeline (7h to 23h)
const TIMELINE_HOURS = Array.from({ length: 17 }, (_, i) => i + 7);

export default function DesignPlayground({ onBack }: { onBack: () => void }) {
    // Calendar state
    const [windowStart, setWindowStart] = useState(0);
    const visibleDays = ALL_DAYS.slice(windowStart, windowStart + 7);

    // Selected days
    const [selections, setSelections] = useState<DaySelection[]>([
        { dayIndex: 1, hour: 19, minute: 0 },
    ]);

    // Which day's time is being edited
    const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);

    // Expanded slot + how many visible
    const [expandedSlotKey, setExpandedSlotKey] = useState<string | null>(null);
    const [visibleSlotCount, setVisibleSlotCount] = useState<Record<string, number>>({});
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

    // Filters
    const [durationFilter, setDurationFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'indoor' | 'outdoor'>('all');
    const [isFavoriteOnly, setIsFavoriteOnly] = useState(false);

    // Off-screen selected indicators
    const selectedBeforeCount = useMemo(() => selections.filter(s => s.dayIndex < windowStart).length, [selections, windowStart]);
    const selectedAfterCount = useMemo(() => selections.filter(s => s.dayIndex >= windowStart + 7).length, [selections, windowStart]);

    const totalSlots = selections.length * 5 * 3;

    const timelineTrackRef = useRef<HTMLDivElement>(null);

    // Auto-scroll timeline to active hour when opened
    useEffect(() => {
        if (editingDayIndex !== null && timelineTrackRef.current) {
            const sel = selections.find(s => s.dayIndex === editingDayIndex);
            if (sel) {
                const hourIdx = TIMELINE_HOURS.indexOf(sel.hour);
                if (hourIdx !== -1) {
                    const itemWidth = 42;
                    const containerWidth = 380;
                    const scrollLeft = (hourIdx * itemWidth) - (containerWidth / 2) + (itemWidth / 2);
                    timelineTrackRef.current.scrollLeft = scrollLeft;
                }
            }
        }
    }, [editingDayIndex, selections]);

    const handleDayClick = (absIndex: number) => {
        const exists = selections.find(s => s.dayIndex === absIndex);
        if (exists) {
            // Already selected -> toggle editor
            setEditingDayIndex(editingDayIndex === absIndex ? null : absIndex);
        } else {
            // Not selected -> add and open editor
            setEditingDayIndex(absIndex);
            setSelections([...selections, { dayIndex: absIndex, hour: 19, minute: 0 }].sort((a, b) => a.dayIndex - b.dayIndex));
        }
    };

    const removeDay = (e: React.MouseEvent, absIndex: number) => {
        e.stopPropagation();
        setSelections(selections.filter(s => s.dayIndex !== absIndex));
        if (editingDayIndex === absIndex) setEditingDayIndex(null);
    };

    const setDayTime = (absIndex: number, h: number) => {
        setSelections(selections.map(s => s.dayIndex === absIndex ? { ...s, hour: h, minute: 0 } : s));
        setEditingDayIndex(null);
    };

    const navigateCalendar = (dir: 'left' | 'right') => {
        if (dir === 'left' && windowStart > 0) setWindowStart(Math.max(0, windowStart - 7));
        if (dir === 'right' && windowStart + 7 < ALL_DAYS.length) setWindowStart(Math.min(ALL_DAYS.length - 7, windowStart + 7));
    };

    const toggleSlotSelection = (slotId: string) => {
        setSelectedSlots(prev =>
            prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
        );
    };

    // Generate time slots starting from given hour:minute, in 15-min increments
    const generateTimeSlots = (startHour: number, startMinute: number, count: number) => {
        const slots = [];
        let currentMin = startHour * 60 + startMinute;
        for (let i = 0; i < count; i++) {
            const h = Math.floor(currentMin / 60);
            const m = currentMin % 60;
            if (h >= 24) break;
            const time = `${h}:${String(m).padStart(2, '0')}`;
            const clubCount = 2 + Math.floor(Math.random() * 4);
            const minPrice = 8 + Math.floor(Math.random() * 8);
            slots.push({ time, clubCount, minPrice });
            currentMin += 15;
        }
        return slots;
    };

    const getVisibleCount = (dayIndex: number) => {
        return visibleSlotCount[String(dayIndex)] || 4;
    };

    const showMoreSlots = (dayIndex: number) => {
        const current = getVisibleCount(dayIndex);
        setVisibleSlotCount({ ...visibleSlotCount, [String(dayIndex)]: current + 4 });
    };

    const fmt2 = (n: number) => String(n).padStart(2, '0');

    return (
        <div className="dpg-container">
            {/* LEFT CONTENT */}
            <div className="dpg-left">

                {/* Sticky Header */}
                <div className="dpg-sticky-header">
                    {/* Row 1: Logo + Calendar */}
                    <div className="dpg-header-row">
                        <div className="variant-b-logo dp-logo" onClick={onBack}>
                            <Zap fill="#FF6B00" color="#FF6B00" size={20} /> padelspot.
                        </div>

                        {/* Off-screen left indicator */}
                        {selectedBeforeCount > 0 && (
                            <div className="dpg-offscreen-badge left" onClick={() => navigateCalendar('left')}>
                                {selectedBeforeCount} <ChevronLeft size={12} />
                            </div>
                        )}

                        {/* Calendar Bar */}
                        <div className="dpg-calbar-wrapper">
                            <button
                                className="dpg-calbar-arrow"
                                onClick={() => navigateCalendar('left')}
                                disabled={windowStart === 0}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="dpg-calbar">
                                {visibleDays.map((d, i) => {
                                    const absIndex = windowStart + i;
                                    const sel = selections.find(s => s.dayIndex === absIndex);
                                    const isSelected = !!sel;
                                    const isEditing = editingDayIndex === absIndex;
                                    return (
                                        <div key={d.key} className="dpg-calbar-day-wrapper">
                                            <div
                                                className={`dp-calbar-day ${isSelected ? 'active' : ''} ${isEditing ? 'editing' : ''}`}
                                                onClick={() => handleDayClick(absIndex)}
                                            >
                                                <span className="dpg-calbar-day-name">{d.dayName}</span>
                                                <span className="dpg-calbar-day-num">{d.dateNum}</span>
                                                {isSelected && sel && (
                                                    <span className="dpg-calbar-day-hour">{sel.hour}h</span>
                                                )}

                                                {/* Hover Cross Button */}
                                                {isSelected && (
                                                    <button
                                                        className="dpg-day-close-btn"
                                                        onClick={(e) => removeDay(e, absIndex)}
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* TIMELINE DROPDOWN */}
                                            {isEditing && isSelected && (
                                                <div className="dpg-timeline-picker" onClick={(e) => e.stopPropagation()}>
                                                    <div className="dpg-timeline-picker-arrow" />
                                                    <div className="dpg-timeline-header">
                                                        <span>Début du créneau</span>
                                                        <MoreHorizontal size={14} color="#ccc" />
                                                    </div>
                                                    <div className="dpg-timeline-track" ref={timelineTrackRef}>
                                                        {TIMELINE_HOURS.map(h => {
                                                            const isCurrent = sel.hour === h;
                                                            return (
                                                                <div
                                                                    key={h}
                                                                    className={`dp-timeline-hour ${isCurrent ? 'active' : ''}`}
                                                                    onClick={() => setDayTime(absIndex, h)}
                                                                >
                                                                    <span className="dpg-timeline-h-num">{h}h</span>
                                                                    <div className="dpg-timeline-tick" />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                className="dpg-calbar-arrow"
                                onClick={() => navigateCalendar('right')}
                                disabled={windowStart + 7 >= ALL_DAYS.length}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Off-screen right indicator */}
                        {selectedAfterCount > 0 && (
                            <div className="dpg-offscreen-badge right" onClick={() => navigateCalendar('right')}>
                                <ChevronRight size={12} /> {selectedAfterCount}
                            </div>
                        )}

                        <div className="dpg-slot-count">
                            <span className="dpg-slot-count-num">{totalSlots}</span>
                            <span className="dpg-slot-count-label">créneaux</span>
                        </div>
                    </div>

                    {/* Row 2: Filters */}
                    <div className="dpg-filters-row">
                        <div className={`dp-filter-pill ${durationFilter === 'all' ? 'active' : ''}`}>
                            Toutes durées <ChevronDown size={14} />
                        </div>
                        <div className={`dp-filter-pill ${typeFilter !== 'all' ? 'active' : ''}`} onClick={() => setTypeFilter(typeFilter === 'all' ? 'indoor' : typeFilter === 'indoor' ? 'outdoor' : 'all')}>
                            {typeFilter === 'all' ? 'Indoor / Outdoor' : typeFilter === 'indoor' ? 'Indoor ✓' : 'Outdoor ✓'} <ChevronDown size={14} />
                        </div>
                        <div className={`dp-filter-pill ${isFavoriteOnly ? 'active' : ''}`} onClick={() => setIsFavoriteOnly(!isFavoriteOnly)}>
                            <Zap size={14} fill={isFavoriteOnly ? '#FF6B00' : 'transparent'} color={isFavoriteOnly ? '#FF6B00' : '#666'} /> Favoris
                        </div>
                        <div className="dpg-filter-pill" style={{ borderStyle: 'dashed' }}>
                            <SlidersHorizontal size={14} /> Plus de filtres
                        </div>
                    </div>
                </div>

                {/* Scrollable Results */}
                <div className="dpg-results-scroll">
                    {selections.length === 0 ? (
                        <div className="dpg-empty-state">
                            Cliquez sur un jour dans le calendrier pour commencer la recherche.
                        </div>
                    ) : (
                        selections.map(sel => {
                            const day = ALL_DAYS[sel.dayIndex];
                            const visCount = getVisibleCount(sel.dayIndex);
                            // Generate enough slots (up to 20)
                            const allTimeSlots = generateTimeSlots(sel.hour, sel.minute, 20);
                            const visibleTimeSlots = allTimeSlots.slice(0, visCount);
                            const hasMore = allTimeSlots.length > visCount;

                            return (
                                <div key={sel.dayIndex} className="dpg-day-section">
                                    <div className="dpg-day-section-header">
                                        {day.dayName.charAt(0) + day.dayName.slice(1).toLowerCase()} {day.dateNum} {day.monthShort}
                                    </div>

                                    {/* Horizontal scroll of slot cards + "more" button */}
                                    <div className="dpg-timeline-scroll">
                                        {visibleTimeSlots.map((slot) => {
                                            const slotKey = `${sel.dayIndex}|${slot.time}`;
                                            const isExpanded = expandedSlotKey === slotKey;
                                            const hasSelected = selectedSlots.some(id => id.startsWith(slotKey));
                                            return (
                                                <div key={slotKey} className="dpg-timeline-col">
                                                    <div
                                                        className={`dp-slot-card ${isExpanded ? 'active' : ''} ${hasSelected ? 'selected' : ''}`}
                                                        onClick={() => setExpandedSlotKey(isExpanded ? null : slotKey)}
                                                    >
                                                        <div className="dpg-slot-card-time">{slot.time}</div>
                                                        <div className="dpg-slot-card-price">{slot.minPrice}€</div>
                                                        <div className="dpg-slot-card-options">
                                                            {slot.clubCount > 1 ? `+${slot.clubCount - 1} options` : '1 terrain'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* "Show more" button */}
                                        {hasMore && (
                                            <div className="dpg-timeline-col">
                                                <button
                                                    className="dpg-show-more-btn"
                                                    onClick={() => showMoreSlots(sel.dayIndex)}
                                                >
                                                    <MoreHorizontal size={20} />
                                                    <span>Voir plus</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Expanded detail panel */}
                                    {expandedSlotKey && expandedSlotKey.startsWith(`${sel.dayIndex}|`) && (() => {
                                        const time = expandedSlotKey.split('|')[1];
                                        const endH = parseInt(time.split(':')[0]) + 1;
                                        const endM = time.split(':')[1];
                                        const clubs = MOCK_CLUBS.slice(0, 2 + Math.floor(Math.random() * 3));
                                        return (
                                            <div className="dpg-detail-panel">
                                                <div className="dpg-detail-header">
                                                    <span>{time} → {endH}:{endM}</span>
                                                    <span className="dpg-detail-badge">{clubs.length} terrains</span>
                                                </div>
                                                <div className="dpg-detail-list">
                                                    {clubs.map((club, ci) => {
                                                        const slotId = `${expandedSlotKey}|${ci}`;
                                                        const isSlotSelected = selectedSlots.includes(slotId);
                                                        return (
                                                            <div
                                                                key={ci}
                                                                className={`dp-detail-row ${isSlotSelected ? 'selected' : ''}`}
                                                                onClick={() => toggleSlotSelection(slotId)}
                                                            >
                                                                <div className="dpg-detail-checkbox">
                                                                    {isSlotSelected ? <div className="checked">✓</div> : <div className="unchecked" />}
                                                                </div>
                                                                <div className="dpg-detail-club">
                                                                    <span className="dpg-detail-club-name">{club.name}</span>
                                                                    <span className="dpg-detail-club-sub">{club.type} · {club.court} · {club.dist}</span>
                                                                </div>
                                                                <div className="dpg-detail-side">
                                                                    <span className="dpg-detail-price">{club.price}€</span>
                                                                    <button className="dpg-detail-book" onClick={(e) => e.stopPropagation()}>Réserver</button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })
                    )}

                    {/* Selection bar */}
                    {selectedSlots.length > 0 && (
                        <div className="dpg-selection-bar">
                            <span>{selectedSlots.length} créneau{selectedSlots.length > 1 ? 'x' : ''} sélectionné{selectedSlots.length > 1 ? 's' : ''}</span>
                            <button className="dpg-create-poll-btn">Créer un sondage →</button>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT CONTENT - MAP (40%) */}
            <div className="dpg-right">
                <div className="dpg-map-badge">
                    <Search size={16} /> Carte
                </div>
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>
                    [Map Leaflet / Mapbox]
                </div>
            </div>
        </div>
    );
}
