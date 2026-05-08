import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import VinFilter from "@/components/VinFilter";
import Avatar from "@/components/Avatar";

export default async function VinOversikt({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; minScore?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const kategori = params.kategori;
  const minScore = params.minScore ? parseFloat(params.minScore) : null;

  let query = supabase.from("vin_oversikt").select("*");
  if (kategori && kategori !== "alle") {
    query = query.eq("hovedkategori", kategori);
  }
  if (minScore) {
    query = query.gte("snitt_total", minScore);
  }

  const { data: viner } = await query.order("snitt_total", {
    ascending: false,
    nullsFirst: false,
  });

  // Hent hovedanmeldelse for hver vin
  const varenumre = (viner || []).map((v: any) => v.varenummer);
  let hovedAnmeldelser: Record<
    string,
    { navn: string; tekst: string; score: number | null }
  > = {};

  if (varenumre.length > 0) {
    // Hent smakinger for å finne hvem som tok med
    const { data: smakinger } = await supabase
      .from("smakinger")
      .select(
        `
        varenummer,
        tatt_med_av,
        opprettet_at,
        medlemmer:tatt_med_av (navn),
        kommentarer (tekst, medlem_id, opprettet_at),
        scorer (score, medlem_id)
      `,
      )
      .in("varenummer", varenumre)
      .order("opprettet_at", { ascending: true });

    // For hver vin, finn første smaking og dens hovedanmelder-kommentar
    if (smakinger) {
      for (const s of smakinger as any[]) {
        if (hovedAnmeldelser[s.varenummer]) continue; // Allerede funnet
        const kommentar = s.kommentarer?.find(
          (k: any) => k.medlem_id === s.tatt_med_av,
        );
        const score = s.scorer?.find(
          (sc: any) => sc.medlem_id === s.tatt_med_av,
        );
        if (kommentar) {
          hovedAnmeldelser[s.varenummer] = {
            navn: s.medlemmer?.navn || "Ukjent",
            tekst: kommentar.tekst,
            score: score?.score || null,
          };
        }
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="font-display text-5xl text-wine-900 mb-3">Alle viner</h1>
        <div className="gold-line w-24 mx-auto" />
      </div>

      <VinFilter />

      {!viner || viner.length === 0 ? (
        <p className="text-center text-ink-700/60 italic py-20">
          Ingen viner matcher filteret.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8">
          {viner.map((v: any) => {
            const anmeldelse = hovedAnmeldelser[v.varenummer];
            return (
              <Link
                key={v.varenummer}
                href={`/viner/${v.varenummer}`}
                className="kort p-5 flex gap-4 hover:shadow-md transition"
              >
                {v.bilde_url && (
                  <img
                    src={v.bilde_url}
                    alt={v.navn}
                    className="w-16 h-24 object-contain flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg text-wine-900 leading-tight">
                        {v.navn}
                      </h3>
                      <p className="text-xs font-sans text-ink-700/60 mt-1">
                        {[v.hovedkategori, v.land].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {v.snitt_total && (
                      <p className="font-display text-2xl text-wine-800 flex-shrink-0">
                        ★ {v.snitt_total}
                      </p>
                    )}
                  </div>

                  {anmeldelse && (
                    <div className="mt-3 pt-3 border-t border-wine-900/10">
                      <div className="flex items-start gap-2">
                        <Avatar navn={anmeldelse.navn} storrelse="liten" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-display text-wine-700 truncate">
                              {anmeldelse.navn}
                            </p>
                            {anmeldelse.score && (
                              <span className="text-xs font-display text-wine-700 flex-shrink-0">
                                ★ {anmeldelse.score}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-sans text-ink-700/75 italic line-clamp-3 leading-relaxed">
                            "{anmeldelse.tekst}"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs font-sans text-ink-700/50 mt-2">
                    {v.antall_smakinger}{" "}
                    {v.antall_smakinger === 1 ? "smaking" : "smakinger"}
                    {v.forste_klubbkveld && (
                      <>
                        {" "}
                        · siden {new Date(v.forste_klubbkveld).getFullYear()}
                      </>
                    )}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
