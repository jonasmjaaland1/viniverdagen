"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "viniverdagen_installer_avvist";
const SKJUL_DAGER = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallerBanner() {
  const [vis, setVis] = useState(false);
  const [erIPhone, setErIPhone] = useState(false);
  const [visIPhoneGuide, setVisIPhoneGuide] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const erStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (erStandalone) return;

    const avvistTidsstempel = localStorage.getItem(STORAGE_KEY);
    if (avvistTidsstempel) {
      const dagerSiden =
        (Date.now() - parseInt(avvistTidsstempel)) / (1000 * 60 * 60 * 24);
      if (dagerSiden < SKJUL_DAGER) return;
    }

    const ua = window.navigator.userAgent;
    const erIOS = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    setErIPhone(erIOS);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    setVis(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  function avvis() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setVis(false);
    setVisIPhoneGuide(false);
  }

  async function installer() {
    if (erIPhone) {
      setVisIPhoneGuide(true);
      return;
    }

    if (installEvent) {
      await installEvent.prompt();
      const result = await installEvent.userChoice;
      if (result.outcome === "accepted") {
        setVis(false);
      }
      setInstallEvent(null);
    } else {
      setVisIPhoneGuide(true);
    }
  }

  if (!vis) return null;

  return (
    <>
      <div className="bg-wine-700 text-cream-50 px-4 py-3 flex items-center gap-3 shadow-md">
        <div className="text-2xl flex-shrink-0">📱</div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm sm:text-base leading-tight">
            Installer VinIverdagen
          </p>
          <p className="text-xs text-cream-50/80 mt-0.5 hidden sm:block">
            Få push-varsler og rask tilgang fra hjemskjermen
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={installer}
            className="bg-cream-50 text-wine-800 text-xs font-sans uppercase tracking-wider px-3 py-1.5 rounded hover:bg-cream-100 transition whitespace-nowrap"
          >
            Installer
          </button>
          <button
            onClick={avvis}
            aria-label="Lukk"
            className="text-cream-50/80 hover:text-cream-50 text-xl leading-none px-1 transition"
          >
            ×
          </button>
        </div>
      </div>

      {visIPhoneGuide && (
        <div
          className="fixed inset-0 z-[60] bg-ink-900/80 flex items-end sm:items-center justify-center p-4"
          onClick={() => setVisIPhoneGuide(false)}
        >
          <div
            className="bg-cream-50 rounded-lg max-w-md w-full p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl text-wine-900">
                  Installer på {erIPhone ? "iPhone" : "enheten"}
                </h3>
                <p className="text-sm text-ink-700/70 mt-1">
                  Følg disse 3 stegene
                </p>
              </div>
              <button
                onClick={() => setVisIPhoneGuide(false)}
                className="text-ink-700/50 hover:text-wine-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <ol className="space-y-4">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-wine-700 text-cream-50 font-display text-base flex items-center justify-center">
                  1
                </span>
                <div className="flex-1">
                  <p className="font-sans text-sm text-ink-700">
                    Trykk på{" "}
                    <span className="font-display text-wine-700">
                      Del-knappen
                    </span>
                  </p>
                  <p className="text-xs text-ink-700/60 mt-1 italic">
                    {erIPhone
                      ? "Firkantet ikon med pil opp, nederst i Safari"
                      : "Tre prikker eller del-ikonet i nettleseren"}
                  </p>
                </div>
              </li>

              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-wine-700 text-cream-50 font-display text-base flex items-center justify-center">
                  2
                </span>
                <div className="flex-1">
                  <p className="font-sans text-sm text-ink-700">
                    Velg{" "}
                    <span className="font-display text-wine-700">
                      "Legg til på Hjem-skjerm"
                    </span>
                  </p>
                  <p className="text-xs text-ink-700/60 mt-1 italic">
                    {erIPhone
                      ? "Scroll ned i menyen om nødvendig"
                      : 'Eller "Installer app"'}
                  </p>
                </div>
              </li>

              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-wine-700 text-cream-50 font-display text-base flex items-center justify-center">
                  3
                </span>
                <div className="flex-1">
                  <p className="font-sans text-sm text-ink-700">
                    Åpne appen fra{" "}
                    <span className="font-display text-wine-700">
                      hjemskjermen
                    </span>
                  </p>
                  <p className="text-xs text-ink-700/60 mt-1 italic">
                    Da kan du motta push-varsler om nye chat-meldinger og
                    klubbkvelder 🍷
                  </p>
                </div>
              </li>
            </ol>

            <div className="pt-4 border-t border-wine-900/10 flex gap-2">
              <button
                onClick={() => setVisIPhoneGuide(false)}
                className="flex-1 btn-primary text-sm"
              >
                Skjønner!
              </button>
              <button
                onClick={avvis}
                className="text-xs text-ink-700/60 px-3 hover:text-wine-700 transition"
              >
                Ikke nå
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
