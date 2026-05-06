'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SlettVinKnapp({
  varenummer,
  vinNavn,
}: {
  varenummer: string;
  vinNavn: string;
}) {
  const router = useRouter();
  const [bekrefter, setBekrefter] = useState(false);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  async function slett() {
    setLaster(true);
    setFeil(null);
    try {
      const res = await fetch(`/api/viner/${varenummer}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setFeil(data.feil || 'Kunne ikke slette vinen');
        setLaster(false);
        return;
      }
      router.push('/viner');
      router.refresh();
    } catch (e: any) {
      setFeil(e.message);
      setLaster(false);
    }
  }

  if (!bekrefter) {
    return (
      <button
        onClick={() => setBekrefter(true)}
        className="text-xs font-sans uppercase tracking-wider text-wine-700 hover:text-wine-900 px-3 py-2 border border-wine-700/30 rounded transition"
      >
        Slett vin
      </button>
    );
  }

  return (
    <div className="kort p-4 bg-wine-50 border border-wine-700/20">
      <p className="text-sm font-display text-wine-900 mb-1">
        Er du sikker?
      </p>
      <p className="text-xs font-sans text-ink-700/70 mb-3">
        Dette sletter <strong>{vinNavn}</strong> og alle smakinger, scorer og kommentarer
        knyttet til vinen. Handlingen kan ikke angres.
      </p>
      {feil && (
        <p className="text-xs text-wine-700 mb-2">{feil}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={slett}
          disabled={laster}
          className="text-xs font-sans uppercase tracking-wider px-3 py-2 bg-wine-700 text-cream-50 rounded hover:bg-wine-800 disabled:opacity-50"
        >
          {laster ? 'Sletter …' : 'Ja, slett vinen'}
        </button>
        <button
          onClick={() => { setBekrefter(false); setFeil(null); }}
          disabled={laster}
          className="text-xs font-sans uppercase tracking-wider px-3 py-2 text-ink-700 hover:text-wine-700"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}
