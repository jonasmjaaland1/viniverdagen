'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import DelPaWhatsApp from './DelPaWhatsApp';
import FotoAvEtikett from './FotoAvEtikett';
import SmaksHjelper from './SmaksHjelper';

interface Produkt {
  varenummer: string;
  navn: string;
  produkttype?: string;
  hovedkategori?: string;
  land?: string;
  distrikt?: string;
  pris?: number;
  bilde_url?: string;
  produsent?: string;
  smak?: string;
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
  const [henterDetaljer, setHenterDetaljer] = useState(false);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [nyligLagtTil, setNyligLagtTil] = useState<Produkt | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [kommentar, setKommentar] = useState('');
  const [visFotoAvEtikett, setVisFotoAvEtikett] = useState(false);
  const [visSmaksHjelper, setVisSmaksHjelper] = useState(false);
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

  async function velgVin(produkt: Produkt) {
    if (produkt.pris) {
      setValgt(produkt);
      return;
    }
    setValgt(produkt);
    setHenterDetaljer(true);
    try {
      const res = await fetch(`/api/vinmonopolet/detaljer?varenummer=${encodeURIComponent(produkt.varenummer)}`);
      const data = await res.json();
      if (data.produkt) {
        setValgt(data.produkt);
      }
    } catch {
      // Behold den minimale visningen
    } finally {
      setHenterDetaljer(false);
    }
  }

  function fotoTreff(produkt: Produkt) {
    setVisFotoAvEtikett(false);
    velgVin(produkt);
  }

  function smaksForslag(tekst: string) {
    setKommentar(tekst);
    setVisSmaksHjelper(false);
  }

  async function leggTil() {
    if (!valgt) return;

    if (!score) {
      setFeil('Du må gi en karakter (1-10).');
      return;
    }
    if (!kommentar.trim()) {
      setFeil('Du må skrive en kommentar om vinen.');
      return;
    }

    setFeil(null);
    setLaster(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFeil('Ikke innlogget.');
      setLaster(false);
      return;
    }

    try {
      const lagreRes = await fetch('/api/vinmonopolet/lagre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valgt),
      });
      const lagreData = await lagreRes.json();
      if (!lagreRes.ok) {
        setFeil(lagreData.feil || 'Kunne ikke lagre vin-data');
        setLaster(false);
        return;
      }
    } catch (e: any) {
      setFeil('Kunne ikke lagre vin-data: ' + e.message);
      setLaster(false);
      return;
    }

    if (!klubbkveldId) {
      const { data: eksisterende } = await supabase
        .from('smakinger')
        .select('id, varenummer')
        .is('klubbkveld_id', null)
        .eq('varenummer', valgt.varenummer)
        .maybeSingle();

      if (eksisterende) {
        if (redirectEtterLagring) {
          router.push(redirectEtterLagring.replace(':id', valgt.varenummer));
          return;
        }
        setFeil('Denne vinen er allerede lagt til.');
        setLaster(false);
        return;
      }
    }

    const { data: smaking, error } = await supabase
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

    if (smaking) {
      await supabase.from('scorer').insert({
        smaking_id: smaking.id,
        medlem_id: user.id,
        score,
      });

      await supabase.from('kommentarer').insert({
        smaking_id: smaking.id,
        medlem_id: user.id,
        tekst: kommentar.trim(),
      });
    }

    if (redirectEtterLagring && smaking) {
      router.push(redirectEtterLagring.replace(':id', smaking.varenummer));
      setLaster(false);
      return;
    }

    if (klubbkveldId) {
      setNyligLagtTil(valgt);
      setValgt(null);
      setSok('');
      setScore(null);
      setKommentar('');
      router.refresh();
    }
    setLaster(false);
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
      <button onClick={() => setApen(true)} className="btn-primary">
        + Legg til vin
      </button>
    );
  }

  return (
    <>
      {visFotoAvEtikett && (
        <FotoAvEtikett
          onTreff={fotoTreff}
          onLukk={() => setVisFotoAvEtikett(false)}
        />
      )}

      {visSmaksHjelper && valgt && (
        <SmaksHjelper
          vinKontekst={{
            navn: valgt.navn,
            type: valgt.hovedkategori,
            land: valgt.land,
          }}
          onLagre={smaksForslag}
          onLukk={() => setVisSmaksHjelper(false)}
        />
      )}

      <div className="kort p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-wine-900">
            {klubbkveldId ? 'Legg til vin på kvelden' : 'Legg til en vin'}
          </h3>
          {klubbkveldId && (
            <button
              onClick={() => {
                setApen(false);
                setValgt(null);
                setSok('');
                setFeil(null);
                setScore(null);
                setKommentar('');
              }}
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
              <p className="text-xs text-ink-700/50 italic mt-1.5">
                Tips: Du kan finne varenummer på Vinmonopolet.no eller på flasken
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-wine-900/10" />
              <span className="text-xs font-sans uppercase tracking-wider text-ink-700/40">eller</span>
              <div className="flex-1 h-px bg-wine-900/10" />
            </div>

            <button
              onClick={() => setVisFotoAvEtikett(true)}
              className="w-full py-3 px-4 bg-cream-100 hover:bg-cream-200 text-wine-800 font-display rounded-lg transition flex items-center justify-center gap-2 border border-wine-900/10"
            >
              📷 Ta bilde av etiketten
            </button>

            {laster && <p className="text-sm text-ink-700/60 italic">Søker …</p>}

            {resultater.length > 0 && (
              <ul className="divide-y divide-wine-900/10 max-h-96 overflow-y-auto">
                {resultater.map((p) => (
                  <li key={p.varenummer}>
                    <button
                      onClick={() => velgVin(p)}
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
                Ingen treff. Prøv et annet søk.
              </p>
            )}
          </>
        ) : (
          <div className="space-y-5">
            <div className="flex gap-4">
              {valgt.bilde_url && (
                <img src={valgt.bilde_url} alt="" className="w-20 h-28 object-contain" />
              )}
              <div className="flex-1">
                <h4 className="font-display text-lg text-wine-900">{valgt.navn}</h4>
                {henterDetaljer ? (
                  <p className="text-sm font-sans text-ink-700/60 italic mt-1">
                    Henter detaljer …
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-sans text-ink-700/60 mt-1">
                      {[valgt.hovedkategori, valgt.land, valgt.produsent].filter(Boolean).join(' · ')}
                    </p>
                    {valgt.pris && (
                      <p className="text-sm text-wine-700 font-display mt-1">
                        {valgt.pris.toFixed(2)} kr
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-wine-900/10">
              <label className="block text-sm font-sans uppercase tracking-wider text-ink-700/60 mb-2">
                Din karakter <span className="text-wine-700">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScore(n)}
                    className={`w-10 h-10 rounded-full font-display text-lg transition ${
                      score === n
                        ? 'bg-wine-700 text-cream-50'
                        : 'bg-cream-100 text-wine-800 hover:bg-cream-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-sans uppercase tracking-wider text-ink-700/60">
                  Din anmeldelse <span className="text-wine-700">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setVisSmaksHjelper(true)}
                  className="text-xs font-sans text-wine-700 hover:text-wine-900 flex items-center gap-1 transition"
                >
                  ✨ AI-hjelper
                </button>
              </div>
              <textarea
                value={kommentar}
                onChange={(e) => setKommentar(e.target.value)}
                placeholder="Hva synes du om vinen? Smaksopplevelse, hva den passer til, anbefaler du den …"
                rows={3}
                className="input-field resize-none"
              />
              <p className="text-xs text-ink-700/50 font-sans mt-1.5 italic">
                Tips: Klikk ✨ AI-hjelper hvis du har enkle stikkord men trenger hjelp til å skrive
              </p>
            </div>

            {feil && (
              <p className="text-sm text-wine-700 bg-wine-50 px-3 py-2 rounded">{feil}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={leggTil}
                disabled={laster || henterDetaljer || !score || !kommentar.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {laster ? 'Legger til …' : 'Legg til vin'}
              </button>
              <button
                onClick={() => {
                  setValgt(null);
                  setScore(null);
                  setKommentar('');
                  setFeil(null);
                }}
                className="btn-secondary"
              >
                Velg en annen
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
