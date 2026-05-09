"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Html5Qrcode: any;
    BarcodeDetector: any;
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
  const skannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorAktiv = useRef(false);
  const [status, setStatus] = useState<
    "laster" | "klar" | "skanner" | "sokerOpp" | "ingenTreff" | "feil"
  >("laster");
  const [feilmelding, setFeilmelding] = useState<string>("");
  const [manuellInput, setManuellInput] = useState("");
  const [visManuell, setVisManuell] = useState(false);

  useEffect(() => {
    let aktiv = true;

    async function start() {
      try {
        // Fall direkte tilbake til html5-qrcode hvis BarcodeDetector ikke er stabilt tilgjengelig
        const harBarcodeDetector =
          typeof window !== "undefined" &&
          "BarcodeDetector" in window &&
          // BarcodeDetector er kun stabilt i Safari 16.4+ og Chrome (Android)
          /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (harBarcodeDetector) {
          try {
            await startBarcodeDetector();
            return;
          } catch (e) {
            console.log(
              "BarcodeDetector feilet, faller tilbake til html5-qrcode",
            );
          }
        }

        // Fallback til html5-qrcode (fungerer overalt)
        await lastHtml5Qrcode();
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

    async function startBarcodeDetector() {
      const detector = new (window as any).BarcodeDetector({
        formats: ["ean_13", "upc_a", "ean_8", "code_128", "code_39"],
      });

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

      await new Promise((r) => setTimeout(r, 100));
      const video = document.getElementById(
        "strekkode-video",
      ) as HTMLVideoElement;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error("Kunne ikke finne video-element");
      }

      videoRef.current = video;
      video.srcObject = stream;
      await video.play();

      setStatus("skanner");
      detectorAktiv.current = true;

      const skann = async () => {
        if (!detectorAktiv.current || !videoRef.current) return;
        try {
          const koder = await detector.detect(videoRef.current);
          if (koder.length > 0) {
            const kode = koder[0].rawValue;
            detectorAktiv.current = false;
            await handleSkanning(kode);
            return;
          }
        } catch {
          // Ignorer enkelt-feil og fortsett
        }
        if (detectorAktiv.current) {
          requestAnimationFrame(skann);
        }
      };
      requestAnimationFrame(skann);
    }

    async function lastHtml5Qrcode() {
      if (!window.Html5Qrcode) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Kunne ikke laste skanner-biblioteket"));
          document.head.appendChild(script);
        });
      }

      if (!aktiv) return;

      const Html5Qrcode = window.Html5Qrcode;
      await new Promise((resolve) => setTimeout(resolve, 200));

      const container = document.getElementById("strekkode-skanner-container");
      if (!container) {
        throw new Error("Kunne ikke finne skanner-container");
      }

      const skanner = new Html5Qrcode("strekkode-skanner-container");
      skannerRef.current = skanner;

      const config: any = {
        fps: 30,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.33,
        videoConstraints: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      let started = false;
      try {
        await skanner.start(
          { facingMode: "environment" },
          config,
          handleSkanning,
          () => {},
        );
        started = true;
      } catch (e1) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (!cameras || cameras.length === 0) {
            throw new Error("Fant ingen kamera på enheten.");
          }
          const bakkamera =
            cameras.find((c: any) => /back|rear|environment/i.test(c.label)) ||
            cameras[cameras.length - 1];
          await skanner.start(bakkamera.id, config, handleSkanning, () => {});
          started = true;
        } catch (e2) {
          throw e2;
        }
      }

      if (started) {
        setTimeout(() => {
          const video = document.querySelector(
            "#strekkode-skanner-container video",
          ) as HTMLVideoElement;
          if (video) {
            video.style.width = "100%";
            video.style.height = "auto";
            video.style.maxHeight = "60vh";
            video.style.display = "block";
            video.style.objectFit = "cover";
          }
        }, 300);
      }

      setStatus("skanner");
    }

    async function handleSkanning(kode: string) {
      detectorAktiv.current = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (skannerRef.current) {
        try {
          await skannerRef.current.stop();
          skannerRef.current = null;
        } catch {}
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
      detectorAktiv.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (skannerRef.current) {
        try {
          skannerRef.current.stop().catch(() => {});
        } catch {}
        skannerRef.current = null;
      }
    };
  }, [onTreff]);

  async function lukkSkanner() {
    detectorAktiv.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (skannerRef.current) {
      try {
        await skannerRef.current.stop();
      } catch {}
      skannerRef.current = null;
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

  // Detekt om vi bruker BarcodeDetector eller html5-qrcode
  const brukerBarcodeDetector =
    typeof window !== "undefined" &&
    "BarcodeDetector" in window &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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

        {(status === "skanner" || status === "sokerOpp") && (
          <div className="w-full max-w-md">
            <div
              className="relative"
              style={{
                background: "#000",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              {/* BarcodeDetector video */}
              {brukerBarcodeDetector ? (
                <video
                  id="strekkode-video"
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "auto",
                    maxHeight: "60vh",
                    display: "block",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  id="strekkode-skanner-container"
                  style={{
                    width: "100%",
                    minHeight: "300px",
                    background: "#000",
                    overflow: "hidden",
                    position: "relative",
                  }}
                />
              )}

              {/* Sikte-rektangel */}
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
            </div>

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
          </div>
        )}

        {visManuell && status === "skanner" && (
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
