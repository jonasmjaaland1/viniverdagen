import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function Forside() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: medlem } = await supabase
    .from('medlemmer')
    .select('godkjent, navn')
    .eq('id', user.id)
    .single();

  if (!medlem?.godkjent) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="font-display text-3xl text-wine-800 mb-4">Venter på godkjenning</h1>
        <div className="gold-line w-24 mx-auto my-4" />
        <p className="text-ink-700/80">
          Kontoen din er registrert, men venter på godkjenning fra administrator.
        </p>
      </div>
    );
  }

  // Finn neste fremtidige eller siste passerte klubbkveld
  const idag = new Date().toISOString().split('T')[0];
  const { data: neste } = await supabase
    .from('klubbkvelder')
    .select('*')
    .gte('dato', idag)
    .order('dato', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: siste } = await supabase
    .from('klubbkvelder')
    .select('*')
    .lt('dato', idag)
    .order('dato', { ascending: false })
    .limit(1)
    .maybeSingle();

  const visKveld = neste || siste;
  const erFremtidig = !!neste;

  // Hent oppmøtte og viner for visKveld
  let oppmotte: any[] = [];
  let smakinger: any[] = [];

  if (visKveld) {
    const { data: opp } = await supabase
      .from('oppmote')
      .select('medlem_id, medlemmer(navn)')
      .eq('klubbkveld_id', visKveld.id);
    oppmotte = opp || [];

    const { data: sm } = await supabase
      .from('smakinger')
      .select(`
        id,
        varenummer,
        tatt_med_av,
        vinmonopol_produkter(navn, hovedkategori, bilde_url, pris),
        medlemmer(navn),
        scorer(score)
      `)
      .eq('klubbkveld_id', visKveld.id);
    smakinger = sm || [];
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-16 fade-up">
        <p className="text-sm uppercase tracking-[0.3em] text-wine-700/70 font-sans mb-4">
          Velkommen, {medlem.navn}
        </p>
        <h1 className="font-display text-6xl md:text-7xl text-wine-900 mb-4 text-shadow-wine">
          <span className="italic font-light">In vino,</span> veritas
        </h1>
        <div className="gold-line w-32 mx-auto" />
      </div>

      {visKveld ? (
        <section className="kort overflow-hidden fade-up" style={{ animationDelay: '0.1s' }}>
          {visKveld.bilde_url && (
            <div
              className="h-64 md:h-80 bg-cover bg-center"
              style={{ backgroundImage: `url(${visKveld.bilde_url})` }}
            />
          )}

          <div className="p-8 md:p-12">
            <p className="text-sm uppercase tracking-[0.25em] text-wine-700 font-sans mb-3">
              {erFremtidig ? 'Neste klubbkveld' : 'Siste klubbkveld'}
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-wine-900 mb-2">
              {visKveld.tittel}
            </h2>
            <p className="text-ink-700/70 italic mb-6">
              {new Date(visKveld.dato).toLocaleDateString('nb-NO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {visKveld.sted && ` · ${visKveld.sted}`}
            </p>

            {visKveld.kommentar && (
              <p className="text-lg text-ink-700/80 mb-6 leading-relaxed">{visKveld.kommentar}</p>
            )}

            {oppmotte.length > 0 && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wider text-ink-700/50 font-sans mb-2">
                  Til stede
                </p>
                <p className="text-ink-700/80">
                  {oppmotte.map((o) => o.medlemmer?.navn).filter(Boolean).join(' · ')}
                </p>
              </div>
            )}

            {smakinger.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-700/50 font-sans mb-3">
                  Viner ({smakinger.length})
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {smakinger.map((s) => {
                    const scorer = s.scorer || [];
                    const snitt =
                      scorer.length > 0
                        ? (scorer.reduce((a: number, b: any) => a + b.score, 0) / scorer.length).toFixed(1)
                        : null;
                    return (
                      <Link
                        key={s.id}
                        href={`/klubbkvelder/${visKveld.id}#smaking-${s.id}`}
                        className="flex gap-3 p-3 hover:bg-cream-100 rounded transition"
                      >
                        {s.vinmonopol_produkter?.bilde_url && (
                          <img
                            src={s.vinmonopol_produkter.bilde_url}
                            alt=""
                            className="w-12 h-16 object-contain"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-base text-wine-900 truncate">
                            {s.vinmonopol_produkter?.navn}
                          </p>
                          <p className="text-xs font-sans text-ink-700/60">
                            {s.medlemmer?.navn}
                          </p>
                          {snitt && (
                            <p className="text-sm text-wine-700 font-display mt-1">
                              ★ {snitt}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-wine-900/10">
              <Link href={`/klubbkvelder/${visKveld.id}`} className="btn-primary">
                Åpne kvelden
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="text-center py-20 text-ink-700/60">
          <p className="italic">Ingen klubbkvelder er opprettet ennå.</p>
        </div>
      )}
    </div>
  );
}
