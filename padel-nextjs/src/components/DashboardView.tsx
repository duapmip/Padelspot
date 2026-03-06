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
    const [showValidationPopup, setShowValidationPopup] = useState<{ id: string, club: string } | null>(null);

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
                    .select('*, poll_votes(*)')
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
                        .select('*, poll_votes(*)')
                        .in('id', otherPollIds);
                    myInvites = invitations || [];
                }

                const processPolls = (rawPolls: any[], isCreator: boolean) => {
                    return rawPolls.map(p => {
                        const chaudVotesBySlot: Record<string, number> = {};
                        const uniqueVoters = new Set();

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

                        return {
                            id: p.id,
                            created_at: p.created_at,
                            target_voters_count: p.target_voters_count || 4,
                            votes_count: uniqueVoters.size,
                            creator_name: isCreator ? 'Moi' : (p.creator_name || 'Organisateur'),
                            is_ready_to_book: maxVotesOnASlot >= (p.target_voters_count || 4),
                            is_validated: p.is_validated || false
                        };
                    });
                };

                setPolls(processPolls(myPolls || [], true));
                setInvites(processPolls(myInvites, false));

                setConfirmedMatches([]);
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
        if (!showValidationPopup) return;
        if (success) setPolls(prev => prev.map(p => p.id === showValidationPopup.id ? { ...p, is_validated: true } : p));
        setShowValidationPopup(null);
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
                                    <div style={{ textAlign: 'center', paddingRight: '32px', borderRight: '1px solid #F0F0F0', minWidth: '80px' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 900, color: '#999', textTransform: 'uppercase', marginBottom: '2px' }}>{format(match.date, 'MMM', { locale: fr })}</div>
                                        <div style={{ fontSize: '28px', fontWeight: 900, lineHeight: 1 }}>{format(match.date, 'dd')}</div>
                                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#FF6B00', marginTop: '4px' }}>{format(match.date, 'HH:mm')}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '2px' }}>{match.club_name}</h4>
                                        <p style={{ fontSize: '13px', color: '#999', fontWeight: 600 }}>{match.club_address}</p>
                                        <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                                            {match.players.map((p, i) => (
                                                <div key={i} style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#666' }}>
                                                    {p.first_name[0]}
                                                </div>
                                            ))}
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
                                    style={{ background: '#FFF', border: '1px solid #EDEDED', borderRadius: '24px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = '#FF6B00'}
                                    onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = '#EDEDED'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                        <div>
                                            <h5 style={{ fontSize: '15px', fontWeight: 800 }}>Match {format(new Date(poll.created_at), 'EEEE', { locale: fr })}</h5>
                                            <p style={{ fontSize: '12px', color: '#999', fontWeight: 600 }}>{format(new Date(poll.created_at), 'd MMMM', { locale: fr })}</p>
                                        </div>
                                        <span style={{ fontSize: '10px', fontWeight: 900, color: poll.is_ready_to_book ? '#2E7D32' : '#999', background: poll.is_ready_to_book ? '#E8F5E9' : '#F5F5F5', padding: '4px 8px', borderRadius: '6px' }}>{poll.votes_count}/{poll.target_voters_count}</span>
                                    </div>
                                    {poll.is_ready_to_book ? (
                                        <button onClick={(e) => { e.stopPropagation(); setShowValidationPopup({ id: poll.id, club: "Big Padel" }); }} style={{ width: '100%', padding: '14px', background: '#1A1A1A', color: '#FFF', borderRadius: '16px', fontWeight: 800, fontSize: '13px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <Check size={16} /> Réserver
                                        </button>
                                    ) : (
                                        <button style={{ width: '100%', padding: '14px', background: '#F5F5F5', color: '#666', borderRadius: '16px', fontWeight: 800, fontSize: '13px', border: 'none', cursor: 'pointer' }}>Relancer le groupe</button>
                                    )}
                                    <div style={{ height: '4px', background: '#F5F5F5', borderRadius: '2px', marginTop: '20px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', background: poll.is_ready_to_book ? '#2E7D32' : '#FF6B00', width: `${(poll.votes_count / poll.target_voters_count) * 100}%`, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                    </div>
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
            </main>

            {/* VALIDATION POPUP - CLEAN OVERLAY */}
            <AnimatePresence>
                {showValidationPopup && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowValidationPopup(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} style={{ position: 'relative', background: '#FFF', borderRadius: '32px', padding: '48px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
                            <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Réservation réussie ?</h3>
                            <p style={{ color: '#666', marginBottom: '32px', fontWeight: 500 }}>Tu as bloqué le créneau à {showValidationPopup.club} ?</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button onClick={() => confirmBooking(true)} style={{ padding: '16px', borderRadius: '16px', background: '#FF6B00', color: '#FFF', fontWeight: 800, fontSize: '15px' }}>Oui, c'est booké !</button>
                                <button onClick={() => confirmBooking(false)} style={{ padding: '16px', borderRadius: '16px', background: '#F5F5F5', color: '#666', fontWeight: 700, fontSize: '15px' }}>Non, c'était complet</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
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
