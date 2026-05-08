import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import MineViner from '@/components/MineViner';

export default async function MineVinerSide() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: medlem } = await supabase
    .from('medlemmer')
    .select('id, navn, godkjent')
    .eq('id', user.id)
    .single();

  if (!medlem?.godkjent) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-wine-900">Mine viner</h1>
        <p className="text-sm font-sans text-ink-700/60 mt-1">
          Hold styr på vinene du har drukket og hva du vil prøve
        </p>
      </div>
      <MineViner brukerId={medlem.id} brukernavn={medlem.navn} />
    </div>
  );
}
