// Avatar-komponent som viser bilde hvis det finnes, ellers initialer i farget sirkel
const FARGER = [
  'bg-wine-700',
  'bg-amber-700',
  'bg-emerald-700',
  'bg-blue-700',
  'bg-purple-700',
  'bg-rose-700',
  'bg-teal-700',
  'bg-orange-700',
  'bg-indigo-700',
  'bg-pink-700',
];

function navnHash(navn: string): number {
  let hash = 0;
  for (let i = 0; i < navn.length; i++) {
    hash = (hash * 31 + navn.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function fargeForNavn(navn: string | undefined | null): string {
  if (!navn) return 'bg-ink-700';
  return FARGER[navnHash(navn) % FARGER.length];
}

export function initialerFor(navn: string | undefined | null): string {
  if (!navn) return '?';
  const deler = navn.trim().split(/\s+/);
  if (deler.length === 1) return deler[0].charAt(0).toUpperCase();
  return (deler[0].charAt(0) + deler[deler.length - 1].charAt(0)).toUpperCase();
}

interface AvatarProps {
  navn: string | undefined | null;
  bildeUrl?: string | null;
  storrelse?: 'liten' | 'medium' | 'stor' | 'xl';
  tittel?: string;
}

export default function Avatar({ navn, bildeUrl, storrelse = 'medium', tittel }: AvatarProps) {
  const initialer = initialerFor(navn);
  const farge = fargeForNavn(navn);

  const storrelsesKlasser = {
    liten: 'w-6 h-6 text-[10px]',
    medium: 'w-9 h-9 text-sm',
    stor: 'w-12 h-12 text-base',
    xl: 'w-24 h-24 text-2xl',
  };

  // Hvis vi har bilde, vis det
  if (bildeUrl) {
    return (
      <div
        className={`${storrelsesKlasser[storrelse]} rounded-full overflow-hidden flex-shrink-0 bg-cream-100`}
        title={tittel || navn || ''}
      >
        <img
          src={bildeUrl}
          alt={navn || ''}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Ellers vis initialer
  return (
    <div
      className={`${farge} ${storrelsesKlasser[storrelse]} rounded-full flex items-center justify-center text-cream-50 font-display font-medium flex-shrink-0`}
      title={tittel || navn || ''}
    >
      {initialer}
    </div>
  );
}
