import { redirect } from 'next/navigation';

export default async function VoteRedirect(props: { params: Promise<{ pollId: string }> }) {
    const params = await props.params;
    redirect(`/poll/${params.pollId}`);
}
