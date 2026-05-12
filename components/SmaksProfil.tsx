'use client';

interface SmaksProfilProps {
  friskhet?: number | null;
  fylde?: number | null;
  bitterhet?: number | null;
  sodme?: number | null;
  garvestoffer?: number | null;
}

export default function SmaksProfil({
  friskhet,
  fylde,
  bitterhet,
  sodme,
  garvestoffer,
}: SmaksProfilProps) {
  // Skala er 1-12 fra Vinmonopolet
  const rader = [
    { navn: 'Fylde', verdi: fylde, maks: 12 },
    { navn: 'Friskhet', verdi: friskhet, maks: 12 },
    { navn: 'Sødme', verdi: sodme, maks: 12 },
    { navn: 'Bitterhet', verdi: bitterhet, maks: 12 },
    { navn: 'Garvestoffer', verdi: garvestoffer, maks: 12 },
  ].filter((r) => r.verdi !== null && r.verdi !== undefined && r.verdi > 0);

  if (rader.length === 0) return null;

  return (
    <div className="kort p-5 md:p-6">
      <h3 className="font-display text-lg text-wine-900 mb-4">Smaksprofil</h3>
      <div className="space-y-3">
        {rader.map((r) => {
          const prosent = ((r.verdi || 0) / r.maks) * 100;
          return (
            <div key={r.navn}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-sans uppercase tracking-wider text-ink-700/60">
                  {r.navn}
                </span>
                <span className="text-xs font-sans text-wine-700">
                  {r.verdi}/12
                </span>
              </div>
              <div className="w-full h-2 bg-cream-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-wine-700 rounded-full transition-all"
                  style={{ width: `${prosent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
