'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        redirect('/login?message=Email ou mot de passe incorrect')
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()
    const origin = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${origin}/auth/callback`,
        },
    })

    if (error) {
        redirect(`/login?message=Erreur: ${error.message}`)
    }

    revalidatePath('/', 'layout')

    // Si la confirmation d'email est désactivée sur Supabase, on est connecté direct
    if (data.session) {
        redirect('/')
    } else {
        redirect('/login?message=Compte créé avec succès ! Vérifiez votre adresse email (regardez vos spams).')
    }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/')
}

export async function createPoll(slotIds: string[], targetVotersCount: number = 4) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'User not authenticated' }

    const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', user.id).single();
    const creatorName = profile?.first_name || user.email?.split('@')[0] || 'Organisateur';

    const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
            user_id: user.id,
            target_voters_count: targetVotersCount,
            creator_name: creatorName
        })
        .select()
        .single()

    if (pollError) return { error: pollError.message }

    const pollSlots = slotIds.map(slotId => ({
        poll_id: poll.id,
        slot_id: slotId
    }))

    const { error: slotsError, data: createdSlots } = await supabase
        .from('poll_slots')
        .insert(pollSlots)
        .select();

    if (slotsError) return { error: slotsError.message };

    if (createdSlots && createdSlots.length > 0) {
        const initialVotes = createdSlots.map(s => ({
            poll_id: poll.id,
            slot_id: s.slot_id,
            user_name: creatorName,
            vote_value: true,
            user_id: user.id
        }));

        await supabase.from('poll_votes').insert(initialVotes);
    }

    return { id: poll.id }
}
