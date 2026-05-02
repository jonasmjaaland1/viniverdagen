'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function SmakingsKort({
  smaking,
  brukerId,
  visVin = true,
}: {
  smaking: any;
  brukerId: string;
  visVin?: boolean;
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
            <img
              src={v.bilde_url}
              alt={v.navn}
              className="w-24 h-36 object-contain"
            />
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

          <p className="text-sm font-sans text-ink-700/70 mt-3 italic">
            {erFrittstaende ? 'Lagt til av' : 'Tatt med av'} {smaking.medlemmer?.navn}
          </p>

          {/* Score-input */}
          {!minScore && (
            <div className="mt-5 pt-5 border-t border-wine-900/10">
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

          {minScore && (
            <p className="mt-4 text-sm font-sans text-ink-700/70">
              Du ga denne <span className="text-wine-700 font-medium">{minScore.score}</span>.
            </p>
          )}

          {/* Alle scorer */}
          {scorer.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-ink-700/50 font-sans mb-2">
                Scorer
              </p>
              <div className="flex flex-wrap gap-2">
                {scorer.map((s: any) => (
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

          {/* Kommentarer */}
          <div className="mt-6 pt-5 border-t border-wine-900/10">
            <p className="text-xs uppercase tracking-wider text-ink-700/50 font-sans mb-3">
              Kommentarer ({kommentarer.length})
            </p>

            {kommentarer.length > 0 && (
              <ul className="space-y-3 mb-4">
                {kommentarer.map((k: any) => (
                  <li key={k.id} className="text-base">
                    <p className="text-ink-700/80 leading-relaxed">{k.tekst}</p>
                    <p className="text-xs font-sans text-ink-700/50 mt-1">
                      — {k.medlemmer?.navn},{' '}
                      {new Date(k.opprettet_at).toLocaleDateString('nb-NO')}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <textarea
              value={kommentar}
              onChange={(e) => setKommentar(e.target.value)}
              placeholder="Skriv en kommentar …"
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
        </div>
      </div>
    </article>
  );
}
