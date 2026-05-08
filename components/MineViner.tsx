'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import Avatar from './Avatar';

interface VinIListe {
  id: string;
  status: 'drukket' | 'vil_prove';
  opprettet_at: string;
  medlemmer?: { id: string; navn: string };
  vinmonopol_produkter?: any;
}

interface ProduktSok {
  varenummer: string;
  navn: string;
  bilde_url?: string;
  pris?: number;
  hovedkategori?: string;
  land?: string;
}

export default function MineViner({
  brukerId,
  brukernavn,
}: {
  brukerId: string;
  brukernavn: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [tab, setTab] = useState<'mine' | 'alle'>('mine');
  const [statusFilter, setStatusFilter] = useState<'alle' | 'drukket' | 'vil_prove'>('alle');
  const [viner, setViner] = useState<VinIListe[]>([]);
  const [laster, setLaster] = useState(true);
  const [leggTilApen, setLeggTilApen] = useState(false);
  const [sok, setSok] = useState('');
  const [resultater, setResultater] = useState<ProduktSok[]>([]);
  const [sokLaster, setSokLaster] = useState(false);

  // Hent Mine viner / Alle viner
  useEffect(() => {
    async function hent() {
      setLaster(true);
      let query = supabase
        .from('mine_viner')
        .select(`
          id, status, opprettet_at,
          medlemmer (id, navn),
          vinmonopol_produkter (*)
        `)
        .order('opprettet_at', { ascending: false });

      if (tab === 'mine') {
        query = query.eq('medlem_id', brukerId);
      }

      const { data } = await query;
      setViner((data as any) || []);
      setLaster(false);
    }
    hent();
  }, [supabase, brukerId, tab]);

  // Søk i Vinmonopolet for å legge til ny vin
  useEffect(() => {
    if (sok.length < 2) {
      setResultater([]);
      return;
    }
    const t = setTimeout(async () => {
      setSokLaster(true);
      try {
        const res = await fetch(`/api/vinmonopolet/sok?q=${encodeURIComponent(sok)}`);
        const data = await res.json();
        setResultater(data.resultater || []);
      } catch {
        setResultater([]);
      } finally {
        setSokLaster(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [sok]);

  async function leggTil(produkt: ProduktSok, status: 'drukket' | 'vil_prove') {
    // Lagre vinen først (samme flyt som LeggTilVin)
    await fetch('/api/vinmonopolet/lagre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produkt),
    });

    await supabase.from('mine_viner').upsert({
      medlem_id: brukerId,
      varenummer: produkt.varenummer,
      status,
    }, { onConflict: 'medlem_id,varenummer' });

    setLeggTilApen(false);
    setSok('');
    setResultater([]);
    router.refresh();

    // Hent på nytt
    const { data } = await supabase
      .from('mine_viner')
      .select(`
        id, status, opprettet_at,
        medlemmer (id, navn),
        vinmonopol_produkter (*)
      `)
      .eq('medlem_id', brukerId)
      .order('opprettet_at', { ascending: false });
    setViner((data as any) || []);
  }

  async function fjern(id: string) {
    if (!confirm('Fjerne denne vinen fra listen din?')) return;
    await supabase.from('mine_viner').delete().eq('id', id);
    setViner((prev) => prev.filter((v) => v.id !== id));
  }

  async function endreStatus(id: string, ny: 'drukket' | 'vil_prove') {
    await supabase.from('mine_viner').update({ status: ny }).eq('id', id);
    setViner((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: ny } : v))
    );
  }

  const filtrert = viner.filter((v) => {
    if (statusFilter === 'alle') return true;
    return v.status === statusFilter;
  });

  // Grupper etter medlem hvis "Alle"-fanen
  const gruppert = tab === 'alle' ? filtrert.reduce((acc, v) => {
    const navn = v.medlemmer?.navn || 'Ukjent';
    if (!acc[navn]) acc[navn] = [];
    acc[navn].push(v);
    return acc;
  }, {} as Record<string, VinIListe[]>) : null;

  return (
    <div className="space-y-6">
      {/* Tab-velger */}
      <div className="flex gap-1 border-b border-wine-900/10">
        <button
          onClick={() => setTab('mine')}
          className={`px-4 py-2 font-sans text-sm transition border-b-2 ${
            tab === 'mine'
              ? 'border-wine-700 text-wine-800 font-medium'
              : 'border-transparent text-ink-700/60 hover:text-wine-700'
          }`}
        >
          Mine viner
        </button>
        <button
          onClick={() => setTab('alle')}
          className={`px-4 py-2 font-sans text-sm transition border-b-2 ${
            tab === 'alle'
              ? 'border-wine-700 text-wine-800 font-medium'
              : 'border-transparent text-ink-700/60 hover:text-wine-700'
          }`}
        >
          Alle medlemmer
        </button>
      </div>

      {/* Filter + Legg til */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {(['alle', 'drukket', 'vil_prove'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-sans uppercase tracking-wider px-3 py-1.5 rounded transition ${
                statusFilter === s
                  ? 'bg-wine-700 text-cream-50'
                  : 'text-ink-700/60 hover:text-wine-700'
              }`}
            >
              {s === 'alle' ? 'Alle' : s === 'drukket' ? '🍷 Drukket' : '⭐ Vil prøve'}
            </button>
          ))}
        </div>

        {tab === 'mine' && (
          <button
            onClick={() => setLeggTilApen(!leggTilApen)}
            className="btn-primary text-xs"
          >
            {leggTilApen ? 'Lukk' : '+ Legg til vin'}
          </button>
        )}
      </div>

      {/* Legg til-skjema */}
      {leggTilApen && tab === 'mine' && (
        <div className="kort p-5 space-y-4">
          <div>
            <label className="block text-sm font-sans uppercase tracking-wider text-ink-700/60 mb-1.5">
              Søk etter vin
            </label>
            <input
              type="text"
              value={sok}
              onChange={(e) => setSok(e.target.value)}
              className="input-field"
              placeholder="f.eks. Barolo eller varenummer"
              autoFocus
            />
          </div>

          {sokLaster && <p className="text-sm text-ink-700/60 italic">Søker …</p>}

          {resultater.length > 0 && (
            <ul className="divide-y divide-wine-900/10 max-h-96 overflow-y-auto">
              {resultater.map((p) => (
                <li key={p.varenummer} className="py-3 flex gap-3 items-center">
                  {p.bilde_url && (
                    <img src={p.bilde_url} alt="" className="w-10 h-14 object-contain flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm text-wine-900 truncate">{p.navn}</p>
                    <p className="text-xs font-sans text-ink-700/60">
                      {[p.hovedkategori, p.land, p.varenummer].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => leggTil(p, 'drukket')}
                      className="text-[10px] font-sans uppercase tracking-wider px-2 py-1 bg-wine-700 text-cream-50 rounded hover:bg-wine-800"
                    >
                      🍷 Drukket
                    </button>
                    <button
                      onClick={() => leggTil(p, 'vil_prove')}
                      className="text-[10px] font-sans uppercase tracking-wider px-2 py-1 bg-amber-700 text-cream-50 rounded hover:bg-amber-800"
                    >
                      ⭐ Vil prøve
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Innhold */}
      {laster ? (
        <p className="text-ink-700/60 italic">Laster …</p>
      ) : filtrert.length === 0 ? (
        <p className="text-ink-700/60 italic">
          {tab === 'mine'
            ? 'Du har ikke lagt til noen viner ennå.'
            : 'Ingen viner i listene ennå.'}
        </p>
      ) : tab === 'alle' && gruppert ? (
        // Gruppert visning per medlem
        <div className="space-y-6">
          {Object.entries(gruppert).map(([navn, items]) => (
            <div key={navn}>
              <div className="flex items-center gap-2 mb-3">
                <Avatar navn={navn} storrelse="medium" />
                <h3 className="font-display text-lg text-wine-900">{navn}</h3>
                <span className="text-xs font-sans text-ink-700/60">
                  ({items.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-11">
                {items.map((v) => (
                  <VinKort key={v.id} vin={v} kanRedigere={false} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Min liste
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtrert.map((v) => (
            <VinKort
              key={v.id}
              vin={v}
              kanRedigere={true}
              onEndre={(ny) => endreStatus(v.id, ny)}
              onFjern={() => fjern(v.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VinKort({
  vin,
  kanRedigere,
  onEndre,
  onFjern,
}: {
  vin: VinIListe;
  kanRedigere: boolean;
  onEndre?: (ny: 'drukket' | 'vil_prove') => void;
  onFjern?: () => void;
}) {
  const v = vin.vinmonopol_produkter;
  if (!v) return null;

  return (
    <div className="kort p-3 flex gap-3">
      {v.bilde_url && (
        <Link href={`/viner/${v.varenummer}`} className="flex-shrink-0">
          <img src={v.bilde_url} alt="" className="w-12 h-16 object-contain" />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <Link href={`/viner/${v.varenummer}`}>
          <p className="font-display text-sm text-wine-900 truncate hover:underline">
            {v.navn || `Varenr. ${v.varenummer}`}
          </p>
        </Link>
        <p className="text-xs font-sans text-ink-700/60 truncate">
          {[v.hovedkategori, v.land].filter(Boolean).join(' · ')}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-[10px] font-sans uppercase tracking-wider px-2 py-0.5 rounded ${
            vin.status === 'drukket'
              ? 'bg-wine-100 text-wine-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {vin.status === 'drukket' ? '🍷 Drukket' : '⭐ Vil prøve'}
          </span>
          {kanRedigere && (
            <div className="flex gap-1">
              <button
                onClick={() => onEndre?.(vin.status === 'drukket' ? 'vil_prove' : 'drukket')}
                className="text-[10px] text-ink-700/50 hover:text-wine-700"
                title="Bytt status"
              >
                ↔
              </button>
              <button
                onClick={onFjern}
                className="text-[10px] text-ink-700/50 hover:text-wine-700"
                title="Fjern"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
