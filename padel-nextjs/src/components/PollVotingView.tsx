'use client'

import React, { useState, useEffect } from 'react'
import PollHeader from './PollHeader'
import PollSlotCard from './PollSlotCard'
import PollWhatsAppShare from './PollWhatsAppShare'
import { castVote } from '@/app/poll/actions'
import { format, parseISO, isValid } from 'date-fns'

// Helper to safely parse and validate dates
const safeParseDate = (raw: any): Date | null => {
    if (!raw) return null;
    const date = typeof raw === 'string' ? parseISO(raw) : (raw instanceof Date ? raw : new Date(raw));
    return isValid(date) ? date : null;
};

interface PollVotingViewProps {
    poll: any;
    user: any;
    guestName?: string;
}

export default function PollVotingView({ poll, user, guestName }: PollVotingViewProps) {
    const [votes, setVotes] = useState(poll.votes || []);
    const [loading, setLoading] = useState(false);

    // Identify current user's name
    const currentUserName = guestName || (user ? (user.user_metadata?.first_name || user.email?.split('@')?.[0]) : '');

    const handleVoteAction = async (slotId: string, isAvailable: boolean) => {
        if (!currentUserName) {
            const name = prompt("Entre ton nom pour voter :");
            if (!name) return;
            window.location.href = `${window.location.pathname}?guest=${encodeURIComponent(name)}`;
            return;
        }

        // Optimistic UI update
        const existingVoteIndex = votes.findIndex((v: any) => v.slot_id === slotId && v.user_name === currentUserName);
        const newVotes = [...votes];

        if (existingVoteIndex > -1) {
            newVotes[existingVoteIndex] = { ...newVotes[existingVoteIndex], vote_value: isAvailable };
        } else {
            newVotes.push({ id: Math.random().toString(), slot_id: slotId, user_name: currentUserName, vote_value: isAvailable });
        }
        setVotes(newVotes);

        // Real update
        setLoading(true);
        const res = await castVote(poll.id, slotId, currentUserName, isAvailable);
        if (res.error) {
            alert("Erreur lors du vote : " + res.error);
            setVotes(poll.votes); // Rollback
        }
        setLoading(false);
    };

    // Calculate days with slots for the header
    const daysWithSlots = Array.from(new Set(poll.slots.map((s: any) => {
        const actualSlot = s.slot || s;
        const date = safeParseDate(actualSlot.start_time || actualSlot.startTime);
        return date ? format(date, 'yyyy-MM-dd') : null;
    }).filter(Boolean)));

    const votersCount = new Set(votes.filter((v: any) => v.vote_value).map((v: any) => v.user_name)).size;

    return (
        <div className="min-h-screen bg-slate-100 flex justify-center font-sans">
            {/* Mobile Container */}
            <div className="w-full max-w-[500px] bg-[#F8F9FB] shadow-2xl shadow-black/10 min-h-screen flex flex-col overflow-x-hidden relative">
                <PollHeader
                    title={`Match de ${poll.creator?.first_name || 'Organisateur'}`}
                    votersCount={votersCount}
                    targetCount={poll.target_voters_count || 4}
                    daysWithSlots={daysWithSlots as string[]}
                />

                <main className="flex-1 px-4 py-8 pb-32">
                    <div className="px-2 mb-8 flex items-center justify-between">
                        <h2 className="text-xl font-black uppercase text-gray-900 leading-none tracking-tight underline decoration-orange-500 decoration-4 underline-offset-8">Options</h2>
                        <span className="text-[10px] font-black uppercase text-black/20 tracking-widest">Chronologique</span>
                    </div>

                    <div className="space-y-8">
                        {poll.slots.sort((a: any, b: any) => {
                            const sA = a.slot || a;
                            const sB = b.slot || b;
                            const dA = safeParseDate(sA.start_time || sA.startTime);
                            const dB = safeParseDate(sB.start_time || sB.startTime);
                            if (!dA || !dB) return 0;
                            return dA.getTime() - dB.getTime();
                        }).map((slot: any) => (
                            <PollSlotCard
                                key={slot.id || (slot.slot?.id || slot.slot_id)}
                                slot={slot}
                                voters={votes.filter((v: any) => v.slot_id === (slot.slot?.id || slot.slot_id))}
                                currentUserName={currentUserName}
                                onVote={(isAvailable) => handleVoteAction(slot.slot?.id || slot.slot_id, isAvailable)}
                            />
                        ))}
                    </div>

                    {user?.id === poll.user_id && (
                        <div className="mt-16">
                            <PollWhatsAppShare pollId={poll.id} creatorName={currentUserName} />
                        </div>
                    )}
                </main>

                {/* Floating identity badge */}
                <div className="sticky bottom-8 left-0 right-0 px-4 flex justify-center pointer-events-none z-50">
                    <div className="px-6 py-3 bg-black text-white rounded-full text-[10px] font-black uppercase shadow-2xl tracking-[0.2em] flex items-center gap-3 border border-white/20 whitespace-nowrap pointer-events-auto">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)] animate-pulse" />
                        Vote : {currentUserName || 'Visiteur'}
                    </div>
                </div>
            </div>
        </div>
    )
}
