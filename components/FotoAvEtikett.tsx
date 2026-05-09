'use client';

import { useState, useRef } from 'react';

interface Produkt {
  varenummer: string;
  navn: string;
  produkttype?: string;
  hovedkategori?: string;
  land?: string;
  distrikt?: string;
  pris?: number;
  bilde_url?: string;
  produsent?: string;
}

interface IdentifisertVin {
  navn: string;
  produsent?: string;
  vinnavn?: string;
  argang?: string | null;
  land?: string;
  type?: string;
  sokestreng: string;
}

export default function FotoAvEtikett({
  onTreff,
  onLukk,
}: {
  onTreff: (produkt: Produkt) => void;
  onLukk: () => void;
}) {
  const [status, setStatus] = useState<'velg' | 'analyserer' | 'visResultater' | 'feil'>('velg');
  const [feilmelding, setFeilmelding] = useState<string>('');
  const [identifisert, setIdentifisert] = useState<IdentifisertVin | null>(null);
  const [resultater, setResultater] = useState<Produkt[]>([]);
  const [bildePreview, setBildePreview] = useState<string | null>(null);
  const [nyttSok, setNyttSok] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  async function analyserBilde(fil: File) {
    setStatus('analyserer');
    setFeilmelding('');

    // Vis preview
    const reader = new FileReader();
    reader.onload = (e) => setBildePreview(e.target?.result as string);
    reader.readAsDataURL(fil);

    try {
      const formData = new FormData();
      formData.append('bilde', fil);

      const res = await fetch('/api/ai/foto-etikett', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.feil) {
        setFeilmelding(data.feil || 'Klarte ikke å analysere bildet');
        setStatus('feil');
        return;
      }

      setIdentifisert(data.identifisert);
      setResultater(data.resultater || []);
      setNyttSok(data.identifisert?.sokestreng || '');
      setStatus('visResultater');
    } catch (e: any) {
      setFeilmelding(e.message || 'Noe gikk galt');
      setStatus('feil');
    }
  }

  function velgBilde(e: React.ChangeEvent<HTMLInputElement>) {
    const fil = e.target.files?.[0];
    if (!fil) return;
    analyserBilde(fil);
  }

  async function sokIgjen() {
    if (!nyttSok.trim()) return;
    setStatus('analyserer');
    try {
      const res = await fetch(`/api/vinmonopolet/sok?q=${encodeURIComponent(nyttSok.trim())}`);
      const data = await res.json();
      setResultater(data.resultater || []);
      setStatus('visResultater');
    } catch {
      setFeilmelding('Klarte ikke å søke');
      setStatus('feil');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/95 flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-cream-50/10 bg-ink-900">
        <h2 className="font-display text-xl text-cream-50">📷 Foto av etikett</h2>
        <button
          onClick={onLukk}
          className="text-cream-50 text-sm font-sans uppercase tracking-wider px-3 py-1 border border-cream-50/30 rounded"
        >
          Avbryt
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {status === 'velg' && (
          <div className="max-w-md mx-auto space-y-6 mt-8">
            <div className="text-center">
              <p className="text-cream-50/80 mb-2">
                Ta et bilde av vinetiketten, så finner AI vinen for deg.
              </p>
              <p className="text-cream-50/50 text-sm italic">
                Tips: Hold etiketten rett og sørg for god belysning.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-4 px-6 bg-wine-700 hover:bg-wine-800 text-cream-50 font-display text-lg rounded-lg transition flex items-center justify-center gap-3"
              >
                📷 Ta bilde med kamera
              </button>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={velgBilde}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-6 bg-cream-50/10 hover:bg-cream-50/20 text-cream-50 font-sans rounded-lg transition flex items-center justify-center gap-3 border border-cream-50/30"
              >
                🖼️ Velg fra galleri
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={velgBilde}
                className="hidden"
              />
            </div>
          </div>
        )}

        {status === 'analyserer' && (
          <div className="max-w-md mx-auto text-center mt-12 space-y-6">
            {bildePreview && (
              <img
                src={bildePreview}
                alt="Etikett"
                className="max-w-xs max-h-64 mx-auto rounded-lg border border-cream-50/20"
              />
            )}
            <div className="space-y-2">
              <p className="text-cream-50 font-display text-xl">🤖 AI analyserer bildet …</p>
              <p className="text-cream-50/60 italic text-sm">
                Dette tar noen sekunder
              </p>
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-cream-50/30 border-t-cream-50" />
            </div>
          </div>
        )}

        {status === 'visResultater' && identifisert && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-cream-50/10 border border-cream-50/20 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wider font-sans text-cream-50/60 mb-2">
                AI identifiserte
              </p>
              <p className="font-display text-xl text-cream-50">
                {identifisert.navn}
                {identifisert.argang && ` ${identifisert.argang}`}
              </p>
              {(identifisert.land || identifisert.type) && (
                <p className="text-sm text-cream-50/70 mt-1">
                  {[identifisert.type, identifisert.land].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-sans uppercase tracking-wider text-cream-50/60 mb-2">
                Søk i Vinmonopolet
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nyttSok}
                  onChange={(e) => setNyttSok(e.target.value)}
                  className="flex-1 px-3 py-2 bg-cream-50/10 border border-cream-50/30 rounded text-cream-50 placeholder-cream-50/40"
                  placeholder="Søk på navn"
                  onKeyDown={(e) => e.key === 'Enter' && sokIgjen()}
                />
                <button
                  onClick={sokIgjen}
                  className="px-4 py-2 bg-wine-700 hover:bg-wine-800 text-cream-50 rounded transition"
                >
                  Søk
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm font-sans uppercase tracking-wider text-cream-50/60 mb-3">
                Velg riktig vin ({resultater.length} treff)
              </p>
              {resultater.length === 0 ? (
                <p className="text-cream-50/60 italic text-sm">
                  Ingen treff. Prøv å søke med andre ord.
                </p>
              ) : (
                <ul className="space-y-2">
                  {resultater.map((p) => (
                    <li key={p.varenummer}>
                      <button
                        onClick={() => onTreff(p)}
                        className="w-full text-left p-3 bg-cream-50/5 hover:bg-cream-50/15 rounded transition flex gap-3 items-center border border-cream-50/10"
                      >
                        {p.bilde_url && (
                          <img src={p.bilde_url} alt="" className="w-10 h-14 object-contain flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-base text-cream-50 truncate">{p.navn}</p>
                          <p className="text-xs font-sans text-cream-50/60">
                            {[p.hovedkategori, p.land, p.varenummer].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        {p.pris && (
                          <p className="text-sm text-cream-50 font-display flex-shrink-0">
                            {p.pris.toFixed(0)} kr
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={() => {
                  setStatus('velg');
                  setIdentifisert(null);
                  setResultater([]);
                  setBildePreview(null);
                }}
                className="text-cream-50/70 text-sm underline"
              >
                Ta nytt bilde
              </button>
            </div>
          </div>
        )}

        {status === 'feil' && (
          <div className="max-w-md mx-auto text-center mt-12 space-y-4">
            <p className="font-display text-2xl text-cream-50">Noe gikk galt</p>
            <p className="text-cream-50/70">{feilmelding}</p>
            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={() => {
                  setStatus('velg');
                  setBildePreview(null);
                }}
                className="btn-primary"
              >
                Prøv igjen
              </button>
              <button onClick={onLukk} className="text-cream-50/70 text-sm underline">
                Lukk
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
