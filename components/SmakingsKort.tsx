'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import Avatar from './Avatar';

export default function SmakingsKort({
  smaking,
  brukerId,
  visVin = true,
  kanScoreOgKommentere = true,
}: {
  smaking: any;
  brukerId: string;
  visVin?: boolean;
  kanScoreOgKommentere?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [score, setScore] = useState<number | null>(null);
  const [kommentar, setKommentar] = useState('');
  const [laster, setLaster] = useState(false);

  const v = smaking.vinmonopol_produkter;
  const scorer = smaking.scorer || [];
  const kommentarer = smaking.kommentarer || [];
  const minScore = scorer.find((s: any) => s.medlem_id === brukerId);
  const snitt = scorer.length > 0
    ? (scorer.reduce((a: number, b: any) => a + b.score, 0) / scorer.length).toFixed(1)
    : null;
  const erFrittstaende = !smaking.klubbkveld_id;
  const tattMedAvId = smaking.tatt_med_av;

  // Finn hovedanmelder (den som la til vinen) sin kommentar og score
  const hovedanmelderKommentar = kommentarer.find(
    (k: any) => k.medlem_id === tattMedAvId
  );
  const hovedanmelderScore = scorer.find(
    (s: any) => s.medlem_id === tattMedAvId
  );

  // Andre kommentarer (fra andre enn hovedanmelder)
  const andreKommentarer = kommentarer.filter(
    (k: any) => k.medlem_id !== tattMedAvId
  );

  // Sortér eldste først så det leses kronologisk
  const andreKommentarerSortert = [...andreKommentarer].sort((a, b) =>
    new Date(a.opprettet_at).getTime() - new Date(b.opprettet_at).getTime()
  );

  // Andre scorer (fra andre enn hovedanmelder)
  const andreScorer = scorer.filter((s: any) => s.medlem_id !== tattMedAvId);

  const tattMedAvNavn = smaking.medlemmer?.navn || 'Ukjent';

  async function lagreScore() {
    if (!score) return;
    setLaster(true);
    const { error } = await supabase.from('scorer').insert({
      smaking_id: smaking.id,
      medlem_id: brukerId,
      score,
    });
    setLaster(false);
    if (!error) {
      setScore(null);
      router.refresh();
    }
  }

  async function lagreKommentar() {
    if (!kommentar.trim()) return;
    setLaster(true);
    const { error } = await supabase.from('kommentarer').insert({
      smaking_id: smaking.id,
      medlem_id: brukerId,
      tekst: kommentar.trim(),
    });
    setLaster(false);
    if (!error) {
      setKommentar('');
      router.refresh();
    }
  }

  return (
    <article id={`smaking-${smaking.id}`} className="kort p-6 md:p-8">
      <div className="flex flex-col sm:flex-row gap-6">
        {visVin && v?.bilde_url && (
          <Link href={`/viner/${smaking.varenummer}`} className="flex-shrink-0 mx-auto sm:mx-0">
            <img src={v.bilde_url} alt={v.navn} className="w-24 h-36 object-contain" />
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              {visVin && (
                <Link href={`/viner/${smaking.varenummer}`} className="hover:underline">
                  <h3 className="font-display text-2xl text-wine-900">{v?.navn}</h3>
                </Link>
              )}
              {visVin && (
                <p className="text-sm font-sans text-ink-700/60 mt-1">
                  {[v?.hovedkategori, v?.land, v?.produsent].filter(Boolean).join(' · ')}
                  {v?.alkoholprosent && ` · ${v.alkoholprosent}%`}
                </p>
              )}
              {visVin && v?.pris && (
                <p className="text-sm text-wine-700 font-display mt-1">
                  {Number(v.pris).toFixed(2)} kr
                </p>
              )}
            </div>
            {snitt && (
              <div className="text-right">
                <p className="font-display text-3xl text-wine-800">★ {snitt}</p>
                <p className="text-xs font-sans text-ink-700/50">
                  {scorer.length} {scorer.length === 1 ? 'score' : 'scorer'}
                </p>
              </div>
            )}
          </div>

          {/* HOVEDANMELDELSE - uthevet ramme med stor avatar */}
          <div className="mt-5 p-5 bg-cream-100/50 border-l-4 border-wine-700 rounded">
            <div className="flex items-start gap-4">
              <Avatar navn={tattMedAvNavn} storrelse="stor" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-display text-lg text-wine-900">
                    {tattMedAvNavn}
                    <span className="ml-2 text-xs uppercase tracking-wider font-sans text-wine-700">
                      {erFrittstaende ? 'la til' : 'tok med'}
                    </span>
                  </p>
                  {hovedanmelderScore && (
                    <span className="font-display text-2xl text-wine-700">
                      ★ {hovedanmelderScore.score}
                    </span>
                  )}
                </div>
                {hovedanmelderKommentar ? (
                  <p className="text-base font-sans text-ink-700/85 leading-relaxed mt-2 italic">
                    "{hovedanmelderKommentar.tekst}"
                  </p>
                ) : (
                  <p className="text-sm font-sans text-ink-700/50 italic mt-2">
                    (Ingen anmeldelse)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Andre scorer (compactly) */}
          {andreScorer.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wider text-ink-700/50 font-sans mb-2">
                Andre scorer
              </p>
              <div className="flex flex-wrap gap-2">
                {andreScorer.map((s: any) => (
                  <span
                    key={s.id}
                    className="text-xs font-sans px-3 py-1 bg-cream-100 rounded-full"
                  >
                    {s.medlemmer?.navn}: <span className="font-medium text-wine-700">{s.score}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Andre kommentarer */}
          {andreKommentarerSortert.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wider text-ink-700/50 font-sans mb-3">
                Andre kommentarer ({andreKommentarerSortert.length})
              </p>
              <ul className="space-y-3">
                {andreKommentarerSortert.map((k: any) => (
                  <li key={k.id} className="flex gap-3 items-start">
                    <Avatar navn={k.medlemmer?.navn} storrelse="liten" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans text-ink-700/85 leading-relaxed">
                        {k.tekst}
                      </p>
                      <p className="text-xs font-sans text-ink-700/50 mt-1">
                        {k.medlemmer?.navn} · {new Date(k.opprettet_at).toLocaleDateString('nb-NO')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Egen score-input - bare hvis ikke allerede scoret */}
          {kanScoreOgKommentere && !minScore && (
            <div className="mt-6 pt-5 border-t border-wine-900/10">
              <p className="text-sm font-sans uppercase tracking-wider text-ink-700/60 mb-2">
                Din score
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setScore(n)}
                    className={`w-10 h-10 rounded-full font-display text-lg transition ${
                      score === n
                        ? 'bg-wine-700 text-cream-50'
                        : 'bg-cream-100 text-wine-800 hover:bg-cream-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={lagreScore}
                disabled={!score || laster}
                className="btn-primary text-xs disabled:opacity-50"
              >
                Lagre score
              </button>
              <p className="text-xs text-ink-700/50 font-sans mt-2 italic">
                Score kan ikke endres etter lagring.
              </p>
            </div>
          )}

          {kanScoreOgKommentere && minScore && (
            <p className="mt-5 text-sm font-sans text-ink-700/70">
              Du ga denne <span className="text-wine-700 font-medium">{minScore.score}</span>.
            </p>
          )}

          {/* Skriv kommentar */}
          {kanScoreOgKommentere && (
            <div className="mt-5 pt-5 border-t border-wine-900/10">
              <p className="text-xs uppercase tracking-wider text-ink-700/50 font-sans mb-2">
                Skriv en kommentar
              </p>
              <textarea
                value={kommentar}
                onChange={(e) => setKommentar(e.target.value)}
                placeholder="Hva synes du om vinen?"
                rows={2}
                className="input-field resize-none mb-2"
              />
              <button
                onClick={lagreKommentar}
                disabled={!kommentar.trim() || laster}
                className="btn-secondary text-xs disabled:opacity-50"
              >
                Legg til kommentar
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
