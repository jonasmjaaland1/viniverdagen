'use client';

import { useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function base64TilUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Riktig = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Riktig);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view as Uint8Array<ArrayBuffer>;
}

function gjettEnhetsnavn(): string {
  if (typeof navigator === 'undefined') return 'Ukjent enhet';
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'Ukjent enhet';
}

export default function VarslerKnapp() {
  const [stotter, setStotter] = useState<boolean | null>(null);
  const [aktivert, setAktivert] = useState(false);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [iosInstallasjonNodvendig, setIosInstallasjonNodvendig] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const harService = 'serviceWorker' in navigator;
    const harPush = 'PushManager' in window;
    const harNotification = 'Notification' in window;

    const erIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const erStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (erIos && !erStandalone) {
      setStotter(false);
      setIosInstallasjonNodvendig(true);
      return;
    }

    setStotter(harService && harPush && harNotification);

    if (harService && harPush) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setAktivert(!!sub);
        });
      });
    }
  }, []);

  async function aktiverVarsler() {
    setLaster(true);
    setFeil(null);

    try {
      const tillatelse = await Notification.requestPermission();
      if (tillatelse !== 'granted') {
        setFeil('Du må gi tilgang til varsler.');
        setLaster(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const abonnement = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64TilUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const res = await fetch('/api/push/abonner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          abonnement: abonnement.toJSON(),
          enhetsnavn: gjettEnhetsnavn(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.feil || 'Kunne ikke lagre abonnement');
      }

      setAktivert(true);
    } catch (e: any) {
      setFeil(e.message);
    } finally {
      setLaster(false);
    }
  }

  async function deaktiverVarsler() {
    setLaster(true);
    setFeil(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        await fetch('/api/push/abonner', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }

      setAktivert(false);
    } catch (e: any) {
      setFeil(e.message);
    } finally {
      setLaster(false);
    }
  }

  async function testVarsel() {
    setTestStatus('Sender testvarsel ...');
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTestStatus('Testvarsel sendt! Sjekk at det dukker opp.');
        setTimeout(() => setTestStatus(null), 5000);
      } else {
        setTestStatus('Feil: ' + (data.feil || 'ukjent'));
      }
    } catch (e: any) {
      setTestStatus('Feil: ' + e.message);
    }
  }

  if (iosInstallasjonNodvendig) {
    return (
      <div className="kort p-5 bg-cream-100/50">
        <h3 className="font-display text-lg text-wine-900 mb-2">📱 Push-varsler</h3>
        <p className="text-sm font-sans text-ink-700/80 mb-3">
          For å få push-varsler på iPhone må du legge appen til på hjem-skjermen først:
        </p>
        <ol className="text-sm font-sans text-ink-700/80 space-y-1.5 list-decimal list-inside">
          <li>Trykk på del-knappen <span className="text-wine-700">⎋</span> nederst i Safari</li>
          <li>Scroll ned og velg <strong>"Legg til på Hjem-skjerm"</strong></li>
          <li>Åpne appen fra hjem-skjermen</li>
          <li>Aktiver varsler herfra</li>
        </ol>
      </div>
    );
  }

  if (stotter === false) {
    return (
      <div className="kort p-5">
        <p className="text-sm text-ink-700/70">
          Push-varsler støttes ikke i denne nettleseren.
        </p>
      </div>
    );
  }

  if (stotter === null) {
    return null;
  }

  return (
    <div className="kort p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <h3 className="font-display text-lg text-wine-900">Push-varsler</h3>
          <p className="text-sm font-sans text-ink-700/70 mt-1">
            {aktivert
              ? 'Du får varsler når noen sender melding eller andre ting skjer i appen.'
              : 'Få varsler om nye meldinger og hendelser i klubben, selv når appen er lukket.'}
          </p>

          {feil && (
            <p className="text-sm text-wine-700 mt-2">{feil}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {aktivert ? (
              <>
                <button
                  onClick={deaktiverVarsler}
                  disabled={laster}
                  className="btn-secondary text-xs disabled:opacity-50"
                >
                  {laster ? 'Deaktiverer …' : 'Slå av varsler'}
                </button>
                <button
                  onClick={testVarsel}
                  className="btn-secondary text-xs"
                >
                  Test varsel
                </button>
              </>
            ) : (
              <button
                onClick={aktiverVarsler}
                disabled={laster}
                className="btn-primary disabled:opacity-50"
              >
                {laster ? 'Aktiverer …' : 'Aktiver varsler'}
              </button>
            )}
          </div>

          {testStatus && (
            <p className="text-sm text-ink-700/70 italic mt-3">{testStatus}</p>
          )}
        </div>
      </div>
    </div>
  );
}
