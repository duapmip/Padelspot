"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, startOfToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Zap,
    Users,
    Calendar,
    Search,
    LogOut,
    User as UserIcon,
    Flame,
    Clock,
    Plus,
    CheckCircle2,
    X,
    MapPin,
    ArrowRight,
    Bell,
    Check,
    ChevronRight,
    Share2
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { logout } from '@/app/auth/actions';

// --- TYPES ---

interface Member {
    id: string;
    first_name: string;
    avatar_url?: string;
}

interface ConfirmedMatch {
    id: string;
    date: Date;
    club_name: string;
    club_address?: string;
    players: Member[];
}

interface Poll {
    id: string;
    created_at: string;
    target_voters_count: number;
    votes_count: number;
    voters: string[];
    slot_dates: Date[];
    creator_name: string;
    is_ready_to_book: boolean;
    is_validated: boolean;
}

interface Friend {
    id: string;
    friend_name: string;
}

interface SuggestedSlot {
    id: string;
    centerName: string;
    startTime: Date;
    price: number;
}

// --- MAIN CONTAINER ---

interface DashboardViewProps {
    user: User;
    onNavigateToSearch: () => void;
    onViewPoll: (id: string) => void;
    onNavigateToSettings: () => void;
    selections: { dayIndex: number, hour: number, minute: number }[];
    setSelections: (val: any) => void;
}

export default function DashboardView({ user, onNavigateToSearch, onViewPoll, onNavigateToSettings, selections, setSelections }: DashboardViewProps) {
    const [profile, setProfile] = useState<any>(null);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [invites, setInvites] = useState<Poll[]>([]);
    const [confirmedMatches, setConfirmedMatches] = useState<ConfirmedMatch[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlot[]>([]);
    const [loading, setLoading] = useState(true);
    // showValidationPopup is now handled by the parent ClubBookingInterface

    // Pickers State
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

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

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // Profile
                const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setProfile(prof);

                // 1. Fetch polls created by me
                const { data: myPolls } = await supabase
                    .from('polls')
                    .select('*, poll_votes(*), poll_slots(slot_id)')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                // 2. Fetch polls where I voted (using name for now since user_id is missing in poll_votes)
                const myName = (prof?.first_name || user.email?.split('@')[0])?.trim();
                const { data: votedPollsIds } = await supabase
                    .from('poll_votes')
                    .select('poll_id')
                    .eq('user_name', myName);

                const otherPollIds = Array.from(new Set(votedPollsIds?.map(v => v.poll_id))).filter(id => !myPolls?.some(mp => mp.id === id));

                let myInvites: any[] = [];
                if (otherPollIds.length > 0) {
                    const { data: invitations } = await supabase
                        .from('polls')
                        .select('*, poll_votes(*), poll_slots(slot_id)')
                        .in('id', otherPollIds);
                    myInvites = invitations || [];
                }

                // 2.5 Fetch slot details for all polls to get dates
                const allSlotIds = new Set<string>();
                [...(myPolls || []), ...myInvites].forEach(p => {
                    (p.poll_slots || []).forEach((ps: any) => allSlotIds.add(ps.slot_id));
                });

                const { data: slotDetails } = await supabase
                    .from('slots')
                    .select('id, start_time')
                    .in('id', Array.from(allSlotIds));

                const slotDateMap: Record<string, string> = {};
                slotDetails?.forEach(s => {
                    slotDateMap[s.id] = s.start_time;
                });

                const processPolls = (rawPolls: any[], isCreator: boolean): Poll[] => {
                    return rawPolls.map(p => {
                        const chaudVotesBySlot: Record<string, number> = {};
                        const uniqueVoters = new Set<string>();

                        // Use poll.creator_name as the first voter
                        uniqueVoters.add(p.creator_name || 'Organisateur');

                        (p.poll_votes || []).forEach((v: any) => {
                            if (v.vote_value === true) {
                                chaudVotesBySlot[v.slot_id] = (chaudVotesBySlot[v.slot_id] || 0) + 1;
                            }
                            // Clean user_name to avoid duplicates like "Adrien " vs "Adrien"
                            const name = (v.user_name || '').trim();
                            if (name) uniqueVoters.add(name);
                        });

                        const values = Object.values(chaudVotesBySlot);
                        const maxVotesOnASlot = values.length > 0 ? Math.max(...values) : 1;

                        const pollSlotDates = (p.poll_slots || [])
                            .map((ps: any) => slotDateMap[ps.slot_id])
                            .filter(Boolean)
                            .map((dateStr: string) => new Date(dateStr));

                        return {
                            id: p.id,
                            created_at: p.created_at,
                            slot_dates: pollSlotDates,
                            target_voters_count: p.target_voters_count || 4,
                            votes_count: uniqueVoters.size,
                            voters: Array.from(uniqueVoters),
                            creator_name: isCreator ? 'Moi' : (p.creator_name || 'Organisateur'),
                            is_ready_to_book: maxVotesOnASlot >= (p.target_voters_count || 4),
                            is_validated: p.is_validated || false
                        };
                    });
                };

                // 3. Fetch Real Reservations
                const { data: resData, error: resError } = await supabase
                    .from('reservations')
                    .select(`
                        *,
                        reservation_players (
                            player_name
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('start_time', { ascending: true });

                if (!resError && resData) {
                    const formatted = resData.map((r: any) => ({
                        id: r.id,
                        date: new Date(r.start_time),
                        club_name: r.center_name,
                        court_name: r.court_name,
                        players: r.reservation_players.map((rp: any) => ({ first_name: rp.player_name }))
                    }));
                    setConfirmedMatches(formatted);
                }

                setPolls(processPolls(myPolls || [], true));
                setInvites(processPolls(myInvites, false));

                setFriends([]);
                setSuggestedSlots([]);

            } catch (err) {
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user.id]);

    const confirmBooking = async (success: boolean) => {
        // Redundant here, handled in parent
    };

    return (
        <div style={{ minHeight: '100vh', background: '#F9FAFB', color: '#1A1A1A', fontFamily: 'var(--font-heading)' }}>

            {/* HEADER - CLEAN & MINIMAL */}
            <header style={{ height: '72px', background: '#FFF', borderBottom: '1px solid #EDEDED', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => window.location.reload()}>
                        <Zap size={28} fill="#FF6B00" stroke="none" />
                        <span style={{ fontWeight: 950, fontSize: '1.5rem', letterSpacing: '-0.05em', color: '#000', fontFamily: 'var(--font-heading)' }}>PADELSPOT</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <button style={{ position: 'relative', padding: '4px' }}>
                            <Bell size={18} color="#999" />
                            <span style={{ position: 'absolute', top: '2px', right: '2px', width: '7px', height: '7px', background: '#FF6B00', borderRadius: '50%', border: '1.5px solid #FFF' }} />
                        </button>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #EEE' }} onClick={onNavigateToSettings}>
                            <UserIcon size={16} color="#666" />
                        </div>
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>

                {/* HERO AREA - REFINED & COMPACT */}
                <div style={{ marginBottom: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}>
                    <div style={{ flex: '1', minWidth: '300px' }}>
                        <h2 style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1 }}>On joue quand ?</h2>
                    </div>

                    <div
                        className="hero-search-wrapper"
                        style={{ flex: '1.5', minWidth: '400px', zIndex: 500 }}
                    >
                        <div className="hero-search-capsule" style={{ position: 'relative', width: '100%', padding: '0.4rem', background: 'rgba(255,255,255,0.95)', border: '1px solid #EDEDED', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
                            <div
                                className="search-field-capsule"
                                onClick={() => { setIsDatePickerOpen(!isDatePickerOpen); setIsTimePickerOpen(false); }}
                                style={{ flex: 1, minWidth: 0, padding: '0.5rem 1.5rem', cursor: 'pointer' }}
                            >
                                <label style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#999', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '2px', display: 'block' }}>Quand ?</label>
                                <span className="value" style={{ fontSize: '0.92rem', fontWeight: 700, color: '#000' }}>
                                    {format(ALL_DAYS[selections[0].dayIndex].date, 'EEE d MMM', { locale: fr })}
                                </span>
                            </div>
                            <div style={{ width: 1, margin: '8px 0', background: '#EDEDED' }} />
                            <div
                                className="search-field-capsule"
                                onClick={() => { setIsTimePickerOpen(!isTimePickerOpen); setIsDatePickerOpen(false); }}
                                style={{ flex: 1, minWidth: 0, padding: '0.5rem 1.5rem', cursor: 'pointer' }}
                            >
                                <label style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#999', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '2px', display: 'block' }}>Heure</label>
                                <span className="value" style={{ fontSize: '0.92rem', fontWeight: 700, color: '#000' }}>{selections[0].hour}h00</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', padding: '0.2rem' }}>
                                <button
                                    className="hero-search-btn"
                                    onClick={onNavigateToSearch}
                                    style={{
                                        background: '#FF6B00',
                                        color: '#FFF',
                                        border: 'none',
                                        padding: '0.9rem 1.8rem',
                                        borderRadius: '999px',
                                        fontWeight: 900,
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 8px 20px rgba(255,107,0,0.2)'
                                    }}
                                >
                                    RECHERCHER
                                </button>
                            </div>

                            {/* Pickers Popups */}
                            <AnimatePresence>
                                {isDatePickerOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        style={{ position: 'absolute', top: '120%', left: '0', right: '0', background: '#fff', borderRadius: '1.5rem', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', zIndex: 1000, border: '1px solid #EDEDED' }}
                                    >
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
                                            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((dayStr, i) => (
                                                <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 900, color: '#aaa', marginBottom: '1rem' }}>{dayStr}</div>
                                            ))}
                                            {ALL_DAYS.slice(0, 21).map((day, i) => (
                                                <button
                                                    key={day.key}
                                                    onClick={() => { setSelections([{ dayIndex: i, hour: selections[0].hour, minute: selections[0].minute }]); setIsDatePickerOpen(false); }}
                                                    style={{
                                                        aspectRatio: '1/1', borderRadius: '50%', border: 'none', background: selections[0].dayIndex === i ? '#FF6B00' : 'transparent',
                                                        color: selections[0].dayIndex === i ? '#fff' : '#000', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}
                                                >
                                                    {day.dateNum}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {isTimePickerOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        style={{ position: 'absolute', top: '120%', right: '0', background: '#fff', borderRadius: '1.5rem', padding: '1.5rem', width: '280px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', zIndex: 1000, border: '1px solid #EDEDED', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}
                                    >
                                        {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
                                            <button
                                                key={h}
                                                onClick={() => { setSelections([{ dayIndex: selections[0].dayIndex, hour: h, minute: 0 }]); setIsTimePickerOpen(false); }}
                                                style={{
                                                    padding: '0.5rem 0', borderRadius: '8px', border: selections[0].hour === h ? '2px solid #FF6B00' : '1px solid #EEE',
                                                    background: selections[0].hour === h ? 'rgba(255,107,0,0.05)' : '#FFF', color: '#000', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
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
                </div>

                {/* UPCOMING MATCHES - CALENDAR INTEGRATED */}
                <section style={{ marginBottom: '64px' }}>
                    <SectionHeader title="Mes Réservations" count={confirmedMatches.length} />

                    {/* Horizontal Calendar */}
                    <div style={{
                        display: 'flex',
                        overflowX: 'auto',
                        gap: '8px',
                        paddingBottom: '16px',
                        marginBottom: '24px',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none'
                    }}>
                        {ALL_DAYS.slice(0, 14).map((day, i) => {
                            const hasMatch = confirmedMatches.some(m =>
                                format(m.date, 'yyyy-MM-dd') === day.key
                            );
                            const isToday = day.key === format(new Date(), 'yyyy-MM-dd');

                            return (
                                <div
                                    key={day.key}
                                    style={{
                                        flex: '1',
                                        minWidth: '70px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 900,
                                        color: isToday ? '#FF6B00' : '#BBB',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {format(day.date, 'EEEE', { locale: fr })}
                                    </span>
                                    <span style={{
                                        fontSize: '20px',
                                        fontWeight: 800,
                                        color: isToday ? '#000' : '#444'
                                    }}>
                                        {day.dateNum}
                                    </span>
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: hasMatch ? '#FF6B00' : '#F0F0F0',
                                        marginTop: '4px'
                                    }} />
                                </div>
                            );
                        })}
                    </div>

                    {confirmedMatches.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {confirmedMatches.map(match => (
                                <div key={match.id} style={{ background: '#FFF', border: '1px solid #EDEDED', borderRadius: '24px', padding: '24px', display: 'flex', alignItems: 'center', gap: '32px', transition: 'transform 0.2s', cursor: 'pointer' }}>
                                    <div style={{ textAlign: 'center', paddingRight: '32px', borderRight: '1px solid #F0F0F0', minWidth: '95px' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 950, color: '#FF6B00', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>{format(match.date, 'EEEE', { locale: fr })}</div>
                                        <div style={{ fontSize: '22px', fontWeight: 950, lineHeight: 1, letterSpacing: '-0.02em', color: '#000' }}>{format(match.date, 'd MMM', { locale: fr })}</div>
                                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#999', marginTop: '6px' }}>{format(match.date, 'HH:mm')}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '2px' }}>{match.club_name}</h4>
                                        <p style={{ fontSize: '13px', color: '#999', fontWeight: 600 }}>{match.club_address}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                                            {match.players.map((p, i) => (
                                                <div key={i} style={{ padding: '4px 10px', borderRadius: '8px', background: '#F5F5F5', border: '1px solid rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: `hsl(${(i * 137) % 360}, 60%, 50%)`, fontSize: '8px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{p.first_name?.[0]}</div>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#333' }}>{p.first_name}</span>
                                                </div>
                                            ))}
                                            {match.players.length === 0 && <span style={{ fontSize: '11px', color: '#BDBDBD', fontWeight: 600 }}>Solo</span>}
                                        </div>
                                    </div>
                                    <button style={{ padding: '12px 20px', borderRadius: '14px', background: '#F9FAFB', border: '1px solid #EDEDED', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>Itinéraire</button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '40px', textAlign: 'center', background: '#FFF', borderRadius: '24px', border: '1px dashed #DDD' }}>
                            <p style={{ color: '#999', fontSize: '14px', fontWeight: 600 }}>Aucune réservation prévue pour le moment.</p>
                        </div>
                    )}
                </section>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>

                    {/* COLUMN 1: ACTION REQUISE */}
                    <section>
                        <SectionHeader title="Action Requise" count={invites.length} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {invites.map(invite => (
                                <div key={invite.id} style={{ background: '#FFF', border: '1px solid #FFEDCC', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 12px rgba(255,107,0,0.03)' }}>
                                    <p style={{ fontSize: '10px', fontWeight: 900, color: '#FF6B00', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invitation</p>
                                    <h5 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', lineHeight: 1.4 }}>Le match de {invite.creator_name} <br /><span style={{ color: '#999', fontSize: '13px', fontWeight: 600 }}>Vendredi à 19h</span></h5>
                                    <button onClick={() => onViewPoll(invite.id)} style={{ width: '100%', padding: '14px', background: '#FF6B00', color: '#FFF', borderRadius: '16px', fontWeight: 800, fontSize: '13px', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'} onMouseOut={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}>Voter maintenant</button>
                                </div>
                            ))}
                            {invites.length === 0 && (
                                <div style={{ background: '#FFF', border: '1px dashed #EEE', borderRadius: '24px', padding: '32px', textAlign: 'center', opacity: 0.5 }}>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#999' }}>Rien pour le moment</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* COLUMN 2: MES SONDAGES */}
                    <section>
                        <SectionHeader title="Mes Sondages" count={polls.length} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {polls.filter(p => !p.is_validated).map(poll => (
                                <div
                                    key={poll.id}
                                    onClick={() => onViewPoll(poll.id)}
                                    style={{
                                        background: '#FFF',
                                        border: '1px solid #EDEDED',
                                        borderRadius: '24px',
                                        padding: '20px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = '#FF6B00'}
                                    onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = '#EDEDED'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                        <div>
                                            <h5 style={{ fontSize: '10px', fontWeight: 950, textTransform: 'uppercase', color: '#999', letterSpacing: '0.1em', marginBottom: '14px' }}>Organisation Match</h5>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {poll.slot_dates && poll.slot_dates.length > 0 ? (
                                                    Array.from(new Set(poll.slot_dates
                                                        .sort((a: Date, b: Date) => a.getTime() - b.getTime())
                                                        .map((d: Date) => d.toISOString())))
                                                        .slice(0, 3) // Show max 3 to keep it compact
                                                        .map((dateIso, i) => {
                                                            const d = new Date(dateIso);
                                                            return (
                                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#F9FAFB', border: '1px solid #F0F0F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <span style={{ fontSize: '11px', fontWeight: 950, color: '#FF6B00', lineHeight: 1 }}>{format(d, 'dd')}</span>
                                                                        <span style={{ fontSize: '7px', fontWeight: 900, textTransform: 'uppercase', color: '#999' }}>{format(d, 'MMM', { locale: fr })}</span>
                                                                    </div>
                                                                    <div>
                                                                        <p style={{ fontSize: '14px', fontWeight: 800, color: '#000', textTransform: 'capitalize' }}>{format(d, 'EEEE', { locale: fr })}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                ) : (
                                                    <p style={{ fontSize: '12px', color: '#999', fontWeight: 700 }}>Créé le {format(new Date(poll.created_at), 'd MMMM', { locale: fr })}</p>
                                                )}
                                                {(poll.slot_dates || []).length > 3 && (
                                                    <p style={{ fontSize: '11px', color: '#FF6B00', fontWeight: 800, marginLeft: '44px' }}>+ {(poll.slot_dates || []).length - 3} autres créneaux</p>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '18px', fontWeight: 950, color: poll.is_ready_to_book ? '#2E7D32' : '#000', lineHeight: 1 }}>
                                                {poll.votes_count}<span style={{ color: '#E0E0E0', margin: '0 2px' }}>/</span>{poll.target_voters_count}
                                            </div>
                                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#999', textTransform: 'uppercase', marginTop: '6px', letterSpacing: '0.02em' }}>Joueurs</p>
                                            <div style={{ display: 'flex', gap: '4px', marginTop: '12px', justifyContent: 'flex-end' }}>
                                                {(poll.voters as any[]).slice(0, 3).map((vName, i) => (
                                                    <div key={i} title={vName} style={{ width: 16, height: 16, borderRadius: '50%', background: `hsl(${(i * 137) % 360}, 60%, 50%)`, fontSize: '8px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, border: '1.5px solid #FFF' }}>{vName[0]}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ height: '4px', background: '#F5F5F5', borderRadius: '2px', marginTop: '20px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', background: poll.is_ready_to_book ? '#2E7D32' : '#FF6B00', width: `${(poll.votes_count / poll.target_voters_count) * 100}%`, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                    </div>

                                    {poll.is_ready_to_book && (
                                        <button onClick={(e) => { e.stopPropagation(); setShowValidationPopup({ id: poll.id, club: "Big Padel" }); }} style={{ width: '100%', padding: '12px', background: '#1A1A1A', color: '#FFF', borderRadius: '14px', fontWeight: 800, fontSize: '13px', border: 'none', cursor: 'pointer', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <Check size={16} /> Réserver
                                        </button>
                                    )}
                                </div>
                            ))}
                            {polls.length === 0 && (
                                <div style={{ background: '#FFF', border: '1px dashed #EEE', borderRadius: '24px', padding: '32px', textAlign: 'center', opacity: 0.5 }}>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#999' }}>Aucun sondage en cours</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* COLUMN 3: MES POTES */}
                    <section>
                        <SectionHeader title="Mes Potes" count={friends.length} />
                        <div style={{ background: '#FFF', border: '1px solid #EDEDED', borderRadius: '24px', padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                {friends.map(f => (
                                    <div
                                        key={f.id}
                                        title={f.friend_name}
                                        style={{
                                            aspectRatio: '1/1',
                                            borderRadius: '16px',
                                            background: '#F9FAFB',
                                            border: '1px solid #F0F0F0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: 800,
                                            color: '#1A1A1A',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#FF6B00'; (e.currentTarget as HTMLElement).style.color = '#FF6B00'; }}
                                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = '#F0F0F0'; (e.currentTarget as HTMLElement).style.color = '#1A1A1A'; }}
                                    >
                                        {f.friend_name[0]}
                                    </div>
                                ))}
                                <button style={{ aspectRatio: '1/1', borderRadius: '16px', border: '2px dashed #EEE', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = '#CCC'} onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = '#EEE'}>
                                    <Plus size={20} color="#BBB" />
                                </button>
                            </div>
                            <button style={{ width: '100%', marginTop: '24px', padding: '12px', background: 'transparent', border: '1px solid #EEE', borderRadius: '12px', fontSize: '12px', fontWeight: 700, color: '#666', cursor: 'pointer' }}>Gérer mes contacts</button>
                        </div>
                    </section>

                </div>
            </main >

            {/* VALIDATION POPUP - Handled by parent ClubBookingInterface */}
        </div >
    );
}

// --- HELPERS ---

function SectionHeader({ title, count }: { title: string, count?: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#CCC' }}>{title}</h3>
            {count ? <span style={{ fontSize: '10px', fontWeight: 800, color: '#999', background: '#F5F5F5', padding: '2px 6px', borderRadius: '6px' }}>{count}</span> : null}
            <div style={{ flex: 1, height: '1px', background: '#F0F0F0' }} />
        </div>
    );
}
