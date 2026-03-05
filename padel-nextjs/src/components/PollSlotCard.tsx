'use client'

import React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ThumbsUp, ThumbsDown, Check, Clock, MapPin, Euro } from 'lucide-react'

// Helper to safely parse and validate dates
const safeParseDate = (raw: any): Date | null => {
    if (!raw) return null;
    const date = typeof raw === 'string' ? parseISO(raw) : (raw instanceof Date ? raw : new Date(raw));
    return isValid(date) ? date : null;
};

interface Voter {
    id: string;
    user_name: string;
    vote_value: boolean;
}

interface PollSlotCardProps {
    slot: any;
    voters: Voter[];
    currentUserName: string;
    onVote: (isAvailable: boolean) => void;
}

export default function PollSlotCard({ slot, voters, currentUserName, onVote }: PollSlotCardProps) {
    const actualSlot = slot.slot || slot;
    const startTime = safeParseDate(actualSlot.start_time || actualSlot.startTime);

    if (!startTime) return null;

    const day = format(startTime, 'EEEE d MMMM', { locale: fr });
    const time = format(startTime, 'HH:mm');

    const yesVoters = voters.filter(v => v.vote_value === true);
    const currentUserVote = voters.find(v => v.user_name === currentUserName);

    return (
        <article className="mx-4 bg-white rounded-[2.5rem] border border-black/5 shadow-2xl shadow-black/[0.02] overflow-hidden flex flex-col">
            <div className="p-7">
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <div className="text-[10px] font-black uppercase text-black/20 tracking-[0.2em] mb-3 flex items-center gap-2">
                            <Clock size={10} strokeWidth={3} /> {day}
                        </div>
                        <div className="flex items-end gap-3">
                            <h3 className="text-4xl font-black text-gray-950 tracking-tighter leading-none">{time}</h3>
                            <div className="mb-1 px-2.5 py-1 bg-black/5 rounded-lg text-[10px] font-black uppercase text-black/40">90 min</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black uppercase text-black/20 tracking-[0.2em] mb-2 flex items-center justify-end gap-1.5 font-sans">
                            <Euro size={10} strokeWidth={3} /> Prix
                        </div>
                        <div className="text-xl font-black text-orange-500 tracking-tight">{actualSlot.price ? `${actualSlot.price}€` : '--€'}</div>
                    </div>
                </div>

                <div className="flex items-center gap-3 mb-8 p-4 bg-black/[0.02] rounded-3xl border border-black/[0.02]">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <MapPin size={18} className="text-orange-500" strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-black uppercase text-gray-800 tracking-tight line-clamp-1">{actualSlot.center_name || 'Complex Bordeaux'}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-10">
                    {yesVoters.length > 0 ? (
                        <>
                            {yesVoters.map((v, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/5 rounded-full border border-orange-500/10">
                                    <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-[8px] text-white font-bold">
                                        <Check size={9} strokeWidth={4} />
                                    </div>
                                    <span className="text-[11px] font-black text-orange-600 uppercase tracking-tight">{v.user_name}</span>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="text-[11px] font-bold text-black/10 uppercase tracking-widest px-1 italic">En attente de votes...</div>
                    )}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => onVote(true)}
                        className={`flex-[3.5] h-16 rounded-3xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${currentUserVote?.vote_value === true
                                ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30'
                                : 'bg-black/[0.03] text-black/30 hover:bg-black/[0.05] font-black uppercase'
                            }`}
                    >
                        <ThumbsUp size={22} fill={currentUserVote?.vote_value === true ? "white" : "none"} strokeWidth={currentUserVote?.vote_value === true ? 1 : 2.5} />
                        <span className="text-xs font-black uppercase tracking-widest">Je suis chaud</span>
                    </button>
                    <button
                        onClick={() => onVote(false)}
                        className={`flex-1 h-16 rounded-3xl flex items-center justify-center transition-all active:scale-[0.98] ${currentUserVote?.vote_value === false
                                ? 'bg-red-500 text-white shadow-xl shadow-red-500/30'
                                : 'bg-black/[0.03] text-black/30 hover:bg-black/[0.05]'
                            }`}
                    >
                        <ThumbsDown size={20} fill={currentUserVote?.vote_value === false ? "white" : "none"} strokeWidth={currentUserVote?.vote_value === false ? 1 : 2.5} />
                    </button>
                </div>
            </div>
        </article>
    );
}
