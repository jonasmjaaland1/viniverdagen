"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function AdminMedlemmer({ medlemmer }: { medlemmer: any[] }) {
  const router = useRouter();
  const supabase = createClient();

  async function godkjenn(id: string) {
    await supabase.from("medlemmer").update({ godkjent: true }).eq("id", id);
    router.refresh();
  }

  async function fjernGodkjenning(id: string) {
    if (
      !confirm(
        "Dette vil utestenge brukeren fra appen. Dataene beholdes. Fortsette?",
      )
    )
      return;
    await supabase
      .from("medlemmer")
      .update({ godkjent: false, er_klubbmedlem: false })
      .eq("id", id);
    router.refresh();
  }

  async function settAdmin(id: string, er: boolean) {
    await supabase.from("medlemmer").update({ er_admin: er }).eq("id", id);
    router.refresh();
  }

  async function settKlubbmedlem(id: string, er: boolean) {
    await supabase
      .from("medlemmer")
      .update({ er_klubbmedlem: er })
      .eq("id", id);
    router.refresh();
  }

  const venter = medlemmer.filter((m) => !m.godkjent);
  const godkjente = medlemmer.filter((m) => m.godkjent);

  return (
    <div className="space-y-8">
      {venter.length > 0 && (
        <div>
          <h3 className="font-display text-xl text-wine-700 mb-3 italic">
            Venter på godkjenning ({venter.length})
          </h3>
          <ul className="kort divide-y divide-wine-900/10">
            {venter.map((m) => (
              <li
                key={m.id}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-display text-lg text-wine-900">{m.navn}</p>
                  <p className="text-sm font-sans text-ink-700/60">{m.epost}</p>
                </div>
                <button
                  onClick={() => godkjenn(m.id)}
                  className="btn-primary text-xs"
                >
                  Godkjenn
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-display text-xl text-wine-700 mb-3 italic">
          Godkjente ({godkjente.length})
        </h3>
        <ul className="kort divide-y divide-wine-900/10">
          {godkjente.map((m) => (
            <li
              key={m.id}
              className="p-4 flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display text-lg text-wine-900">{m.navn}</p>
                  {m.er_admin ? (
                    <span className="text-[10px] uppercase tracking-wider font-sans bg-wine-700 text-cream-50 px-2 py-0.5 rounded">
                      Admin
                    </span>
                  ) : m.er_klubbmedlem ? (
                    <span className="text-[10px] uppercase tracking-wider font-sans bg-wine-100 text-wine-800 border border-wine-700/30 px-2 py-0.5 rounded">
                      Klubbmedlem
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider font-sans bg-cream-100 text-ink-700/60 border border-ink-700/20 px-2 py-0.5 rounded">
                      Vanlig
                    </span>
                  )}
                </div>
                <p className="text-sm font-sans text-ink-700/60 mt-0.5">
                  {m.epost}
                </p>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs">
                <button
                  onClick={() => settKlubbmedlem(m.id, !m.er_klubbmedlem)}
                  className="font-sans uppercase tracking-wider text-ink-700/70 hover:text-wine-700"
                >
                  {m.er_klubbmedlem
                    ? "Fjern klubbmedlem"
                    : "Gjør til klubbmedlem"}
                </button>
                <button
                  onClick={() => settAdmin(m.id, !m.er_admin)}
                  className="font-sans uppercase tracking-wider text-ink-700/70 hover:text-wine-700"
                >
                  {m.er_admin ? "Fjern admin" : "Gjør til admin"}
                </button>
                <button
                  onClick={() => fjernGodkjenning(m.id)}
                  className="font-sans uppercase tracking-wider text-ink-700/70 hover:text-wine-700"
                >
                  Suspender
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
