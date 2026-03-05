'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPollData(pollId: string) {
    const supabase = await createClient()

    // Query poll with its slots and current votes
    const { data: poll, error: pollError } = await supabase
        .from('polls')
        .select(`
            *,
            creator:user_id ( id, first_name, last_name, email ),
            slots:poll_slots (
                *,
                slot:slot_id (*)
            )
        `)
        .eq('id', pollId)
        .single()

    if (pollError || !poll) {
        console.error('Error fetching poll:', pollError)
        return null
    }

    const { data: votes, error: votesError } = await supabase
        .from('poll_votes')
        .select('*')
        .eq('poll_id', pollId)

    if (votesError) {
        console.error('Error fetching votes:', votesError)
        return { ...poll, votes: [] }
    }

    return { ...poll, votes }
}

export async function castVote(pollId: string, slotId: string, name: string, isAvailable: boolean) {
    const supabase = await createClient()

    // Check if slotId is a poll_slot.id (some structures use that)
    // Actually our table stores slot_id (the external id) directly.

    // Upsert vote based on poll_id, slot_id, and user_name
    const { data, error } = await supabase
        .from('poll_votes')
        .upsert({
            poll_id: pollId,
            slot_id: slotId,
            user_name: name,
            vote_value: isAvailable
        }, {
            onConflict: 'poll_id, slot_id, user_name'
        })
        .select()
        .single()

    if (error) {
        console.error('Error casting vote:', error)
        return { error: error.message }
    }

    revalidatePath(`/poll/${pollId}`)
    return { success: true, data }
}

export async function removeVote(voteId: string, pollId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('poll_votes').delete().eq('id', voteId)

    if (error) return { error: error.message }

    revalidatePath(`/poll/${pollId}`)
    return { success: true }
}
