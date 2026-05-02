'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const KATEGORIER = ['alle', 'Rødvin', 'Hvitvin', 'Rosévin', 'Musserende', 'Dessert/Sterkvin', 'Øl', 'Brennevin', 'Sider', 'Annet'];

export default function VinFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const kategori = params.get('kategori') || 'alle';
  const minScore = params.get('minScore') || '';

  function oppdater(felt: string, verdi: string) {
    const ny = new URLSearchParams(params.toString());
    if (verdi) ny.set(felt, verdi);
    else ny.delete(felt);
    router.push(`/viner?${ny.toString()}`);
  }

  return (
    <div className="kort p-5 flex flex-wrap gap-4 items-center">
      <div className="flex flex-wrap gap-1.5">
        {KATEGORIER.map((k) => (
          <button
            key={k}
            onClick={() => oppdater('kategori', k === 'alle' ? '' : k)}
            className={`text-xs uppercase tracking-wider font-sans px-3 py-1.5 rounded transition ${
              kategori === k
                ? 'bg-wine-700 text-cream-50'
                : 'bg-cream-100 text-wine-800 hover:bg-cream-200'
            }`}
          >
            {k === 'alle' ? 'Alle' : k}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <label className="text-xs uppercase tracking-wider font-sans text-ink-700/60">
          Min. score
        </label>
        <select
          value={minScore}
          onChange={(e) => oppdater('minScore', e.target.value)}
          className="text-sm font-sans px-2 py-1 border border-wine-900/20 rounded bg-white"
        >
          <option value="">Alle</option>
          {[5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
