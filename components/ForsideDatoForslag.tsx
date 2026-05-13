'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

interface SvarPerson {
  medlem_id: string;
  medlem_navn: string;
  svar: 'kan' | 'kan_ikke' | 'kanskje';
}

interface Alternativ {
  id: string;
  dato: string;
  antall_kan: number;
  antall_kan_ikke: number;
  antall_kanskje: number;
  mitt_svar: 'kan' | 'kan_ikke' | 'kanskje' | null;
  alle_svar?: SvarPerson[];
}

interface Forslag {
  id: string;
  tittel: string | null;
  beskrivelse: string | null;
  ansvarlig_navn: string | null;
  alternativer: Alternativ[];
}

export default function ForsideDatoForslag({
  forslag,
  brukerId,
}: {
  forslag: Forslag[];
  brukerId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [laster, setLaster] = useState<string | null>(null);
  const [visSvar, setVisSvar] = useState<string | null>(null);

  async function svar(
    alternativId: string,
    svarVerdi: 'kan' | 'kan_ikke' | 'kanskje',
    mittEksisterendeSvar: string | null
  ) {
    setLaster(alternativId + svarVerdi);

    if (mittEksisterendeSvar === svarVerdi) {
      await supabase
        .from('dato_svar')
        .delete()
        .eq('alternativ_id', alternativId)
        .eq('medlem_id', brukerId);
    } else {
      await supabase.from('dato_svar').upsert(
        {
          alternativ_id: alternativId,
          medlem_id: brukerId,
          svar: svarVerdi,
        },
        { onConflict: 'alternativ_id,medlem_id' }
      );
    }

    setLaster(null);
    router.refresh();
  }

  function formatDato(d: string): string {
    return new Date(d).toLocaleDateString('nb-NO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  if (forslag.length === 0) return null;

  return (
    <section className="kort p-6 md:p-8 mb-8 border-l-4 border-wine-700 fade-up">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.25em] text-wine-700 font-sans mb-2">
            📅 Når kan du delta?
          </p>
          <p className="text-sm text-ink-700/70 italic">
            Trykk på datoene som passer for deg
          </p>
        </div>
        href="/datoer"
               className="text-xs font-sans uppercase tracking-wider text-wine-700 hover:text-wine-900 transition cursor-pointer relative z-10"
             >
               Se alle →
             </a>
      </div>

      {forslag.map((f) => {
        const sortertAlt = [...f.alternativer].sort(
          (a, b) => new Date(a.dato).getTime() - new Date(b.dato).getTime()
        );
        const beste = sortertAlt.reduce<Alternativ | null>(
          (best, alt) => (!best || alt.antall_kan > best.antall_kan ? alt : best),
          null
        );

        return (
          <div key={f.id} className="space-y-3">
            {f.tittel && (
              <h3 className="font-display text-xl text-wine-900">{f.tittel}</h3>
            )}
            {f.beskrivelse && (
              <p className="text-sm font-sans text-ink-700/80 italic">{f.beskrivelse}</p>
            )}
            {f.ansvarlig_navn && (
              <p className="text-xs font-sans text-wine-700">
                Ansvarlig: <span className="font-medium">{f.ansvarlig_navn}</span>
              </p>
            )}

            <div className="space-y-2 pt-2">
              {sortertAlt.map((alt) => {
                const erBeste = beste && beste.id === alt.id;
                const visAlle = visSvar === alt.id;
                const harSvar = (alt.alle_svar?.length || 0) > 0;
                return (
                  <div
                    key={alt.id}
                    className={`p-3 rounded border ${
                      erBeste
                        ? 'bg-cream-100 border-cream-200'
                        : 'bg-cream-50 border-wine-900/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-display text-base text-wine-900">
                          {formatDato(alt.dato)}
                        </p>
                        <div className="flex gap-2 text-xs font-sans">
                          {alt.antall_kan > 0 && (
                            <span className="text-green-700">✓ {alt.antall_kan}</span>
                          )}
                          {alt.antall_kanskje > 0 && (
                            <span className="text-amber-700">~ {alt.antall_kanskje}</span>
                          )}
                          {alt.antall_kan_ikke > 0 && (
                            <span className="text-ink-700/40">✕ {alt.antall_kan_ikke}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => svar(alt.id, 'kan', alt.mitt_svar)}
                          disabled={laster !== null}
                          className={`px-2.5 py-1 text-[11px] uppercase tracking-wider font-sans rounded transition ${
                            alt.mitt_svar === 'kan'
                              ? 'bg-wine-700 text-cream-50'
                              : 'bg-cream-100 text-wine-800 hover:bg-cream-200'
                          } disabled:opacity-50`}
                        >
                          Kan
                        </button>
                        <button
                          onClick={() => svar(alt.id, 'kanskje', alt.mitt_svar)}
                          disabled={laster !== null}
                          className={`px-2.5 py-1 text-[11px] uppercase tracking-wider font-sans rounded transition ${
                            alt.mitt_svar === 'kanskje'
                              ? 'bg-wine-700 text-cream-50'
                              : 'bg-cream-100 text-wine-800 hover:bg-cream-200'
                          } disabled:opacity-50`}
                        >
                          Kanskje
                        </button>
                        <button
                          onClick={() => svar(alt.id, 'kan_ikke', alt.mitt_svar)}
                          disabled={laster !== null}
                          className={`px-2.5 py-1 text-[11px] uppercase tracking-wider font-sans rounded transition ${
                            alt.mitt_svar === 'kan_ikke'
                              ? 'bg-wine-700 text-cream-50'
                              : 'bg-cream-100 text-wine-800 hover:bg-cream-200'
                          } disabled:opacity-50`}
                        >
                          Kan ikke
                        </button>
                      </div>
                    </div>

                    {/* Vis hvem har svart */}
                    {harSvar && (
                      <div className="mt-2 pt-2 border-t border-wine-900/5">
                        <button
                          onClick={() => setVisSvar(visAlle ? null : alt.id)}
                          className="text-xs font-sans text-ink-700/50 hover:text-wine-700 transition"
                        >
                          {visAlle ? 'Skjul' : 'Vis'} hvem har svart ({alt.alle_svar!.length})
                        </button>
                        {visAlle && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {alt.alle_svar!.map((s) => (
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
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
