import { Suspense } from 'react';
import ClubBookingInterface from '@/components/ClubBookingInterface';
import { createClient } from '@/utils/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div style={{ width: '100vw', minHeight: '100vh', overflowX: 'hidden' }}>
      <Suspense fallback={<div>Loading...</div>}>
        <ClubBookingInterface user={user} />
      </Suspense>
    </div>
  );
}
