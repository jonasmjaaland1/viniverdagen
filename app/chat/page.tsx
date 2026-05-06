import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Chat from '@/components/Chat';

export default async function ChatSide() {
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

  // Hent siste 50 meldinger
  const { data: meldinger } = await supabase
    .from('meldinger')
    .select(`
      *,
      medlemmer (id, navn),
      svar_til:svar_til_id (
        id, tekst, bilde_url,
        medlemmer (navn)
      )
    `)
    .order('opprettet_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl text-wine-900">Chatten</h1>
        <p className="text-sm font-sans text-ink-700/60 mt-1">
          Sanntidschat for alle medlemmer i VinIverdagen
        </p>
      </div>
      <Chat
        brukerId={medlem.id}
        brukernavn={medlem.navn}
        startMeldinger={(meldinger || []).reverse()}
      />
    </div>
  );
}
