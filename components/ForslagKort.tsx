'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

interface Alternativ {
  id: string;
  dato: string;
  notat: string | null;
  antall_kan: number;
  antall_kan_ikke: number;
  antall_kanskje: number;
  mitt_svar?: 'kan' | 'kan_ikke' | 'kanskje' | null;
  alle_svar?: Array<{ medlem_id: string; medlem_navn: string; svar: string }>;
}

interface Forslag {
  id: string;
  tittel: string | null;
  beskrivelse: string | null;
  status: 'apen' | 'bekreftet' | 'avlyst';
  bekreftet_dato: string | null;
  bekreftet_klubbkveld_id: string | null;
  opprettet_av_navn: string;
  ansvarlig_id?: string | null;
  ansvarlig_navn: string | null;
  opprettet_at: string;
  alternativer: Alternativ[];
}

interface Medlem {
  id: string;
  navn: string;
}

export default function ForslagKort({
  forslag,
  brukerId,
  erAdmin,
  medlemmer = [],
}: {
  forslag: Forslag;
  brukerId: string;
  erAdmin: boolean;
  medlemmer?: Medlem[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [laster, setLaster] = useState<string | null>(null);
  const [visDetaljer, setVisDetaljer] = useState<string | null>(null);
  const [redigerer, setRedigerer] = useState(false);

  // Rediger-state
  const [tittel, setTittel] = useState(forslag.tittel || '');
  const [beskrivelse, setBeskrivelse] = useState(forslag.beskrivelse || '');
  const [ansvarligId, setAnsvarligId] = useState(forslag.ansvarlig_id || '');
  const [nyDato, setNyDato] = useState('');

  async function svar(alternativId: string, svarVerdi: 'kan' | 'kan_ikke' | 'kanskje', mittEksisterendeSvar?: string | null) {
    if (forslag.status !== 'apen') return;
    setLaster(alternativId);

    if (mittEksisterendeSvar === svarVerdi) {
      const { error } = await supabase
        .from('dato_svar')
        .delete()
        .eq('alternativ_id', alternativId)
        .eq('medlem_id', brukerId);
      setLaster(null);
      if (!error) router.refresh();
      return;
    }

    const { error } = await supabase
      .from('dato_svar')
      .upsert(
        {
          alternativ_id: alternativId,
          medlem_id: brukerId,
          svar: svarVerdi,
        },
        { onConflict: 'alternativ_id,medlem_id' }
      );
    setLaster(null);
    if (!error) router.refresh();
  }

  async function bekreft(alternativ: Alternativ) {
    if (!erAdmin) return;
    if (!confirm(`Bekrefte ${formatDato(alternativ.dato)} som klubbkveld?`)) return;
    setLaster('bekreft');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLaster(null);
      return;
    }

    const tittel = forslag.tittel || `Klubbkveld ${formatDato(alternativ.dato)}`;

    const { data: kveld, error: e1 } = await supabase
      .from('klubbkvelder')
      .insert({
        navn: tittel,
        dato: alternativ.dato,
        tema: forslag.beskrivelse || null,
      })
      .select()
      .single();

    if (e1 || !kveld) {
      alert('Kunne ikke opprette klubbkveld: ' + (e1?.message || 'Ukjent feil'));
      setLaster(null);
      return;
    }

    const { error: e2 } = await supabase
      .from('dato_forslag')
      .update({
        status: 'bekreftet',
        bekreftet_dato: alternativ.dato,
        bekreftet_klubbkveld_id: kveld.id,
      })
      .eq('id', forslag.id);

    if (e2) {
      alert('Klubbkveld opprettet, men kunne ikke oppdatere forslag-status: ' + e2.message);
    }

    await supabase
      .from('klubbkvelder')
      .update({
        ansvarlig_id: forslag.ansvarlig_id || null,
        fra_forslag_id: forslag.id,
      })
      .eq('id', kveld.id);

    setLaster(null);
    router.refresh();
  }

  async function avlys() {
    if (!erAdmin) return;
    if (!confirm('Avlyse dette forslaget?')) return;
    setLaster('avlys');
    const { error } = await supabase
      .from('dato_forslag')
      .update({ status: 'avlyst' })
      .eq('id', forslag.id);
    setLaster(null);
    if (!error) router.refresh();
  }

  async function slett() {
    if (!erAdmin) return;
    if (!confirm('Slette dette forslaget? Dette kan ikke angres.')) return;
    setLaster('slett');
    const { error } = await supabase
      .from('dato_forslag')
      .delete()
      .eq('id', forslag.id);
    setLaster(null);
    if (!error) router.refresh();
  }

  async function lagreRediger() {
    if (!erAdmin) return;
    setLaster('rediger');
    const { error } = await supabase
      .from('dato_forslag')
      .update({
        tittel: tittel.trim() || null,
        beskrivelse: beskrivelse.trim() || null,
        ansvarlig_id: ansvarligId || null,
      })
      .eq('id', forslag.id);
    setLaster(null);
    if (!error) {
      setRedigerer(false);
      router.refresh();
    } else {
      alert('Kunne ikke lagre: ' + error.message);
    }
  }

  function avbrytRediger() {
    setTittel(forslag.tittel || '');
    setBeskrivelse(forslag.beskrivelse || '');
    setAnsvarligId(forslag.ansvarlig_id || '');
    setNyDato('');
    setRedigerer(false);
  }

  async function leggTilDato() {
    if (!erAdmin || !nyDato) return;
    setLaster('ny-dato');
    const { error } = await supabase.from('dato_alternativer').insert({
      forslag_id: forslag.id,
      dato: nyDato,
    });
    setLaster(null);
    if (error) {
      alert('Kunne ikke legge til dato: ' + error.message);
    } else {
      setNyDato('');
      router.refresh();
    }
  }

  async function fjernDato(alternativId: string, dato: string) {
    if (!erAdmin) return;
    if (forslag.alternativer.length === 1) {
      alert('Du kan ikke fjerne siste dato. Slett heller hele forslaget.');
      return;
    }
    if (!confirm(`Fjerne ${formatDato(dato)} fra forslaget? Alle svar på denne datoen forsvinner.`)) {
      return;
    }
    setLaster(alternativId);
    const { error } = await supabase
      .from('dato_alternativer')
      .delete()
      .eq('id', alternativId);
    setLaster(null);
    if (!error) router.refresh();
  }

  function formatDato(d: string): string {
    const dato = new Date(d);
    return dato.toLocaleDateString('nb-NO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const sortertAlternativer = [...forslag.alternativer].sort(
    (a, b) => new Date(a.dato).getTime() - new Date(b.dato).getTime()
  );

  const beste = sortertAlternativer.reduce<Alternativ | null>(
    (best, alt) => (!best || alt.antall_kan > best.antall_kan ? alt : best),
    null
  );

  return (
    <article className="kort p-6 md:p-8 space-y-5">
      {/* Header - enten visning eller redigering */}
      {redigerer ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider font-sans text-ink-700/60 block mb-1">
              Tittel
            </label>
            <input
              value={tittel}
              onChange={(e) => setTittel(e.target.value)}
              placeholder="F.eks. Vår-vinkveld"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider font-sans text-ink-700/60 block mb-1">
              Beskrivelse
            </label>
            <textarea
              value={beskrivelse}
              onChange={(e) => setBeskrivelse(e.target.value)}
              rows={3}
              className="input-field resize-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider font-sans text-ink-700/60 block mb-1">
              Ansvarlig
            </label>
            <select
              value={ansvarligId}
              onChange={(e) => setAnsvarligId(e.target.value)}
              className="input-field"
            >
              <option value="">— ingen valgt —</option>
              {medlemmer.map((m) => (
                <option key={m.id} value={m.id}>{m.navn}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={lagreRediger}
              disabled={laster === 'rediger'}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {laster === 'rediger' ? 'Lagrer...' : 'Lagre endringer'}
            </button>
            <button
              onClick={avbrytRediger}
              disabled={laster === 'rediger'}
              className="btn-secondary text-sm"
            >
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-2xl text-wine-900">
                {forslag.tittel || 'Dato-forslag'}
              </h3>
              {forslag.status === 'bekreftet' && (
                <span className="text-xs uppercase tracking-wider font-sans bg-wine-700 text-cream-50 px-2 py-0.5 rounded">
                  Bekreftet
                </span>
              )}
              {forslag.status === 'avlyst' && (
                <span className="text-xs uppercase tracking-wider font-sans bg-ink-700/30 text-cream-50 px-2 py-0.5 rounded">
                  Avlyst
                </span>
              )}
            </div>
            <p className="text-xs font-sans text-ink-700/60 mt-1">
              Foreslått av {forslag.opprettet_av_navn} ·{' '}
              {new Date(forslag.opprettet_at).toLocaleDateString('nb-NO')}
            </p>
            {forslag.ansvarlig_navn && (
              <p className="text-sm font-sans text-wine-700 mt-2">
                Ansvarlig: <span className="font-medium">{forslag.ansvarlig_navn}</span>
              </p>
            )}
          </div>
          {erAdmin && forslag.status === 'apen' && (
            <button
              onClick={() => setRedigerer(true)}
              className="text-xs font-sans uppercase tracking-wider text-ink-700/60 hover:text-wine-700 transition"
            >
              Rediger
            </button>
          )}
        </div>
      )}

      {!redigerer && forslag.beskrivelse && (
        <p className="text-sm font-sans text-ink-700/85 italic">
          {forslag.beskrivelse}
        </p>
      )}

      {/* Datoalternativer */}
      <div className="space-y-2">
        {sortertAlternativer.map((alt) => {
          const visAlle = visDetaljer === alt.id;
          const erBeste = beste && beste.id === alt.id && forslag.status === 'apen';
          const erBekreftet = forslag.bekreftet_klubbkveld_id && forslag.status === 'bekreftet' && alt.dato === forslag.bekreftet_dato;
          return (
            <div
              key={alt.id}
              className={`p-4 rounded border ${
                erBekreftet
                  ? 'bg-wine-700/10 border-wine-700'
                  : erBeste
                  ? 'bg-cream-100 border-cream-200'
                  : 'bg-cream-50 border-wine-900/10'
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-display text-lg text-wine-900">
                    {formatDato(alt.dato)}
                    {erBekreftet && <span className="ml-2 text-sm text-wine-700">✓ valgt</span>}
                  </p>
                  <div className="flex gap-3 text-xs font-sans text-ink-700/70 mt-1 flex-wrap">
                    <span className="text-green-700">✓ {alt.antall_kan} kan</span>
                    {alt.antall_kanskje > 0 && (
                      <span className="text-amber-700">~ {alt.antall_kanskje} kanskje</span>
                    )}
                    {alt.antall_kan_ikke > 0 && (
                      <span className="text-ink-700/50">✕ {alt.antall_kan_ikke} kan ikke</span>
                    )}
                  </div>
                </div>

                {forslag.status === 'apen' && !redigerer && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => svar(alt.id, 'kan', alt.mitt_svar)}
                      disabled={laster === alt.id}
                      className={`px-3 py-1.5 text-xs uppercase tracking-wider font-sans rounded transition ${
                        alt.mitt_svar === 'kan'
                          ? 'bg-wine-700 text-cream-50'
                          : 'bg-cream-100 text-wine-800 hover:bg-cream-200'
                      } disabled:opacity-50`}
                    >
                      Kan
                    </button>
                    <button
                      onClick={() => svar(alt.id, 'kanskje', alt.mitt_svar)}
                      disabled={laster === alt.id}
                      className={`px-3 py-1.5 text-xs uppercase tracking-wider font-sans rounded transition ${
                        alt.mitt_svar === 'kanskje'
                          ? 'bg-wine-700 text-cream-50'
                          : 'bg-cream-100 text-wine-800 hover:bg-cream-200'
                      } disabled:opacity-50`}
                    >
                      Kanskje
                    </button>
                    <button
                      onClick={() => svar(alt.id, 'kan_ikke', alt.mitt_svar)}
                      disabled={laster === alt.id}
                      className={`px-3 py-1.5 text-xs uppercase tracking-wider font-sans rounded transition ${
                        alt.mitt_svar === 'kan_ikke'
                          ? 'bg-wine-700 text-cream-50'
                          : 'bg-cream-100 text-wine-800 hover:bg-cream-200'
                      } disabled:opacity-50`}
                    >
                      Kan ikke
                    </button>
                  </div>
                )}
              </div>

              {alt.alle_svar && alt.alle_svar.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setVisDetaljer(visAlle ? null : alt.id)}
                    className="text-xs font-sans text-ink-700/50 hover:text-wine-700 transition"
                  >
                    {visAlle ? 'Skjul' : 'Vis'} hvem har svart
                  </button>
                  {visAlle && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {alt.alle_svar.map((s) => (
                        <span
                          key={s.medlem_id}
                          className={`text-xs px-2 py-0.5 rounded font-sans ${
                            s.svar === 'kan'
                              ? 'bg-green-100 text-green-800'
                              : s.svar === 'kanskje'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-cream-200 text-ink-700/70'
                          }`}
                        >
                          {s.medlem_navn}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {erAdmin && forslag.status === 'apen' && (
                <div className="mt-3 pt-3 border-t border-wine-900/10 flex gap-4 flex-wrap">
                  <button
                    onClick={() => bekreft(alt)}
                    disabled={laster === 'bekreft'}
                    className="text-xs font-sans uppercase tracking-wider text-wine-700 hover:text-wine-900 transition disabled:opacity-50"
                  >
                    {laster === 'bekreft' ? 'Bekrefter...' : '✓ Bekreft denne datoen'}
                  </button>
                  <button
                    onClick={() => fjernDato(alt.id, alt.dato)}
                    disabled={laster === alt.id}
                    className="text-xs font-sans uppercase tracking-wider text-ink-700/60 hover:text-wine-700 transition disabled:opacity-50"
                  >
                    Fjern denne datoen
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Legg til ny dato (admin) */}
        {erAdmin && forslag.status === 'apen' && (
          <div className="flex gap-2 pt-2">
            <input
              type="date"
              value={nyDato}
              onChange={(e) => setNyDato(e.target.value)}
              className="input-field flex-1"
              placeholder="Legg til ny dato"
            />
            <button
              onClick={leggTilDato}
              disabled={!nyDato || laster === 'ny-dato'}
              className="btn-secondary text-xs disabled:opacity-50"
            >
              {laster === 'ny-dato' ? 'Legger til...' : '+ Legg til'}
            </button>
          </div>
        )}
      </div>

      {/* Admin-handlinger */}
      {erAdmin && forslag.status === 'apen' && !redigerer && (
        <div className="pt-4 border-t border-wine-900/10 flex gap-3 flex-wrap">
          <button
            onClick={avlys}
            disabled={laster === 'avlys'}
            className="text-xs font-sans uppercase tracking-wider text-ink-700/60 hover:text-wine-700 transition disabled:opacity-50"
          >
            Avlys forslag
          </button>
          <button
            onClick={slett}
            disabled={laster === 'slett'}
            className="text-xs font-sans uppercase tracking-wider text-ink-700/60 hover:text-wine-700 transition disabled:opacity-50"
          >
            Slett forslag
          </button>
        </div>
      )}

      {erAdmin && forslag.status !== 'apen' && (
        <div className="pt-4 border-t border-wine-900/10">
          <button
            onClick={slett}
            disabled={laster === 'slett'}
            className="text-xs font-sans uppercase tracking-wider text-ink-700/60 hover:text-wine-700 transition disabled:opacity-50"
          >
            Slett forslag
          </button>
        </div>
      )}
    </article>
  );
}
