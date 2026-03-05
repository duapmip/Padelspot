'use client'

import React from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ThumbsUp, ThumbsDown, Check, Clock, MapPin } from 'lucide-react'

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
    // Check if slot.slot is nested (Supabase joined data)
    const actualSlot = slot.slot || slot;
    const startTime = parseISO(actualSlot.start_time);
    const day = format(startTime, 'EEEE d MMMM', { locale: fr });
    const time = format(startTime, 'HH:mm');

    const yesVoters = voters.filter(v => v.vote_value === true);
    const noVoters = voters.filter(v => v.vote_value === false);

    const currentUserVote = voters.find(v => v.user_name === currentUserName);

    return (
        <article className="mb-6 mx-4 overflow-hidden rounded-[2rem] bg-white border border-black/[0.03] shadow-xl shadow-black/[0.02]">
            {/* Header: Date & Time */}
            <header className="px-6 pt-6 pb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-[10px] font-black uppercase text-black/30 tracking-widest mb-1">{day}</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-gray-950 tracking-tight">{time}</span>
                        <div className="px-2.5 py-1 bg-black/5 rounded-full text-[10px] font-black uppercase tracking-tight text-black/40">
                            {actualSlot.duration_minutes || 90} min
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black uppercase text-black/30 tracking-widest mb-1">Prix suggéré</div>
                    <div className="text-lg font-black text-orange-500">{actualSlot.price ? `${actualSlot.price}€` : '--€'}</div>
                </div>
            </header>

            {/* Club Info */}
            <div className="px-6 pb-6 flex items-center justify-between border-b border-black/[0.03]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                        <MapPin size={16} className="text-orange-500" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-tight text-gray-800">{actualSlot.center_name || 'Complex Bordeaux'}</span>
                </div>
            </div>

            {/* Voters List */}
            <div className="px-6 py-4 bg-gray-50/50 flex flex-wrap items-center gap-2">
                {yesVoters.map((v, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 rounded-full border border-orange-200">
                        <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-[8px] text-white font-bold">
                            <Check size={8} />
                        </div>
                        <span className="text-[11px] font-black text-orange-600 uppercase tracking-tight">{v.user_name}</span>
                    </div>
                ))}
                {voters.length === 0 && (
                    <div className="flex items-center gap-2 opacity-30 px-1 py-1">
                        <Clock size={14} />
                        <span className="text-[11px] font-black uppercase tracking-tight">En attente de votes...</span>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <footer className="flex p-4 gap-3">
                <button
                    onClick={() => onVote(true)}
                    className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 ${currentUserVote?.vote_value === true ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-gray-100 text-gray-400 font-bold'}`}
                >
                    <ThumbsUp size={20} fill={currentUserVote?.vote_value === true ? "white" : "none"} />
                    <span className="text-sm font-black uppercase tracking-tight">Je suis chaud</span>
                </button>
                <button
                    onClick={() => onVote(false)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${currentUserVote?.vote_value === false ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-gray-100 text-gray-400 font-bold'}`}
                >
                    <ThumbsDown size={18} fill={currentUserVote?.vote_value === false ? "white" : "none"} />
                </button>
            </footer>
        </article>
    );
}
