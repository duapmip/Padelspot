import { createClient } from '@/utils/supabase/server';
import { getPollData } from '@/app/poll/actions';
import PollVotingView from '@/components/PollVotingView';
import { notFound } from 'next/navigation';

export default async function PollPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ guest?: string }>
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    // Fetch full poll data with slots and existing votes
    const poll = await getPollData(resolvedParams.id);

    if (!poll) {
        return notFound();
    }

    return (
        <PollVotingView
            poll={poll}
            user={user}
            guestName={resolvedSearchParams.guest}
        />
    );
}
