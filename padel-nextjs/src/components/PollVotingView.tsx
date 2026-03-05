'use client'

import React, { useState, useEffect } from 'react'
import PollHeader from './PollHeader'
import PollSlotCard from './PollSlotCard'
import PollWhatsAppShare from './PollWhatsAppShare'
import { castVote } from '@/app/poll/actions'
import { format, parseISO } from 'date-fns'

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
        const rawTime = actualSlot.start_time || actualSlot.startTime;
        if (!rawTime) return null;
        const date = typeof rawTime === 'string' ? parseISO(rawTime) : rawTime;
        return format(date, 'yyyy-MM-dd');
    }).filter(Boolean)));

    const votersCount = new Set(votes.filter((v: any) => v.vote_value).map((v: any) => v.user_name)).size;

    return (
        <div className="min-h-screen bg-[#F8F9FB] pb-20 font-sans">
            <div className="max-w-xl mx-auto bg-white shadow-2xl shadow-black/5 min-h-screen">
                <PollHeader
                    title={`Match de ${poll.creator?.first_name || 'Anonyme'}`}
                    votersCount={votersCount}
                    targetCount={poll.target_voters_count || 4}
                    daysWithSlots={daysWithSlots as string[]}
                />

                <main className="mt-8">
                    <div className="px-6 mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-black uppercase text-gray-900 leading-none">Options de jeu</h2>
                        <span className="text-[10px] font-black uppercase text-black/20 tracking-tighter">Trie : Chronologique</span>
                    </div>

                    <section className="space-y-4">
                        {poll.slots.sort((a: any, b: any) => {
                            const sA = a.slot || a;
                            const sB = b.slot || b;
                            const tA = sA.start_time || sA.startTime;
                            const tB = sB.start_time || sB.startTime;
                            return new Date(tA).getTime() - new Date(tB).getTime();
                        }).map((slot: any) => (
                            <PollSlotCard
                                key={slot.id}
                                slot={slot}
                                voters={votes.filter((v: any) => v.slot_id === (slot.slot?.id || slot.slot_id))}
                                currentUserName={currentUserName}
                                onVote={(isAvailable) => handleVoteAction(slot.slot?.id || slot.slot_id, isAvailable)}
                            />
                        ))}
                    </section>

                    {/* Show Share only if user is the creator */}
                    {user?.id === poll.user_id && (
                        <div className="mt-12">
                            <PollWhatsAppShare pollId={poll.id} creatorName={currentUserName} />
                        </div>
                    )}
                </main>

                {/* Float Label for current user */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black text-white rounded-full text-[10px] font-black uppercase shadow-xl tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Vote en tant que : {currentUserName || 'Visiteur'}
                </div>
            </div>
        </div>
    )
}
