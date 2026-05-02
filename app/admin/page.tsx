import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import AdminMedlemmer from '@/components/AdminMedlemmer';
import AdminKlubbkvelder from '@/components/AdminKlubbkvelder';

export default async function AdminPanel() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: meg } = await supabase
    .from('medlemmer')
    .select('er_admin')
    .eq('id', user.id)
    .single();

  if (!meg?.er_admin) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="font-display text-3xl text-wine-800">Ikke tilgang</h1>
        <p className="text-ink-700/70 mt-3">Kun administratorer kan se denne siden.</p>
      </div>
    );
  }

  const { data: medlemmer } = await supabase
    .from('medlemmer')
    .select('*')
    .order('opprettet_at', { ascending: false });

  const { data: kvelder } = await supabase
    .from('klubbkvelder')
    .select('*')
    .order('dato', { ascending: false });

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="font-display text-5xl text-wine-900 mb-3">Admin</h1>
        <div className="gold-line w-24 mx-auto" />
      </div>

      <section className="mb-16">
        <h2 className="font-display text-3xl text-wine-900 mb-6">Medlemmer</h2>
        <AdminMedlemmer medlemmer={medlemmer || []} />
      </section>

      <section>
        <h2 className="font-display text-3xl text-wine-900 mb-6">Klubbkvelder</h2>
        <AdminKlubbkvelder kvelder={kvelder || []} medlemmer={medlemmer || []} />
      </section>
    </div>
  );
}
