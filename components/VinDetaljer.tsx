'use client';

interface VinDetaljerProps {
  druer?: string[] | null;
  matparing?: Array<{ foodId: string; foodDesc: string }> | null;
  passer_til?: string[] | null;
  distrikt?: string | null;
  underdistrikt?: string | null;
  kvalitetsklassifisering?: string | null;
  kork_type?: string | null;
  lagringspotensial?: string | null;
  er_okologisk?: boolean;
  er_biodynamisk?: boolean;
  er_etisk_sertifisert?: boolean;
  er_glutenfri?: boolean;
  er_kosher?: boolean;
  ingen_tilsatt_svovel?: boolean;
  farge_beskrivelse?: string | null;
  lukt?: string | null;
  smak?: string | null;
  produksjonsmetode?: string | null;
  sukker?: string | null;
  syre?: string | null;
  allergener?: string | null;
}

export default function VinDetaljer(props: VinDetaljerProps) {
  // Bygg liste med mat-paring fra enten matparing (jsonb) eller passer_til (array)
  let matListe: string[] = [];
  if (props.matparing && Array.isArray(props.matparing) && props.matparing.length > 0) {
    matListe = props.matparing.map((m) => m.foodDesc).filter(Boolean);
  } else if (props.passer_til && Array.isArray(props.passer_til) && props.passer_til.length > 0) {
    matListe = props.passer_til;
  }

  // Bygg liste med eco-labels
  const ecoLabels = [
    { aktiv: props.er_okologisk, label: 'Økologisk', ikon: '🌱' },
    { aktiv: props.er_biodynamisk, label: 'Biodynamisk', ikon: '🌿' },
    { aktiv: props.er_etisk_sertifisert, label: 'Etisk sertifisert', ikon: '🤝' },
    { aktiv: props.er_glutenfri, label: 'Glutenfri', ikon: '🌾' },
    { aktiv: props.er_kosher, label: 'Kosher', ikon: '✡️' },
    { aktiv: props.ingen_tilsatt_svovel, label: 'Uten tilsatt svovel', ikon: '✨' },
  ].filter((e) => e.aktiv);

  const harBeskrivelse = props.farge_beskrivelse || props.lukt || props.smak;
  const harOpprinnelse = props.distrikt || props.underdistrikt || props.kvalitetsklassifisering;
  const harDruer = props.druer && props.druer.length > 0;
  const harDetaljer = props.kork_type || props.lagringspotensial || props.sukker || props.syre || props.allergener || props.produksjonsmetode;

  // Hvis ingenting å vise, returner null
  if (!harBeskrivelse && matListe.length === 0 && ecoLabels.length === 0 && !harOpprinnelse && !harDruer && !harDetaljer) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Beskrivelse fra Vinmonopolet */}
      {harBeskrivelse && (
        <div className="kort p-5 md:p-6 space-y-3">
          <h3 className="font-display text-lg text-wine-900">Karakteristikk</h3>
          {props.farge_beskrivelse && (
            <div>
              <p className="text-xs uppercase tracking-wider font-sans text-ink-700/50 mb-1">
                Farge
              </p>
              <p className="text-sm font-sans text-ink-700/85">{props.farge_beskrivelse}</p>
            </div>
          )}
          {props.lukt && (
            <div>
              <p className="text-xs uppercase tracking-wider font-sans text-ink-700/50 mb-1">
                Lukt
              </p>
              <p className="text-sm font-sans text-ink-700/85">{props.lukt}</p>
            </div>
          )}
          {props.smak && (
            <div>
              <p className="text-xs uppercase tracking-wider font-sans text-ink-700/50 mb-1">
                Smak
              </p>
              <p className="text-sm font-sans text-ink-700/85">{props.smak}</p>
            </div>
          )}
        </div>
      )}

      {/* Druer */}
      {harDruer && (
        <div className="kort p-5 md:p-6">
          <h3 className="font-display text-lg text-wine-900 mb-3">🍇 Druer</h3>
          <ul className="space-y-1">
            {props.druer!.map((d, i) => (
              <li key={i} className="text-sm font-sans text-ink-700/85">
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mat-paring */}
      {matListe.length > 0 && (
        <div className="kort p-5 md:p-6">
          <h3 className="font-display text-lg text-wine-900 mb-3">🍽️ Passer til</h3>
          <div className="flex flex-wrap gap-2">
            {matListe.map((m, i) => (
              <span
                key={i}
                className="text-sm font-sans px-3 py-1.5 bg-cream-100 text-wine-800 rounded-full"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Eco-labels */}
      {ecoLabels.length > 0 && (
        <div className="kort p-5 md:p-6">
          <h3 className="font-display text-lg text-wine-900 mb-3">Spesielle egenskaper</h3>
          <div className="flex flex-wrap gap-2">
            {ecoLabels.map((e, i) => (
              <span
                key={i}
                className="text-sm font-sans px-3 py-1.5 bg-wine-700/10 text-wine-800 rounded-full border border-wine-700/20"
              >
                <span className="mr-1">{e.ikon}</span>
                {e.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Opprinnelse-detaljer */}
      {harOpprinnelse && (
        <div className="kort p-5 md:p-6 space-y-2">
          <h3 className="font-display text-lg text-wine-900 mb-2">Opprinnelse</h3>
          {props.distrikt && (
            <div className="flex justify-between text-sm font-sans gap-3">
              <span className="text-ink-700/60">Distrikt</span>
              <span className="text-ink-700/85 text-right">{props.distrikt}</span>
            </div>
          )}
          {props.underdistrikt && (
            <div className="flex justify-between text-sm font-sans gap-3">
              <span className="text-ink-700/60">Underdistrikt</span>
              <span className="text-ink-700/85 text-right">{props.underdistrikt}</span>
            </div>
          )}
          {props.kvalitetsklassifisering && (
            <div className="flex justify-between text-sm font-sans gap-3">
              <span className="text-ink-700/60">Klassifisering</span>
              <span className="text-ink-700/85 text-right">{props.kvalitetsklassifisering}</span>
            </div>
          )}
        </div>
      )}

      {/* Tekniske detaljer */}
      {harDetaljer && (
        <div className="kort p-5 md:p-6 space-y-2">
          <h3 className="font-display text-lg text-wine-900 mb-2">Detaljer</h3>
          {props.kork_type && (
            <div className="flex justify-between text-sm font-sans gap-3">
              <span className="text-ink-700/60">Kork</span>
              <span className="text-ink-700/85 text-right">{props.kork_type}</span>
            </div>
          )}
          {props.lagringspotensial && (
            <div className="flex justify-between text-sm font-sans gap-3">
              <span className="text-ink-700/60">Lagring</span>
              <span className="text-ink-700/85 text-right">{props.lagringspotensial}</span>
            </div>
          )}
          {props.sukker && (
            <div className="flex justify-between text-sm font-sans gap-3">
              <span className="text-ink-700/60">Sukker</span>
              <span className="text-ink-700/85 text-right">{props.sukker} g/l</span>
            </div>
          )}
          {props.syre && (
            <div className="flex justify-between text-sm font-sans gap-3">
              <span className="text-ink-700/60">Syre</span>
              <span className="text-ink-700/85 text-right">{props.syre} g/l</span>
            </div>
          )}
          {props.allergener && (
            <div className="flex justify-between text-sm font-sans gap-3">
              <span className="text-ink-700/60">Allergener</span>
              <span className="text-ink-700/85 text-right">{props.allergener}</span>
            </div>
          )}
          {props.produksjonsmetode && (
            <div className="pt-2 border-t border-wine-900/10">
              <p className="text-xs uppercase tracking-wider font-sans text-ink-700/50 mb-1">
                Produksjon
              </p>
              <p className="text-sm font-sans text-ink-700/85 italic">
                {props.produksjonsmetode}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
