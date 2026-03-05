'use client'

import React, { useState } from 'react'
import { Share2, MessageCircle, Copy, Check } from 'lucide-react'

interface PollWhatsAppShareProps {
    pollId: string;
    creatorName: string;
}

export default function PollWhatsAppShare({ pollId, creatorName }: PollWhatsAppShareProps) {
    const [copied, setCopied] = useState(false);
    const [friendName, setFriendName] = useState('');

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const pollUrl = `${baseUrl}/poll/${pollId}`;

    const generateLink = (name: string) => {
        return `${pollUrl}?guest=${encodeURIComponent(name)}`;
    }

    const shareOnWhatsApp = () => {
        const link = friendName ? generateLink(friendName) : pollUrl;
        const text = `Salut ${friendName || 'toi'}, dis-moi quand tu es dispo pour le padel : ${link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }

    const copyToClipboard = () => {
        const link = friendName ? generateLink(friendName) : pollUrl;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="mx-4 mb-10 p-6 rounded-[2rem] bg-orange-500 text-white shadow-xl shadow-orange-500/20">
            <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                <Share2 size={24} /> Inviter des potes
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-1 block tracking-widest">Nom du pote (optionnel)</label>
                    <input
                        type="text"
                        placeholder="Ex: Julien"
                        value={friendName}
                        onChange={(e) => setFriendName(e.target.value)}
                        className="w-full h-12 px-5 rounded-2xl bg-white/10 border border-white/20 placeholder:text-white/40 focus:bg-white/20 outline-none transition-all font-bold"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={shareOnWhatsApp}
                        className="flex-1 h-14 bg-white text-orange-500 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs shadow-lg shadow-black/5 active:scale-95 transition-all"
                    >
                        <MessageCircle size={20} fill="currentColor" /> via WhatsApp
                    </button>
                    <button
                        onClick={copyToClipboard}
                        className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center active:scale-95 transition-all border border-white/10"
                    >
                        {copied ? <Check size={20} className="text-green-300" /> : <Copy size={20} />}
                    </button>
                </div>
            </div>

            <p className="mt-4 text-[10px] font-bold opacity-60 text-center leading-relaxed px-4 italic">
                {friendName
                    ? `Le lien généré inclura directement le nom de ${friendName} pour un vote en 1 clic.`
                    : "Laisse le nom vide pour un lien générique."}
            </p>
        </div>
    );
}
