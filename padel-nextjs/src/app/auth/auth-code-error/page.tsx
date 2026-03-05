'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Zap, AlertCircle, ArrowLeft } from 'lucide-react'

export default function AuthCodeError() {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0A0A0A',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            textAlign: 'center'
        }}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                    backgroundColor: 'rgba(255, 107, 0, 0.1)',
                    width: '80px',
                    height: '80px',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '2rem',
                    border: '1px solid rgba(255, 107, 0, 0.2)'
                }}
            >
                <AlertCircle size={40} color="#FF6B00" />
            </motion.div>

            <h1 style={{
                fontSize: '2rem',
                fontWeight: 900,
                marginBottom: '1rem',
                fontStyle: 'italic',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em'
            }}>
                Erreur d'authentification
            </h1>

            <p style={{
                color: '#888',
                maxWidth: '400px',
                lineHeight: 1.6,
                marginBottom: '2.5rem',
                fontWeight: 500
            }}>
                Le lien de confirmation est invalide ou a expiré.
                Veuillez demander un nouveau lien magique.
            </p>

            <Link href="/login" style={{
                backgroundColor: '#FF6B00',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '16px',
                textDecoration: 'none',
                fontWeight: 900,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'transform 0.2s',
            }}>
                <ArrowLeft size={18} />
                Retour au login
            </Link>

            <div style={{
                marginTop: '4rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'rgba(255, 255, 255, 0.2)',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.1em'
            }}>
                <Zap fill="rgba(255, 255, 255, 0.2)" stroke="none" size={16} />
                PADELSPOT
            </div>
        </div>
    )
}
