"use client";

import { useEffect, useRef, useState } from "react";

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<
    "laster" | "skanner" | "sokerOpp" | "ingenTreff" | "feil"
  >("laster");
  const [feilmelding, setFeilmelding] = useState<string>("");
  const [manuellInput, setManuellInput] = useState("");
  const [visManuell, setVisManuell] = useState(false);

  useEffect(() => {
    let aktiv = true;

    async function start() {
      try {
        // Importer ZXing dynamisk
        const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } =
          await import("@zxing/library");

        if (!aktiv) return;

        // Konfigurer hva vi skal lese - primært vinflaske-strekkoder
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const codeReader = new BrowserMultiFormatReader(hints);
        codeReaderRef.current = codeReader;

        // Få tilgang til bakkamera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!aktiv) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Vent på at video-elementet er rendret
        await new Promise((r) => setTimeout(r, 100));
        if (!aktiv) return;

        const video = document.getElementById(
          "zxing-video",
        ) as HTMLVideoElement;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          throw new Error("Kunne ikke finne video-element");
        }

        videoRef.current = video;
        video.srcObject = stream;
        await video.play();

        setStatus("skanner");

        // Start kontinuerlig skanning
        codeReader.decodeFromVideoDevice(
          undefined,
          video,
          (result: any, err: any) => {
            if (result && aktiv) {
              const kode = result.getText();
              handleSkanning(kode);
            }
            // Ignorer 'NotFoundException' - det betyr bare ingen kode i bildet ennå
          },
        );
      } catch (e: any) {
        if (!aktiv) return;
        setStatus("feil");
        if (e.name === "NotAllowedError" || e.message?.includes("Permission")) {
          setFeilmelding(
            "Du må gi tilgang til kameraet for å skanne strekkode.",
          );
        } else if (
          e.name === "NotFoundError" ||
          e.message?.includes("not found")
        ) {
          setFeilmelding("Fant ikke noe kamera på denne enheten.");
        } else {
          setFeilmelding(e.message || "Kunne ikke starte kamera.");
        }
      }
    }

    async function handleSkanning(kode: string) {
      // Stopp skanner
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch {}
        codeReaderRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      setStatus("sokerOpp");

      try {
        const res = await fetch(
          `/api/vinmonopolet/strekkode?ean=${encodeURIComponent(kode)}`,
        );
        const data = await res.json();

        if (!data.produkt) {
          setStatus("ingenTreff");
          setFeilmelding(`Strekkode ${kode} ble ikke funnet hos Vinmonopolet.`);
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
        setStatus("feil");
        setFeilmelding("Klarte ikke å slå opp strekkoden: " + e.message);
      }
    }

    start();

    return () => {
      aktiv = false;
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch {}
        codeReaderRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [onTreff]);

  async function lukkSkanner() {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch {}
      codeReaderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    onLukk();
  }

  async function sendManuell() {
    const kode = manuellInput.trim();
    if (!kode) return;

    setStatus("sokerOpp");
    setVisManuell(false);

    try {
      let res = await fetch(
        `/api/vinmonopolet/strekkode?ean=${encodeURIComponent(kode)}`,
      );
      let data = await res.json();

      if (!data.produkt) {
        res = await fetch(
          `/api/vinmonopolet/sok?q=${encodeURIComponent(kode)}`,
        );
        data = await res.json();
        if (data.resultater && data.resultater.length > 0) {
          data.produkt = data.resultater[0];
        }
      }

      if (!data.produkt) {
        setStatus("ingenTreff");
        setFeilmelding(`"${kode}" ble ikke funnet.`);
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
      setStatus("feil");
      setFeilmelding("Klarte ikke å slå opp: " + e.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/95 flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-cream-50/10 bg-ink-900">
        <h2 className="font-display text-xl text-cream-50">Skann strekkode</h2>
        <button
          onClick={lukkSkanner}
          className="text-cream-50 text-sm font-sans uppercase tracking-wider px-3 py-1 border border-cream-50/30 rounded"
        >
          Avbryt
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-auto">
        {status === "laster" && (
          <p className="text-cream-50/80 italic">Starter kamera …</p>
        )}

        <div
          className="w-full max-w-md"
          style={{
            display:
              status === "skanner" ||
              status === "sokerOpp" ||
              status === "laster"
                ? "block"
                : "none",
          }}
        >
          <div
            className="relative"
            style={{
              background: "#000",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <video
              id="zxing-video"
              playsInline
              muted
              autoPlay
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "60vh",
                display: "block",
                objectFit: "cover",
              }}
            />

            {(status === "skanner" || status === "sokerOpp") && (
              <>
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: "30%",
                    left: "10%",
                    right: "10%",
                    bottom: "30%",
                    border: "2px solid rgba(125, 44, 58, 0.9)",
                    borderRadius: "8px",
                  }}
                />
                <div
                  className="absolute left-[12%] right-[12%] h-0.5 bg-wine-700 pointer-events-none"
                  style={{
                    top: "50%",
                    animation: "skannLinje 1.5s ease-in-out infinite alternate",
                    boxShadow: "0 0 8px rgba(125, 44, 58, 0.8)",
                  }}
                />
              </>
            )}
          </div>

          {(status === "skanner" || status === "sokerOpp") && (
            <>
              <p className="text-cream-50/80 text-center mt-4 italic text-sm">
                {status === "sokerOpp"
                  ? "Søker opp vinen …"
                  : "Hold strekkoden innenfor ruten"}
              </p>

              <div className="text-center mt-4">
                <button
                  onClick={() => setVisManuell(true)}
                  className="text-xs text-cream-50/70 underline"
                >
                  Fungerer ikke? Skriv inn varenummer eller strekkode manuelt
                </button>
              </div>
            </>
          )}
        </div>

        {visManuell && (
          <div className="absolute inset-0 bg-ink-900/95 flex items-center justify-center p-4 z-10">
            <div className="bg-cream-50 rounded-lg p-6 max-w-md w-full">
              <h3 className="font-display text-xl text-wine-900 mb-3">
                Skriv inn manuelt
              </h3>
              <p className="text-sm text-ink-700/70 mb-4">
                Skriv inn strekkode (EAN) eller varenummer fra Vinmonopolet
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={manuellInput}
                onChange={(e) => setManuellInput(e.target.value)}
                className="input-field"
                placeholder="f.eks. 16370001"
                autoFocus
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={sendManuell}
                  disabled={!manuellInput.trim()}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  Søk
                </button>
                <button
                  onClick={() => setVisManuell(false)}
                  className="btn-secondary text-sm"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        )}

        {status === "ingenTreff" && (
          <div className="text-center max-w-md">
            <p className="font-display text-2xl text-cream-50 mb-3">
              Ingen treff
            </p>
            <p className="text-cream-50/70 mb-6">{feilmelding}</p>
            <p className="text-sm text-cream-50/60 mb-6 italic">
              Strekkoden finnes ikke hos Vinmonopolet, eller produktet er ikke i
              deres database. Du kan prøve å søke på navn i stedet.
            </p>
            <button
              onClick={() => setVisManuell(true)}
              className="btn-secondary text-sm mb-3 mr-2"
            >
              Prøv igjen manuelt
            </button>
            <button onClick={lukkSkanner} className="btn-primary">
              Tilbake
            </button>
          </div>
        )}

        {status === "feil" && (
          <div className="text-center max-w-md">
            <p className="font-display text-2xl text-cream-50 mb-3">
              Noe gikk galt
            </p>
            <p className="text-cream-50/70 mb-6">{feilmelding}</p>
            <button
              onClick={() => setVisManuell(true)}
              className="btn-secondary text-sm mb-3 mr-2"
            >
              Skriv inn manuelt
            </button>
            <button onClick={lukkSkanner} className="btn-primary">
              Lukk
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes skannLinje {
          0% {
            top: 32%;
          }
          100% {
            top: 68%;
          }
        }
      `}</style>
    </div>
  );
}
