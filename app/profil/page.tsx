import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ProfilForm from '@/components/ProfilForm';

export default async function ProfilSide() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: medlem } = await supabase
    .from('medlemmer')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!medlem) redirect('/login');

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl text-wine-900 mb-3">Min profil</h1>
        <div className="gold-line w-24 mx-auto" />
      </div>

      <ProfilForm medlem={medlem} epost={user.email || ''} />
    </div>
  );
}
