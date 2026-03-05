import { Suspense } from 'react';
import ClubBookingInterface from '@/components/ClubBookingInterface';
import { createClient } from '@/utils/supabase/server';

export default async function PollPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div style={{ width: '100vw', minHeight: '100vh', overflowX: 'hidden' }}>
            <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', fontWeight: 'bold' }}>Chargement du sondage...</div>}>
                <ClubBookingInterface user={user} initialPollId={params.id} />
            </Suspense>
        </div>
    );
}
