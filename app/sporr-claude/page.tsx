import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import SporrClaude from '@/components/SporrClaude';

export default async function SporrClaudeSide() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: medlem } = await supabase
    .from('medlemmer')
    .select('godkjent, navn')
    .eq('id', user.id)
    .single();

  if (!medlem?.godkjent) redirect('/login');

  return <SporrClaude medlemNavn={medlem.navn} />;
}
