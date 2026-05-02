'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function AdminMedlemmer({ medlemmer }: { medlemmer: any[] }) {
  const router = useRouter();
  const supabase = createClient();

  async function godkjenn(id: string) {
    await supabase.from('medlemmer').update({ godkjent: true }).eq('id', id);
    router.refresh();
  }

  async function fjernGodkjenning(id: string) {
    await supabase.from('medlemmer').update({ godkjent: false }).eq('id', id);
    router.refresh();
  }

  async function settAdmin(id: string, er: boolean) {
    await supabase.from('medlemmer').update({ er_admin: er }).eq('id', id);
    router.refresh();
  }

  const venter = medlemmer.filter((m) => !m.godkjent);
  const godkjente = medlemmer.filter((m) => m.godkjent);

  return (
    <div className="space-y-8">
      {venter.length > 0 && (
        <div>
          <h3 className="font-display text-xl text-wine-700 mb-3 italic">Venter på godkjenning</h3>
          <ul className="kort divide-y divide-wine-900/10">
            {venter.map((m) => (
              <li key={m.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-display text-lg text-wine-900">{m.navn}</p>
                  <p className="text-sm font-sans text-ink-700/60">{m.epost}</p>
                </div>
                <button onClick={() => godkjenn(m.id)} className="btn-primary text-xs">
                  Godkjenn
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-display text-xl text-wine-700 mb-3 italic">
          Godkjente ({godkjente.length})
        </h3>
        <ul className="kort divide-y divide-wine-900/10">
          {godkjente.map((m) => (
            <li key={m.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-display text-lg text-wine-900">
                  {m.navn}
                  {m.er_admin && (
                    <span className="ml-2 text-xs uppercase tracking-wider font-sans text-wine-700">
                      Admin
                    </span>
                  )}
                </p>
                <p className="text-sm font-sans text-ink-700/60">{m.epost}</p>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => settAdmin(m.id, !m.er_admin)}
                  className="font-sans uppercase tracking-wider text-ink-700/70 hover:text-wine-700"
                >
                  {m.er_admin ? 'Fjern admin' : 'Gjør til admin'}
                </button>
                <button
                  onClick={() => fjernGodkjenning(m.id)}
                  className="font-sans uppercase tracking-wider text-ink-700/70 hover:text-wine-700"
                >
                  Fjern godkjenning
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
