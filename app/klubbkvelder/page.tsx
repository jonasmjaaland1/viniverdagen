import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';

export default async function KlubbkveldOversikt() {
  const supabase = await createClient();

  const { data: kvelder } = await supabase
    .from('klubbkvelder')
    .select(`
      id, dato, tittel, sted, bilde_url,
      smakinger(count)
    `)
    .order('dato', { ascending: false });

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="font-display text-5xl text-wine-900 mb-3">Klubbkvelder</h1>
        <div className="gold-line w-24 mx-auto" />
      </div>

      {(!kvelder || kvelder.length === 0) ? (
        <p className="text-center text-ink-700/60 italic py-20">
          Ingen klubbkvelder er opprettet ennå.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {kvelder.map((k: any) => (
            <Link
              key={k.id}
              href={`/klubbkvelder/${k.id}`}
              className="kort overflow-hidden block"
            >
              {k.bilde_url && (
                <div
                  className="h-40 bg-cover bg-center"
                  style={{ backgroundImage: `url(${k.bilde_url})` }}
                />
              )}
              <div className="p-6">
                <p className="text-xs uppercase tracking-wider text-wine-700 font-sans mb-2">
                  {new Date(k.dato).toLocaleDateString('nb-NO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <h3 className="font-display text-2xl text-wine-900 mb-2">{k.tittel}</h3>
                {k.sted && (
                  <p className="text-sm text-ink-700/70 italic">{k.sted}</p>
                )}
                <p className="text-sm text-ink-700/60 font-sans mt-3">
                  {k.smakinger?.[0]?.count || 0} viner
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
