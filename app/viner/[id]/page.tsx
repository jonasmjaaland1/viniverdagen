import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import SmakingsKort from '@/components/SmakingsKort';

export default async function VinDetalj({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: vin } = await supabase
    .from('vinmonopol_produkter')
    .select('*')
    .eq('varenummer', id)
    .single();

  if (!vin) notFound();

  const { data: smakinger } = await supabase
    .from('smakinger')
    .select(`
      id, varenummer, tatt_med_av, opprettet_at, klubbkveld_id,
      vinmonopol_produkter(navn, hovedkategori, produkttype, land, druer, pris, bilde_url, produkt_url, produsent, alkoholprosent),
      klubbkvelder(id, dato, tittel),
      medlemmer(id, navn),
      scorer(id, score, medlem_id, medlemmer(navn)),
      kommentarer(id, tekst, opprettet_at, medlem_id, medlemmer(navn))
    `)
    .eq('varenummer', id)
    .order('opprettet_at', { ascending: false });

  // Beregn totalsnitt
  const alleScorer: number[] = [];
  smakinger?.forEach((s: any) => {
    s.scorer?.forEach((sc: any) => alleScorer.push(sc.score));
  });
  const snittTotal =
    alleScorer.length > 0
      ? (alleScorer.reduce((a, b) => a + b, 0) / alleScorer.length).toFixed(1)
      : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="grid md:grid-cols-[200px_1fr] gap-8 mb-12">
        {vin.bilde_url && (
          <img
            src={vin.bilde_url}
            alt={vin.navn}
            className="w-48 h-72 object-contain mx-auto md:mx-0"
          />
        )}

        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-wine-700 font-sans mb-3">
            {vin.hovedkategori || 'Vin'}
          </p>
          <h1 className="font-display text-4xl text-wine-900 mb-3">{vin.navn}</h1>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm font-sans mt-6">
            {vin.produsent && (
              <>
                <dt className="text-ink-700/50 uppercase tracking-wider text-xs">Produsent</dt>
                <dd className="text-ink-700/90">{vin.produsent}</dd>
              </>
            )}
            {vin.land && (
              <>
                <dt className="text-ink-700/50 uppercase tracking-wider text-xs">Land</dt>
                <dd className="text-ink-700/90">
                  {[vin.land, vin.distrikt].filter(Boolean).join(', ')}
                </dd>
              </>
            )}
            {vin.druer && vin.druer.length > 0 && (
              <>
                <dt className="text-ink-700/50 uppercase tracking-wider text-xs">Druer</dt>
                <dd className="text-ink-700/90">{vin.druer.join(', ')}</dd>
              </>
            )}
            {vin.alkoholprosent && (
              <>
                <dt className="text-ink-700/50 uppercase tracking-wider text-xs">Alkohol</dt>
                <dd className="text-ink-700/90">{vin.alkoholprosent}%</dd>
              </>
            )}
            {vin.pris && (
              <>
                <dt className="text-ink-700/50 uppercase tracking-wider text-xs">Pris</dt>
                <dd className="text-ink-700/90">{Number(vin.pris).toFixed(2)} kr</dd>
              </>
            )}
            {vin.varenummer && (
              <>
                <dt className="text-ink-700/50 uppercase tracking-wider text-xs">Varenummer</dt>
                <dd className="text-ink-700/90">{vin.varenummer}</dd>
              </>
            )}
          </dl>

          {(vin.lukt || vin.smak) && (
            <div className="mt-6 space-y-3">
              {vin.lukt && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-ink-700/50 font-sans mb-1">Lukt</p>
                  <p className="text-ink-700/80 italic">{vin.lukt}</p>
                </div>
              )}
              {vin.smak && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-ink-700/50 font-sans mb-1">Smak</p>
                  <p className="text-ink-700/80 italic">{vin.smak}</p>
                </div>
              )}
            </div>
          )}

          {vin.produkt_url && (
            <a
              href={vin.produkt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-6 text-sm font-sans text-wine-700 hover:underline"
            >
              Se på Vinmonopolet →
            </a>
          )}
        </div>
      </div>

      <div className="gold-line w-32 mx-auto mb-12" />

      {snittTotal && (
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-wider text-ink-700/50 font-sans mb-2">
            Snitt over alle smakinger
          </p>
          <p className="font-display text-6xl text-wine-800">★ {snittTotal}</p>
          <p className="text-sm font-sans text-ink-700/60 mt-1">
            {alleScorer.length} {alleScorer.length === 1 ? 'score' : 'scorer'}
          </p>
        </div>
      )}

      <h2 className="font-display text-2xl text-wine-900 mb-6">Smakinger</h2>

      <div className="space-y-6">
        {smakinger && smakinger.length > 0 ? (
          smakinger.map((s: any) => (
            <div key={s.id}>
              {s.klubbkvelder && (
                <Link
                  href={`/klubbkvelder/${s.klubbkvelder.id}`}
                  className="inline-block text-xs uppercase tracking-wider font-sans text-wine-700 hover:underline mb-2"
                >
                  {s.klubbkvelder.tittel} ·{' '}
                  {new Date(s.klubbkvelder.dato).toLocaleDateString('nb-NO')}
                </Link>
              )}
              {!s.klubbkvelder && (
                <p className="text-xs uppercase tracking-wider font-sans text-ink-700/50 mb-2 italic">
                  Frittstående smaking ·{' '}
                  {new Date(s.opprettet_at).toLocaleDateString('nb-NO')}
                </p>
              )}
              <SmakingsKort smaking={s} brukerId={user?.id || ''} />
            </div>
          ))
        ) : (
          <p className="text-center text-ink-700/60 italic py-8">
            Ingen smakinger ennå.
          </p>
        )}
      </div>
    </div>
  );
}
