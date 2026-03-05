import ClubBookingInterface from '@/components/ClubBookingInterface';
import { createClient } from '@/utils/supabase/server';

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Attendre correctement `params` (requis dans NextJS 15+)
    const resolvedParams = await params;

    return (
        <div style={{ width: '100vw', minHeight: '100vh', overflowX: 'hidden' }}>
            <ClubBookingInterface user={user} initialPollId={resolvedParams.id} />
        </div>
    );
}
