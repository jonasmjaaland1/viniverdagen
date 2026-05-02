import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';

export default async function Statistikk() {
  const supabase = await createClient();

  const { data: alle } = await supabase
    .from('vin_oversikt')
    .select('*')
    .not('snitt_total', 'is', null)
    .order('snitt_total', { ascending: false });

  if (!alle || alle.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h1 className="font-display text-5xl text-wine-900 mb-3">Statistikk</h1>
        <div className="gold-line w-24 mx-auto my-6" />
        <p className="text-ink-700/60 italic">Ikke nok data ennå.</p>
      </div>
    );
  }

  // Topp 10 totalt
  const topp10 = alle.slice(0, 10);

  // Topp 10 per kategori
  const perKategori: Record<string, any[]> = {};
  alle.forEach((v: any) => {
    if (!v.hovedkategori) return;
    if (!perKategori[v.hovedkategori]) perKategori[v.hovedkategori] = [];
    if (perKategori[v.hovedkategori].length < 10) perKategori[v.hovedkategori].push(v);
  });

  // Topp 10 per land
  const perLand: Record<string, any[]> = {};
  alle.forEach((v: any) => {
    if (!v.land) return;
    if (!perLand[v.land]) perLand[v.land] = [];
    if (perLand[v.land].length < 10) perLand[v.land].push(v);
  });

  // Topp 10 per drue
  const perDrue: Record<string, any[]> = {};
  alle.forEach((v: any) => {
    (v.druer || []).forEach((drue: string) => {
      if (!perDrue[drue]) perDrue[drue] = [];
      if (perDrue[drue].length < 10) perDrue[drue].push(v);
    });
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="font-display text-5xl text-wine-900 mb-3">Statistikk</h1>
        <div className="gold-line w-24 mx-auto" />
      </div>

      <Seksjon tittel="Topp 10 høyest scorede" viner={topp10} />

      <Seksjon
        tittel="Topp 10 per kategori"
        grupper={perKategori}
      />

      <Seksjon
        tittel="Topp 10 per land"
        grupper={perLand}
      />

      <Seksjon
        tittel="Topp 10 per drue"
        grupper={perDrue}
      />
    </div>
  );
}

function Seksjon({
  tittel,
  viner,
  grupper,
}: {
  tittel: string;
  viner?: any[];
  grupper?: Record<string, any[]>;
}) {
  return (
    <section className="mb-16">
      <h2 className="font-display text-3xl text-wine-900 mb-6">{tittel}</h2>

      {viner && <Liste viner={viner} />}

      {grupper && (
        <div className="space-y-8">
          {Object.entries(grupper)
            .sort(([, a], [, b]) => b.length - a.length)
            .map(([n, vs]) => (
              <div key={n}>
                <h3 className="font-display text-xl text-wine-700 mb-3 italic">{n}</h3>
                <Liste viner={vs} />
              </div>
            ))}
        </div>
      )}
    </section>
  );
}

function Liste({ viner }: { viner: any[] }) {
  return (
    <ol className="kort divide-y divide-wine-900/10">
      {viner.map((v, i) => (
        <li key={v.varenummer}>
          <Link href={`/viner/${v.varenummer}`} className="flex items-center gap-4 p-4 hover:bg-cream-100 transition">
            <span className="font-display text-2xl text-wine-300 w-8 text-center">{i + 1}</span>
            {v.bilde_url && (
              <img src={v.bilde_url} alt="" className="w-10 h-14 object-contain" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-display text-base text-wine-900 truncate">{v.navn}</p>
              <p className="text-xs font-sans text-ink-700/60">
                {[v.hovedkategori, v.land].filter(Boolean).join(' · ')}
              </p>
            </div>
            <span className="font-display text-xl text-wine-800 whitespace-nowrap">
              ★ {v.snitt_total}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
