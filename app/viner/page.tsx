import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import VinFilter from '@/components/VinFilter';

export default async function VinOversikt({
  searchParams,
}: {
  searchParams: { kategori?: string; minScore?: string };
}) {
  const supabase = await createClient();
  const kategori = searchParams.kategori;
  const minScore = searchParams.minScore ? parseFloat(searchParams.minScore) : null;

  let query = supabase.from('vin_oversikt').select('*');
  if (kategori && kategori !== 'alle') {
    query = query.eq('hovedkategori', kategori);
  }
  if (minScore) {
    query = query.gte('snitt_total', minScore);
  }

  const { data: viner } = await query.order('snitt_total', { ascending: false, nullsFirst: false });

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="font-display text-5xl text-wine-900 mb-3">Alle viner</h1>
        <div className="gold-line w-24 mx-auto" />
      </div>

      <VinFilter />

      {(!viner || viner.length === 0) ? (
        <p className="text-center text-ink-700/60 italic py-20">
          Ingen viner matcher filteret.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {viner.map((v: any) => (
            <Link
              key={v.varenummer}
              href={`/viner/${v.varenummer}`}
              className="kort p-5 flex gap-4"
            >
              {v.bilde_url && (
                <img
                  src={v.bilde_url}
                  alt={v.navn}
                  className="w-16 h-24 object-contain flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg text-wine-900 leading-tight">{v.navn}</h3>
                <p className="text-xs font-sans text-ink-700/60 mt-1">
                  {[v.hovedkategori, v.land].filter(Boolean).join(' · ')}
                </p>
                {v.snitt_total && (
                  <p className="font-display text-2xl text-wine-800 mt-2">
                    ★ {v.snitt_total}
                  </p>
                )}
                <p className="text-xs font-sans text-ink-700/50 mt-1">
                  {v.antall_smakinger} {v.antall_smakinger === 1 ? 'smaking' : 'smakinger'}
                  {v.forste_klubbkveld && (
                    <> · siden {new Date(v.forste_klubbkveld).getFullYear()}</>
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
