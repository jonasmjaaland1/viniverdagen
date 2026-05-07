import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import VarslerKnapp from '@/components/VarslerKnapp';

export default async function InnstillingerSide() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: medlem } = await supabase
    .from('medlemmer')
    .select('navn, godkjent')
    .eq('id', user.id)
    .single();

  if (!medlem?.godkjent) {
    redirect('/login');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl text-wine-900">Innstillinger</h1>
        <p className="text-sm font-sans text-ink-700/60 mt-1">
          Tilpass appen til dine preferanser
        </p>
      </div>

      <VarslerKnapp />
    </div>
  );
}
