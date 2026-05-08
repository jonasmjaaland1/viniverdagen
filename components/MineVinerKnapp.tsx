'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function MineVinerKnapp({
  varenummer,
  brukerId,
}: {
  varenummer: string;
  brukerId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [status, setStatus] = useState<'drukket' | 'vil_prove' | null>(null);
  const [laster, setLaster] = useState(true);
  const [oppdaterer, setOppdaterer] = useState(false);

  useEffect(() => {
    async function hent() {
      const { data } = await supabase
        .from('mine_viner')
        .select('status')
        .eq('medlem_id', brukerId)
        .eq('varenummer', varenummer)
        .maybeSingle();
      setStatus((data?.status as any) || null);
      setLaster(false);
    }
    hent();
  }, [supabase, brukerId, varenummer]);

  async function oppdaterStatus(nyStatus: 'drukket' | 'vil_prove' | null) {
    setOppdaterer(true);

    if (nyStatus === null) {
      // Fjern fra Mine viner
      await supabase
        .from('mine_viner')
        .delete()
        .eq('medlem_id', brukerId)
        .eq('varenummer', varenummer);
    } else {
      // Sett ny status (upsert)
      await supabase
        .from('mine_viner')
        .upsert({
          medlem_id: brukerId,
          varenummer,
          status: nyStatus,
        }, { onConflict: 'medlem_id,varenummer' });
    }

    setStatus(nyStatus);
    setOppdaterer(false);
    router.refresh();
  }

  if (laster) {
    return (
      <div className="flex gap-2">
        <div className="w-32 h-9 bg-cream-100 rounded animate-pulse"></div>
        <div className="w-32 h-9 bg-cream-100 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => oppdaterStatus(status === 'drukket' ? null : 'drukket')}
        disabled={oppdaterer}
        className={`text-xs font-sans uppercase tracking-wider px-3 py-2 rounded transition disabled:opacity-50 ${
          status === 'drukket'
            ? 'bg-wine-700 text-cream-50'
            : 'border border-wine-700/30 text-wine-700 hover:bg-wine-50'
        }`}
      >
        🍷 {status === 'drukket' ? 'Drukket ✓' : 'Marker som drukket'}
      </button>

      <button
        onClick={() => oppdaterStatus(status === 'vil_prove' ? null : 'vil_prove')}
        disabled={oppdaterer}
        className={`text-xs font-sans uppercase tracking-wider px-3 py-2 rounded transition disabled:opacity-50 ${
          status === 'vil_prove'
            ? 'bg-amber-700 text-cream-50'
            : 'border border-amber-700/30 text-amber-700 hover:bg-amber-50'
        }`}
      >
        ⭐ {status === 'vil_prove' ? 'På ønskelisten ✓' : 'Vil prøve'}
      </button>
    </div>
  );
}
