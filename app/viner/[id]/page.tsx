import { createClient } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import SmakingsKort from '@/components/SmakingsKort';
import SlettVinKnapp from '@/components/SlettVinKnapp';
import MineVinerKnapp from '@/components/MineVinerKnapp';
import VinAktivitet from '@/components/VinAktivitet';
import PrivatNotat from '@/components/PrivatNotat';
import SmaksProfil from '@/components/SmaksProfil';
import VinDetaljer from '@/components/VinDetaljer';

export default async function VinDetaljSide({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: medlem } = await supabase
    .from('medlemmer')
    .select('godkjent, er_klubbmedlem, er_admin')
    .eq('id', user.id)
    .single();

  if (!medlem?.godkjent) {
    redirect('/login');
  }

  const { data: vin } = await supabase
    .from('vinmonopol_produkter')
    .select('*')
    .eq('varenummer', id)
    .single();

  if (!vin) {
    notFound();
  }

  const { data: smakinger } = await supabase
    .from('smakinger')
    .select(`
      *,
      vinmonopol_produkter (*),
      medlemmer:tatt_med_av (navn),
      scorer (id, score, medlem_id, medlemmer (navn)),
      kommentarer (id, tekst, medlem_id, opprettet_at, medlemmer (navn))
    `)
    .eq('varenummer', id)
    .order('opprettet_at', { ascending: false });

  const harSmaksProfil = vin.fylde || vin.friskhet || vin.sodme || vin.bitterhet || vin.garvestoffer;

  return (
    <div className="space-y-6">
      <Link href="/viner" className="text-sm font-sans text-wine-700 hover:text-wine-900">
        ← Tilbake til viner
      </Link>

      {/* Hovedkort */}
      <article className="kort p-6 md:p-8">
        <div className="flex flex-col sm:flex-row gap-6">
          {vin.bilde_url && (
            <img
              src={vin.bilde_url}
              alt={vin.navn}
              className="w-32 h-48 object-contain mx-auto sm:mx-0 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl text-wine-900">{vin.navn}</h1>
            {vin.langt_navn && vin.langt_navn !== vin.navn && (
              <p className="text-sm font-sans text-ink-700/60 italic mt-1">
                {vin.langt_navn}
              </p>
            )}
            <p className="text-base font-sans text-ink-700/70 mt-2">
              {[vin.hovedkategori, vin.land, vin.distrikt, vin.produsent].filter(Boolean).join(' · ')}
              {vin.alkoholprosent && ` · ${vin.alkoholprosent}%`}
              {vin.argang && ` · ${vin.argang}`}
            </p>
            {vin.pris && (
              <p className="text-xl text-wine-700 font-display mt-3">
                {Number(vin.pris).toFixed(2)} kr
                {vin.volum_liter && (
                  <span className="text-sm text-ink-700/60 ml-2">
                    ({Number(vin.volum_liter * 1000).toFixed(0)} ml)
                  </span>
                )}
              </p>
            )}

            <div className="mt-5">
              <MineVinerKnapp varenummer={id} brukerId={user.id} />
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              {vin.produkt_url && (
                <a
                  href={vin.produkt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs"
                >
                  Se på Vinmonopolet ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Privat notat */}
      <PrivatNotat varenummer={id} brukerId={user.id} />

      {/* Klubbens aktivitet */}
      <VinAktivitet varenummer={id} />

      {/* Smaksprofil + detaljer - to kolonner på desktop */}
      {(harSmaksProfil || vin.druer || vin.matparing || vin.passer_til) && (
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            {harSmaksProfil && (
              <SmaksProfil
                friskhet={vin.friskhet}
                fylde={vin.fylde}
                bitterhet={vin.bitterhet}
                sodme={vin.sodme}
                garvestoffer={vin.garvestoffer}
              />
            )}
          </div>
          <div>
            <VinDetaljer
              druer={vin.druer}
              matparing={vin.matparing}
              passer_til={vin.passer_til}
              distrikt={vin.distrikt}
              underdistrikt={vin.underdistrikt}
              kvalitetsklassifisering={vin.kvalitetsklassifisering}
              kork_type={vin.kork_type}
              lagringspotensial={vin.lagringspotensial}
              er_okologisk={vin.er_okologisk}
              er_biodynamisk={vin.er_biodynamisk}
              er_etisk_sertifisert={vin.er_etisk_sertifisert}
              er_glutenfri={vin.er_glutenfri}
              er_kosher={vin.er_kosher}
              ingen_tilsatt_svovel={vin.ingen_tilsatt_svovel}
              farge_beskrivelse={vin.farge_beskrivelse}
              lukt={vin.lukt}
              smak={vin.smak}
              produksjonsmetode={vin.produksjonsmetode}
              sukker={vin.sukker}
              syre={vin.syre}
              allergener={vin.allergener}
            />
          </div>
        </div>
      )}

      {/* Smakinger */}
      <section>
        <h2 className="font-display text-2xl text-wine-900 mb-4">
          Smakinger ({smakinger?.length || 0})
        </h2>
        {smakinger && smakinger.length > 0 ? (
          <div className="space-y-4">
            {smakinger.map((s: any) => (
              <SmakingsKort
                key={s.id}
                smaking={s}
                brukerId={user.id}
                visVin={false}
                kanScoreOgKommentere={!s.klubbkveld_id || medlem.er_klubbmedlem}
                erAdmin={medlem.er_admin}
              />
            ))}
          </div>
        ) : (
          <p className="text-ink-700/60 italic">Ingen smakinger ennå.</p>
        )}
      </section>

      {medlem.er_admin && (
        <section className="pt-8 border-t border-wine-900/10">
          <h2 className="font-display text-lg text-ink-700/60 mb-3">Administrator</h2>
          <SlettVinKnapp varenummer={id} vinNavn={vin.navn} />
        </section>
      )}
    </div>
  );
}
