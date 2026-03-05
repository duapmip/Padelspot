'use client'

import { format, parseISO } from 'date-fns'
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
    // Simplified: show current week
    const currentWeekStart = new Date(today.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)));

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-black/5 px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Zap size={16} fill="white" stroke="none" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-tight text-gray-900 leading-none">{title}</h1>
                        <p className="text-[10px] uppercase font-bold text-black/30 mt-1 flex items-center gap-1">
                            <Users size={10} /> En attente de {Math.max(0, targetCount - votersCount)} joueurs
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 rounded-full">
                    <div className="text-[11px] font-black text-black/60">{votersCount}/{targetCount}</div>
                    <div className="w-16 h-1.5 bg-black/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-orange-500 transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(100, (votersCount / targetCount) * 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center px-1">
                {days.map((d, i) => {
                    const date = new Date(currentWeekStart);
                    date.setDate(date.getDate() + i);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const hasSlot = daysWithSlots.includes(format(date, 'yyyy-MM-dd'));

                    return (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                            <span className={`text-[10px] font-black ${isToday ? 'text-orange-500' : 'text-gray-300'}`}>{d}</span>
                            <div className="relative">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black transition-all ${isToday ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-gray-50 text-gray-400'}`}>
                                    {date.getDate()}
                                </div>
                                {hasSlot && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </header>
    );
}
