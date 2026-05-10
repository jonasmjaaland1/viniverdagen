'use client';

import { useState, useRef, useEffect } from 'react';

interface Melding {
  rolle: 'user' | 'assistant';
  innhold: string;
  verktoyKall?: Array<{ navn: string; input: any }>;
}

const FORSLAG = [
  '🏆 Hva er klubbens beste vin?',
  '🇫🇷 Hvilke franske viner har vi drukket?',
  '⭐ Vis meg alle viner med score over 8',
  '📊 Hvilke land har best snittscore?',
  '🍷 Foreslå en vin under 300kr som klubben har likt',
  '📅 Lag en oppsummering av forrige klubbkveld',
];

export default function SporrClaude({ medlemNavn }: { medlemNavn: string }) {
  const [meldinger, setMeldinger] = useState<Melding[]>([]);
  const [input, setInput] = useState('');
  const [laster, setLaster] = useState(false);
  const meldingerEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    meldingerEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [meldinger, laster]);

  async function send(tekst?: string) {
    const innhold = (tekst ?? input).trim();
    if (!innhold || laster) return;

    const nyeMeldinger: Melding[] = [
      ...meldinger,
      { rolle: 'user', innhold },
    ];
    setMeldinger(nyeMeldinger);
    setInput('');
    setLaster(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meldinger: nyeMeldinger }),
      });

      const data = await res.json();

      if (!res.ok || data.feil) {
        setMeldinger([
          ...nyeMeldinger,
          {
            rolle: 'assistant',
            innhold: `⚠️ ${data.feil || 'Noe gikk galt. Prøv igjen.'}`,
          },
        ]);
      } else {
        setMeldinger([
          ...nyeMeldinger,
          {
            rolle: 'assistant',
            innhold: data.svar,
            verktoyKall: data.verktoyKall,
          },
        ]);
      }
    } catch (e: any) {
      setMeldinger([
        ...nyeMeldinger,
        { rolle: 'assistant', innhold: `⚠️ Feil: ${e.message}` },
      ]);
    } finally {
      setLaster(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function tilbakestill() {
    setMeldinger([]);
  }

  function verktoyEtikett(navn: string): string {
    const map: Record<string, string> = {
      sok_viner: '🔍 Søker i viner',
      hent_topp_viner: '🏆 Henter topp viner',
      hent_klubbkvelder: '📅 Henter klubbkvelder',
      hent_klubbkveld_detaljer: '📋 Henter klubbkveld-detaljer',
      hent_medlems_smakinger: '👤 Henter medlems-smakinger',
      hent_klubb_statistikk: '📊 Henter statistikk',
    };
    return map[navn] || navn;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-wine-900 flex items-center gap-2">
            <span>🤖</span> Spør Claude
          </h1>
          <p className="text-sm font-sans text-ink-700/70 mt-1">
            Still spørsmål om klubbens viner, klubbkvelder og medlemmer.
          </p>
        </div>
        {meldinger.length > 0 && (
          <button
            onClick={tilbakestill}
            className="text-xs font-sans uppercase tracking-wider text-ink-700/60 hover:text-wine-700 transition flex-shrink-0"
          >
            Ny samtale
          </button>
        )}
      </div>

      {/* Chat-område */}
      <div className="kort flex flex-col min-h-[60vh] max-h-[75vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {meldinger.length === 0 ? (
            <div className="text-center py-8 space-y-6">
              <div className="text-5xl">🍷</div>
              <div>
                <p className="font-display text-xl text-wine-900">Hei {medlemNavn}!</p>
                <p className="text-sm text-ink-700/70 mt-1 italic">
                  Jeg kjenner klubbens viner og kan hjelpe deg å utforske dem
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-700/50 font-sans mb-3">
                  Prøv å spørre om
                </p>
                <div className="flex flex-col gap-2 max-w-md mx-auto">
                  {FORSLAG.map((f) => (
                    <button
                      key={f}
                      onClick={() => send(f.replace(/^[^\s]+\s/, ''))}
                      className="text-left text-sm font-sans px-4 py-2.5 bg-cream-100 hover:bg-cream-200 text-wine-800 rounded transition"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {meldinger.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.rolle === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      m.rolle === 'user'
                        ? 'bg-wine-700 text-cream-50 rounded-br-md'
                        : 'bg-cream-100 text-ink-700 rounded-bl-md'
                    }`}
                  >
                    {m.verktoyKall && m.verktoyKall.length > 0 && (
                      <div className="mb-2 pb-2 border-b border-wine-900/10">
                        <p className="text-[10px] uppercase tracking-wider text-ink-700/50 font-sans mb-1">
                          Brukte data
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {m.verktoyKall.map((v, j) => (
                            <span
                              key={j}
                              className="text-[10px] font-sans px-2 py-0.5 bg-cream-50 rounded"
                            >
                              {verktoyEtikett(v.navn)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-sm font-sans whitespace-pre-wrap leading-relaxed">
                      {m.innhold}
                    </p>
                  </div>
                </div>
              ))}
              {laster && (
                <div className="flex justify-start">
                  <div className="bg-cream-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      <div className="w-2 h-2 rounded-full bg-wine-700/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-wine-700/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-wine-700/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="ml-2 text-xs font-sans text-ink-700/60 italic">tenker...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={meldingerEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-wine-900/10 p-3">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Spør om klubbens viner..."
              rows={1}
              className="flex-1 px-3 py-2 bg-cream-50 border border-wine-900/15 rounded-lg resize-none text-sm font-sans focus:outline-none focus:border-wine-700 max-h-32"
              disabled={laster}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || laster}
              className="btn-primary text-sm flex-shrink-0 disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <p className="text-[10px] text-ink-700/40 italic mt-2 px-1">
            AI kan ta feil. Verifiser viktig info i appen selv.
          </p>
        </div>
      </div>
    </div>
  );
}
