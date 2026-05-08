'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Avatar from './Avatar';

interface MedlemMedStatus {
  medlem_id: string;
  status: 'drukket' | 'vil_prove';
  medlemmer: { navn: string };
}

export default function VinAktivitet({ varenummer }: { varenummer: string }) {
  const supabase = createClient();
  const [data, setData] = useState<MedlemMedStatus[]>([]);
  const [laster, setLaster] = useState(true);

  useEffect(() => {
    let aktiv = true;

    async function hent() {
      const { data: rader } = await supabase
        .from('mine_viner')
        .select('medlem_id, status, medlemmer(navn)')
        .eq('varenummer', varenummer);

      if (aktiv) {
        setData((rader as any) || []);
        setLaster(false);
      }
    }

    hent();

    const channel = supabase
      .channel(`vin-aktivitet-${varenummer}-${Math.random().toString(36).substring(2, 11)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mine_viner',
          filter: `varenummer=eq.${varenummer}`,
        },
        () => hent()
      )
      .subscribe();

    return () => {
      aktiv = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, varenummer]);

  if (laster) return null;

  const drukket = data.filter((d) => d.status === 'drukket');
  const vilProve = data.filter((d) => d.status === 'vil_prove');

  if (drukket.length === 0 && vilProve.length === 0) return null;

  return (
    <div className="kort p-5 space-y-4">
      <h3 className="font-display text-lg text-wine-900">Klubbens aktivitet</h3>

      {drukket.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-2">
            🍷 Har drukket ({drukket.length})
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {drukket.map((d) => (
              <div key={d.medlem_id} className="flex items-center gap-1.5">
                <Avatar navn={d.medlemmer?.navn} storrelse="liten" />
                <span className="text-sm font-sans text-ink-700">{d.medlemmer?.navn}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {vilProve.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider font-sans text-ink-700/60 mb-2">
            ⭐ Vil prøve ({vilProve.length})
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {vilProve.map((d) => (
              <div key={d.medlem_id} className="flex items-center gap-1.5">
                <Avatar navn={d.medlemmer?.navn} storrelse="liten" />
                <span className="text-sm font-sans text-ink-700">{d.medlemmer?.navn}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
