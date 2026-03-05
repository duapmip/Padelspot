'use client'

export const dynamic = 'force-dynamic'

import { useState, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Mail, ArrowRight, ChevronLeft, Lock } from 'lucide-react'
import Link from 'next/link'
import { login, signup } from '../auth/actions'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>
}) {
    const { message } = use(searchParams)
    const [loading, setLoading] = useState(false)
    const [isLogin, setIsLogin] = useState(true)

    const handleGoogleLogin = async () => {
        setLoading(true)
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0A0A0A',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflowX: 'hidden',
            overflowY: 'auto',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Background Orbs */}
            <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                style={{ position: 'absolute', top: '-10%', left: '-5%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(255,107,0,0.12) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0 }}
            />
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(255,107,0,0.18) 0%, transparent 70%)', filter: 'blur(100px)', zIndex: 0 }}
            />

            {/* Grid Overlay */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '50px 50px', zIndex: 1 }} />

            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '4rem 1rem' }}>
                <Link href="/" style={{ position: 'absolute', top: '2rem', left: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
                    <ChevronLeft size={16} /> Retour
                </Link>

                <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-[#FF6B00]/10"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '18px', border: '1px solid rgba(255,107,0,0.2)', marginBottom: '1.5rem' }}
                        >
                            <Zap fill="#FF6B00" stroke="none" size={32} />
                        </motion.div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.5rem', textTransform: 'uppercase', fontStyle: 'italic' }}>PadelSpot.</h1>
                        <p style={{ color: '#888', fontWeight: 500 }}>{isLogin ? 'Bon retour sur le court.' : 'Créer un compte et rejoindre le jeu.'}</p>
                    </div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '32px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                    >
                        <form action={isLogin ? login : signup} onSubmit={() => setLoading(true)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <label htmlFor="email" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', marginLeft: '0.25rem' }}>
                                    Votre Email
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Mail style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#444' }} size={20} />
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="joueur@padelspot.fr"
                                        style={{
                                            width: '100%',
                                            backgroundColor: '#111',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '16px',
                                            padding: '1.1rem 1.25rem 1.1rem 3.5rem',
                                            color: 'white',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            transition: 'border-color 0.2s'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = 'rgba(255,107,0,0.5)'}
                                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <label htmlFor="password" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', marginLeft: '0.25rem' }}>
                                    Mot de passe
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Lock style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#444' }} size={20} />
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        style={{
                                            width: '100%',
                                            backgroundColor: '#111',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '16px',
                                            padding: '1.1rem 1.25rem 1.1rem 3.5rem',
                                            color: 'white',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            transition: 'border-color 0.2s'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = 'rgba(255,107,0,0.5)'}
                                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    backgroundColor: '#FF6B00',
                                    color: 'white',
                                    padding: '1.1rem',
                                    borderRadius: '16px',
                                    border: 'none',
                                    fontWeight: 900,
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    transition: 'transform 0.2s, background-color 0.2s',
                                    opacity: loading ? 0.7 : 1,
                                    marginTop: '0.5rem'
                                }}
                            >
                                {loading && isLogin ? 'Connexion en cours...' : loading && !isLogin ? 'Création...' : isLogin ? 'Se connecter' : 'Créer mon compte'}
                                <ArrowRight size={18} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0', opacity: 0.5 }}>
                                <div style={{ flex: 1, height: 1, background: '#fff' }} />
                                <span style={{ padding: '0 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>OU</span>
                                <div style={{ flex: 1, height: 1, background: '#fff' }} />
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    backgroundColor: '#fff',
                                    color: '#0A0A0A',
                                    padding: '1.1rem',
                                    borderRadius: '16px',
                                    border: 'none',
                                    fontWeight: 900,
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    transition: 'background-color 0.2s',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continuer avec Google
                            </button>
                        </form>

                        {message && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '16px', backgroundColor: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)', textAlign: 'center' }}
                            >
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FF6B00', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                    {message}
                                </p>
                            </motion.div>
                        )}
                    </motion.div>

                    <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666', fontWeight: 600, marginTop: '2.5rem', lineHeight: 1.5 }}>
                        {isLogin ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}
                        <br />
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', marginTop: '0.5rem' }}
                        >
                            {isLogin ? "Créer un compte" : "Se connecter"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}
