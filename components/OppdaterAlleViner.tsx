"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OppdaterAlleViner() {
  const router = useRouter();
  const [laster, setLaster] = useState(false);
  const [resultat, setResultat] = useState<any>(null);

  async function start() {
    if (
      !confirm(
        "Dette henter ny data fra Vinmonopolet for ALLE viner. Det kan ta noen minutter. Fortsette?",
      )
    ) {
      return;
    }
    setLaster(true);
    setResultat(null);

    try {
      const res = await fetch("/api/vinmonopolet/oppdater-alle", {
        method: "POST",
      });
      const data = await res.json();
      setResultat(data);
      router.refresh();
    } catch (e: any) {
      setResultat({ feil: e.message });
    } finally {
      setLaster(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={start}
        disabled={laster}
        className="btn-primary text-sm disabled:opacity-50"
      >
        {laster ? "Oppdaterer..." : "Oppdater alle viner fra Vinmonopolet"}
      </button>

      <p className="text-xs font-sans text-ink-700/60 italic">
        Henter ny data (pris, smak, druer, mat-paring osv.) for alle viner som
        er lagt til. Kan ta opptil et minutt.
      </p>

      {resultat && (
        <div className="mt-4 p-4 bg-cream-100 rounded space-y-2">
          {resultat.feil ? (
            <p className="text-sm text-wine-700">⚠️ {resultat.feil}</p>
          ) : (
            <>
              <p className="font-display text-base text-wine-900">
                Ferdig! Oppdaterte {resultat.vellykket} av {resultat.totalt}{" "}
                viner
              </p>
              {resultat.feilet > 0 && (
                <details className="text-xs font-sans">
                  <summary className="cursor-pointer text-ink-700/70 hover:text-wine-700">
                    {resultat.feilet} feilet — vis detaljer
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {resultat.feil.slice(0, 20).map((f: any, i: number) => (
                      <li key={i} className="text-ink-700/70">
                        {f.varenummer}: {f.feil}
                      </li>
                    ))}
                    {resultat.feil.length > 20 && (
                      <li className="text-ink-700/50 italic">
                        ...og {resultat.feil.length - 20} til
                      </li>
                    )}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
