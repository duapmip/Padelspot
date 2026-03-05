'use client'

import React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Zap, Users } from 'lucide-react'

interface PollHeaderProps {
    title: string;
    votersCount: number;
    targetCount: number;
    daysWithSlots: string[]; // Format 'yyyy-MM-dd'
}

export default function PollHeader({ title, votersCount, targetCount, daysWithSlots }: PollHeaderProps) {
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const today = new Date();
    // Week starting Monday
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const currentWeekStart = new Date(today.setDate(diff));

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-black/5 px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-xl shadow-orange-500/30 rotate-3">
                        <Zap size={22} fill="white" stroke="none" className="-rotate-3" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight text-gray-950 mb-1">{title}</h1>
                        <div className="flex items-center gap-2 opacity-30">
                            <Users size={12} strokeWidth={3} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{votersCount}/{targetCount} RÉPONSES</span>
                        </div>
                    </div>
                </div>

                <div className="relative w-14 h-14 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="5" className="text-black/5" />
                        <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="5" className="text-orange-500"
                            strokeDasharray={150.7}
                            strokeDashoffset={150.7 * (1 - Math.min(1, votersCount / targetCount))} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-black/40">{Math.round((votersCount / targetCount) * 100)}%</span>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                    const date = new Date(currentWeekStart);
                    date.setDate(date.getDate() + i);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const hasSlot = daysWithSlots.includes(format(date, 'yyyy-MM-dd'));

                    return (
                        <div key={i} className="flex flex-col items-center gap-2.5">
                            <span className={`text-[10px] font-black ${isToday ? 'text-orange-500' : 'text-black/20'}`}>{d}</span>
                            <div className="relative">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[13px] font-black transition-all ${isToday ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30' : 'bg-black/[0.03] text-black/40'}`}>
                                    {date.getDate()}
                                </div>
                                {hasSlot && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-orange-500 border-2 border-white" />
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </header>
    );
}
