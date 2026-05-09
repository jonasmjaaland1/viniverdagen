'use client';

import { useState } from 'react';

interface VinKontekst {
  navn?: string;
  type?: string;
  land?: string;
}

export default function SmaksHjelper({
  vinKontekst,
  onLagre,
  onLukk,
}: {
  vinKontekst?: VinKontekst;
  onLagre: (tekst: string) => void;
  onLukk: () => void;
}) {
  const [stikkord, setStikkord] = useState('');
  const [lengde, setLengde] = useState<'kort' | 'medium' | 'lang'>('medium');
  const [stil, setStil] = useState<'naturlig' | 'lekent' | 'profesjonelt'>('naturlig');
  const [forslag, setForslag] = useState<string | null>(null);
  const [genererer, setGenererer] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  async function generer() {
    if (!stikkord.trim() || stikkord.trim().length < 2) {
      setFeil('Skriv noen stikkord først');
      return;
    }

    setGenererer(true);
    setFeil(null);

    try {
      const res = await fetch('/api/ai/smaksbeskrivelse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stikkord: stikkord.trim(),
          vinNavn: vinKontekst?.navn,
          vinType: vinKontekst?.type,
          vinLand: vinKontekst?.land,
          lengde,
          stil,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.feil) {
        setFeil(data.feil || 'Klarte ikke å generere anmeldelse');
        setGenererer(false);
        return;
      }

      setForslag(data.anmeldelse);
    } catch (e: any) {
      setFeil(e.message || 'Noe gikk galt');
    } finally {
      setGenererer(false);
    }
  }

  function brukDette() {
    if (forslag) {
      onLagre(forslag);
    }
  }

  function generetIgjen() {
    setForslag(null);
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/70 flex items-center justify-center p-4">
      <div className="bg-cream-50 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-wine-900/10 flex items-center justify-between">
          <h2 className="font-display text-xl text-wine-900 flex items-center gap-2">
            <span>✨</span> Smaksbeskrivelse-hjelper
          </h2>
          <button
            onClick={onLukk}
            className="text-ink-700/50 hover:text-wine-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!forslag ? (
            <>
              <div>
                <label className="block text-sm font-sans uppercase tracking-wider text-ink-700/60 mb-2">
                  Stikkord, smaker, inntrykk
                </label>
                <textarea
                  value={stikkord}
                  onChange={(e) => setStikkord(e.target.value)}
                  placeholder="f.eks. kirsebær, krydder, røyk, balansert, fyldig, passer til lammeskank"
                  rows={4}
                  className="input-field resize-none"
                  autoFocus
                />
                <p className="text-xs text-ink-700/50 italic mt-1.5">
                  Skriv enkle ord eller setninger - AI lager en pen anmeldelse
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-sans uppercase tracking-wider text-ink-700/60 mb-2">
                    Lengde
                  </label>
                  <div className="flex gap-1">
                    {(['kort', 'medium', 'lang'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLengde(l)}
                        className={`flex-1 py-1.5 text-xs font-sans rounded transition ${
                          lengde === l
                            ? 'bg-wine-700 text-cream-50'
                            : 'bg-cream-100 text-wine-800 hover:bg-cream-200'
                        }`}
                      >
                        {l.charAt(0).toUpperCase() + l.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-sans uppercase tracking-wider text-ink-700/60 mb-2">
                    Stil
                  </label>
                  <div className="flex gap-1">
                    {([
                      ['naturlig', 'Naturlig'],
                      ['lekent', 'Lekent'],
                      ['profesjonelt', 'Proff'],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setStil(key)}
                        className={`flex-1 py-1.5 text-xs font-sans rounded transition ${
                          stil === key
                            ? 'bg-wine-700 text-cream-50'
                            : 'bg-cream-100 text-wine-800 hover:bg-cream-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {feil && (
                <p className="text-sm text-wine-700 bg-wine-50 px-3 py-2 rounded">{feil}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={generer}
                  disabled={genererer || stikkord.trim().length < 2}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {genererer ? '✨ Genererer …' : '✨ Lag anmeldelse'}
                </button>
                <button onClick={onLukk} className="btn-secondary">
                  Avbryt
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-2">
                  Forslag
                </p>
                <div className="bg-cream-100 rounded p-4 border-l-4 border-wine-700">
                  <p className="text-base font-sans text-ink-700/85 leading-relaxed whitespace-pre-wrap">
                    {forslag}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={brukDette}
                  className="btn-primary w-full"
                >
                  ✓ Bruk dette
                </button>
                <button
                  onClick={generetIgjen}
                  className="w-full py-2 text-sm font-sans uppercase tracking-wider text-ink-700/70 hover:text-wine-700 transition"
                >
                  ✨ Lag et nytt forslag
                </button>
                <button
                  onClick={onLukk}
                  className="w-full py-2 text-sm font-sans uppercase tracking-wider text-ink-700/50 hover:text-ink-700 transition"
                >
                  Avbryt
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
