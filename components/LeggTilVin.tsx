'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import DelPaWhatsApp from './DelPaWhatsApp';
import Strekkodeskanner from './Strekkodeskanner';

interface Produkt {
  varenummer: string;
  navn: string;
  produkttype?: string;
  hovedkategori?: string;
  land?: string;
  pris?: number;
  bilde_url?: string;
  produsent?: string;
}

export default function LeggTilVin({
  klubbkveldId,
  redirectEtterLagring,
}: {
  klubbkveldId?: string;
  redirectEtterLagring?: string;
}) {
  const [apen, setApen] = useState(!klubbkveldId);
  const [sok, setSok] = useState('');
  const [resultater, setResultater] = useState<Produkt[]>([]);
  const [valgt, setValgt] = useState<Produkt | null>(null);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [nyligLagtTil, setNyligLagtTil] = useState<Produkt | null>(null);
  const [skannerApen, setSkannerApen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (sok.length < 2 || valgt) {
      setResultater([]);
      return;
    }
    const t = setTimeout(async () => {
      setLaster(true);
      try {
        const res = await fetch(`/api/vinmonopolet/sok?q=${encodeURIComponent(sok)}`);
        const data = await res.json();
        setResultater(data.resultater || []);
      } catch {
        setResultater([]);
      } finally {
        setLaster(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [sok, valgt]);

  async function leggTil() {
    if (!valgt) return;
    setFeil(null);
    setLaster(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFeil('Ikke innlogget.');
      setLaster(false);
      return;
    }

    const { data, error } = await supabase
      .from('smakinger')
      .insert({
        klubbkveld_id: klubbkveldId || null,
        varenummer: valgt.varenummer,
        tatt_med_av: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        setFeil('Denne vinen er allerede lagt til på denne klubbkvelden.');
      } else {
        setFeil(error.message);
      }
      setLaster(false);
      return;
    }

    if (redirectEtterLagring && data) {
      router.push(redirectEtterLagring.replace(':id', data.varenummer));
      setLaster(false);
      return;
    }

    if (klubbkveldId) {
      setNyligLagtTil(valgt);
      setValgt(null);
      setSok('');
      router.refresh();
    }
    setLaster(false);
  }

  function handleSkannet(produkt: Produkt) {
    setValgt(produkt);
    setSkannerApen(false);
    setSok('');
    setResultater([]);
  }

  if (skannerApen) {
    return (
      <Strekkodeskanner
        onTreff={handleSkannet}
        onLukk={() => setSkannerApen(false)}
      />
    );
  }

  if (nyligLagtTil) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const kveldUrl = `${baseUrl}/klubbkvelder/${klubbkveldId}`;
    let tekst = `🍷 Jeg tar med *${nyligLagtTil.navn}* på neste klubbkveld!`;
    const detaljer = [nyligLagtTil.hovedkategori, nyligLagtTil.land].filter(Boolean).join(' · ');
    if (detaljer) tekst += `\n${detaljer}`;
    if (nyligLagtTil.pris) tekst += `\n💰 ${Number(nyligLagtTil.pris).toFixed(0)} kr`;
    tekst += `\n\n${kveldUrl}`;

    return (
      <div className="kort p-6 space-y-4">
        <div className="flex items-start gap-4">
          {nyligLagtTil.bilde_url && (
            <img src={nyligLagtTil.bilde_url} alt="" className="w-16 h-24 object-contain" />
          )}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider font-sans text-wine-700 mb-1">
              Lagt til
            </p>
            <h4 className="font-display text-lg text-wine-900">{nyligLagtTil.navn}</h4>
            <p className="text-sm font-sans text-ink-700/60 mt-1">
              Vil du fortelle gruppa hvilken vin du tar med?
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <DelPaWhatsApp tekst={tekst} />
          <button
            onClick={() => setNyligLagtTil(null)}
            className="btn-secondary text-xs"
          >
            Lukk
          </button>
        </div>
      </div>
    );
  }

  if (!apen && klubbkveldId) {
    return (
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setApen(true)} className="btn-primary">
          + Legg til vin
        </button>
        <button onClick={() => setSkannerApen(true)} className="btn-secondary">
          📷 Skann strekkode
        </button>
      </div>
    );
  }

  return (
    <div className="kort p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-wine-900">
          {klubbkveldId ? 'Legg til vin på kvelden' : 'Legg til en vin'}
        </h3>
        {klubbkveldId && (
          <button
            onClick={() => { setApen(false); setValgt(null); setSok(''); setFeil(null); }}
            className="text-ink-700/50 hover:text-wine-700 text-sm font-sans"
          >
            Avbryt
          </button>
        )}
      </div>

      {!valgt ? (
        <>
          <div>
            <label className="block text-sm font-sans uppercase tracking-wider text-ink-700/60 mb-1.5">
              Søk etter navn eller varenummer
            </label>
            <input
              type="text"
              value={sok}
              onChange={(e) => setSok(e.target.value)}
              className="input-field"
              placeholder="f.eks. Barolo eller 1234567"
              autoFocus
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setSkannerApen(true)}
              className="btn-secondary text-xs flex items-center gap-2"
            >
              📷 Eller skann strekkode
            </button>
          </div>

          {laster && <p className="text-sm text-ink-700/60 italic">Søker …</p>}

          {resultater.length > 0 && (
            <ul className="divide-y divide-wine-900/10 max-h-96 overflow-y-auto">
              {resultater.map((p) => (
                <li key={p.varenummer}>
                  <button
                    onClick={() => setValgt(p)}
                    className="w-full text-left p-3 hover:bg-cream-100 flex gap-3 items-center transition"
                  >
                    {p.bilde_url && (
                      <img src={p.bilde_url} alt="" className="w-10 h-14 object-contain" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base text-wine-900 truncate">{p.navn}</p>
                      <p className="text-xs font-sans text-ink-700/60">
                        {[p.hovedkategori, p.land, p.varenummer].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {p.pris && (
                      <p className="text-sm text-wine-700 font-display">
                        {p.pris.toFixed(0)} kr
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {sok.length >= 2 && !laster && resultater.length === 0 && (
            <p className="text-sm text-ink-700/60 italic">
              Ingen treff. Prøv et annet søk eller skann strekkoden.
            </p>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4">
            {valgt.bilde_url && (
              <img src={valgt.bilde_url} alt="" className="w-20 h-28 object-contain" />
            )}
            <div className="flex-1">
              <h4 className="font-display text-lg text-wine-900">{valgt.navn}</h4>
              <p className="text-sm font-sans text-ink-700/60 mt-1">
                {[valgt.hovedkategori, valgt.land, valgt.produsent].filter(Boolean).join(' · ')}
              </p>
              {valgt.pris && (
                <p className="text-sm text-wine-700 font-display mt-1">
                  {valgt.pris.toFixed(2)} kr
                </p>
              )}
            </div>
          </div>

          {feil && (
            <p className="text-sm text-wine-700 bg-wine-50 px-3 py-2 rounded">{feil}</p>
          )}

          <div className="flex gap-3">
            <button onClick={leggTil} disabled={laster} className="btn-primary disabled:opacity-50">
              {laster ? 'Legger til …' : 'Legg til'}
            </button>
            <button onClick={() => setValgt(null)} className="btn-secondary">
              Velg en annen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
