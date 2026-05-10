import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import NyttDatoForslag from '@/components/NyttDatoForslag';

export default async function NyttDatoForslagSide() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: medlem } = await supabase
    .from('medlemmer')
    .select('godkjent, er_admin')
    .eq('id', user.id)
    .single();

  if (!medlem?.godkjent || !medlem.er_admin) {
    redirect('/datoer');
  }

  // Hent alle godkjente medlemmer for ansvarlig-velger
  const { data: medlemmer } = await supabase
    .from('medlemmer')
    .select('id, navn')
    .eq('godkjent', true)
    .order('navn');

  return (
    <div className="space-y-4 max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <Link
        href="/datoer"
        className="text-sm font-sans text-wine-700 hover:text-wine-900"
      >
        ← Tilbake til forslag
      </Link>
      <NyttDatoForslag medlemmer={medlemmer || []} />
    </div>
  );
}
