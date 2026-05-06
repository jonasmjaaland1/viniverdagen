'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

interface SkanningResultat {
  varenummer: string;
  navn: string;
  pris?: number;
  bilde_url?: string;
  hovedkategori?: string;
  land?: string;
  produsent?: string;
}

export default function Strekkodeskanner({
  onTreff,
  onLukk,
}: {
  onTreff: (produkt: SkanningResultat) => void;
  onLukk: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const skannerRef = useRef<any>(null);
  const [status, setStatus] = useState<'laster' | 'klar' | 'skanner' | 'sokerOpp' | 'ingenTreff' | 'feil'>('laster');
  const [feilmelding, setFeilmelding] = useState<string>('');

  useEffect(() => {
    let aktiv = true;

    async function lastBibliotek() {
      if (typeof window === 'undefined') return;

      if (!window.Html5Qrcode) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Kunne ikke laste skanner-biblioteket'));
          document.head.appendChild(script);
        });
      }

      if (!aktiv) return;
      startSkanner();
    }

    async function startSkanner() {
      try {
        const Html5Qrcode = window.Html5Qrcode;

        await new Promise(resolve => setTimeout(resolve, 100));
        const container = document.getElementById('strekkode-skanner-container');
        if (!container) {
          throw new Error('Kunne ikke finne skanner-container');
        }

        const skanner = new Html5Qrcode('strekkode-skanner-container');
        skannerRef.current = skanner;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.7777778,
        };

        try {
          await skanner.start(
            { facingMode: 'environment' },
            config,
            handleSkanning,
            () => {}
          );
        } catch (e1: any) {
          console.log('Bakkamera ikke tilgjengelig, prøver standardkamera:', e1.message);

          try {
            const cameras = await Html5Qrcode.getCameras();
            if (!cameras || cameras.length === 0) {
              throw new Error('Fant ingen kamera på enheten.');
            }
            await skanner.start(
              cameras[0].id,
              config,
              handleSkanning,
              () => {}
            );
          } catch (e2: any) {
            throw e2;
          }
        }

        setStatus('skanner');
      } catch (e: any) {
        setStatus('feil');
        if (e.name === 'NotAllowedError' || e.message?.includes('Permission')) {
          setFeilmelding('Du må gi tilgang til kameraet for å skanne strekkode.');
        } else if (e.name === 'NotFoundError' || e.message?.includes('not found')) {
          setFeilmelding('Fant ikke noe kamera på denne enheten. Skanning fungerer best på mobil.');
        } else {
          setFeilmelding(e.message || 'Kunne ikke starte kamera.');
        }
      }
    }

    async function handleSkanning(decodedText: string) {
      if (skannerRef.current) {
        try {
          await skannerRef.current.stop();
          skannerRef.current = null;
        } catch {}
      }

      setStatus('sokerOpp');

      try {
        const res = await fetch(`/api/vinmonopolet/strekkode?ean=${encodeURIComponent(decodedText)}`);
        const data = await res.json();

        if (!data.produkt) {
          setStatus('ingenTreff');
          setFeilmelding(`Strekkode ${decodedText} ble ikke funnet hos Vinmonopolet.`);
          return;
        }

        onTreff({
          varenummer: data.produkt.varenummer,
          navn: data.produkt.navn,
          pris: data.produkt.pris,
          bilde_url: data.produkt.bilde_url,
          hovedkategori: data.produkt.hovedkategori,
          land: data.produkt.land,
          produsent: data.produkt.produsent,
        });
      } catch (e: any) {
        setStatus('feil');
        setFeilmelding('Klarte ikke å slå opp strekkoden: ' + e.message);
      }
    }

    lastBibliotek().catch(e => {
      setStatus('feil');
      setFeilmelding(e.message);
    });

    return () => {
      aktiv = false;
      if (skannerRef.current) {
        try {
          skannerRef.current.stop().catch(() => {});
        } catch {}
        skannerRef.current = null;
      }
    };
  }, [onTreff]);

  async function lukkSkanner() {
    if (skannerRef.current) {
      try {
        await skannerRef.current.stop();
      } catch {}
      skannerRef.current = null;
    }
    onLukk();
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/95 flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-cream-50/10">
        <h2 className="font-display text-xl text-cream-50">Skann strekkode</h2>
        <button
          onClick={lukkSkanner}
          className="text-cream-50/80 hover:text-cream-50 text-sm font-sans uppercase tracking-wider"
        >
          Avbryt
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative">
        {status === 'laster' && (
          <p className="text-cream-50/80 italic">Starter kamera …</p>
        )}

        <div className="w-full max-w-md" style={{ display: (status === 'skanner' || status === 'sokerOpp') ? 'block' : 'none' }}>
          <div
            id="strekkode-skanner-container"
            ref={containerRef}
            className="w-full rounded overflow-hidden bg-black"
          />
          <p className="text-cream-50/80 text-center mt-4 italic text-sm">
            {status === 'sokerOpp'
              ? 'Søker opp vinen …'
              : 'Hold strekkoden innenfor ruten'}
          </p>
        </div>

        {status === 'ingenTreff' && (
          <div className="text-center max-w-md">
            <p className="font-display text-2xl text-cream-50 mb-3">Ingen treff</p>
            <p className="text-cream-50/70 mb-6">{feilmelding}</p>
            <p className="text-sm text-cream-50/60 mb-6 italic">
              Strekkoden finnes ikke hos Vinmonopolet, eller produktet er ikke i deres database.
              Du kan prøve å søke på navn i stedet.
            </p>
            <button onClick={lukkSkanner} className="btn-primary">
              Tilbake
            </button>
          </div>
        )}

        {status === 'feil' && (
          <div className="text-center max-w-md">
            <p className="font-display text-2xl text-cream-50 mb-3">Noe gikk galt</p>
            <p className="text-cream-50/70 mb-6">{feilmelding}</p>
            <button onClick={lukkSkanner} className="btn-primary">
              Lukk
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
