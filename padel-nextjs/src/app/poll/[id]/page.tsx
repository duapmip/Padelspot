import ClubBookingInterface from '@/components/ClubBookingInterface';
import { createClient } from '@/utils/supabase/server';

export default async function PollPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div style={{ width: '100vw', minHeight: '100vh', overflowX: 'hidden' }}>
            <ClubBookingInterface user={user} initialPollId={params.id} />
        </div>
    );
}
