import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ForslagKort from "@/components/ForslagKort";

export default async function DatoerSide() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: medlem } = await supabase
    .from("medlemmer")
    .select("godkjent, er_admin, er_klubbmedlem")
    .eq("id", user.id)
    .single();

  if (!medlem?.godkjent) redirect("/login");

  const { data: forslagRader } = await supabase
    .from("dato_forslag_oversikt")
    .select("*");

  const { data: alleSvar } = await supabase.from("dato_svar").select(`
      alternativ_id,
      medlem_id,
      svar,
      medlemmer (navn)
    `);

  const { data: medlemmer } = await supabase
    .from("medlemmer")
    .select("id, navn")
    .eq("godkjent", true)
    .order("navn");

  const forslagMap: Record<string, any> = {};
  (forslagRader || []).forEach((rad: any) => {
    if (!forslagMap[rad.forslag_id]) {
      forslagMap[rad.forslag_id] = {
        id: rad.forslag_id,
        tittel: rad.tittel,
        beskrivelse: rad.beskrivelse,
        status: rad.status,
        bekreftet_dato: rad.bekreftet_dato,
        bekreftet_klubbkveld_id: rad.bekreftet_klubbkveld_id,
        opprettet_av_navn: rad.opprettet_av_navn,
        ansvarlig_id: rad.ansvarlig_id,
        ansvarlig_navn: rad.ansvarlig_navn,
        opprettet_at: rad.opprettet_at,
        alternativer: [],
      };
    }
    if (rad.alternativ_id) {
      const mineSvar = (alleSvar || []).find(
        (s: any) =>
          s.alternativ_id === rad.alternativ_id && s.medlem_id === user.id,
      );
      const alleSvarForAlt = (alleSvar || [])
        .filter((s: any) => s.alternativ_id === rad.alternativ_id)
        .map((s: any) => ({
          medlem_id: s.medlem_id,
          medlem_navn: s.medlemmer?.navn || "Ukjent",
          svar: s.svar,
        }));

      forslagMap[rad.forslag_id].alternativer.push({
        id: rad.alternativ_id,
        dato: rad.dato,
        notat: rad.notat,
        antall_kan: rad.antall_kan,
        antall_kan_ikke: rad.antall_kan_ikke,
        antall_kanskje: rad.antall_kanskje,
        mitt_svar: mineSvar?.svar || null,
        alle_svar: alleSvarForAlt,
      });
    }
  });

  const forslag = Object.values(forslagMap);
  const apneForslag = forslag.filter((f: any) => f.status === "apen");
  const tidligereForslag = forslag.filter((f: any) => f.status !== "apen");

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl text-wine-900">Dato-forslag</h1>
          <p className="text-sm font-sans text-ink-700/70 mt-1">
            Svar på når du kan delta på neste klubbkveld
          </p>
        </div>
        {medlem.er_admin && (
          <Link href="/datoer/nytt" className="btn-primary text-sm">
            + Nytt forslag
          </Link>
        )}
      </div>

      {apneForslag.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-wider font-sans text-ink-700/60">
            Åpne forslag ({apneForslag.length})
          </h2>
          {apneForslag.map((f: any) => (
            <ForslagKort
              key={f.id}
              forslag={f}
              brukerId={user.id}
              erAdmin={medlem.er_admin}
              medlemmer={medlemmer || []}
            />
          ))}
        </section>
      )}

      {apneForslag.length === 0 && (
        <div className="kort p-8 text-center">
          <p className="text-5xl mb-4">📅</p>
          <p className="font-display text-xl text-wine-900">
            Ingen åpne forslag
          </p>
          <p className="text-sm font-sans text-ink-700/70 mt-2">
            {medlem.er_admin
              ? 'Klikk "Nytt forslag" for å foreslå datoer for neste klubbkveld'
              : "Admin har ikke foreslått noen datoer ennå"}
          </p>
        </div>
      )}

      {tidligereForslag.length > 0 && (
        <section className="space-y-4 pt-4">
          <h2 className="text-xs uppercase tracking-wider font-sans text-ink-700/60">
            Tidligere forslag
          </h2>
          {tidligereForslag.map((f: any) => (
            <ForslagKort
              key={f.id}
              forslag={f}
              brukerId={user.id}
              erAdmin={medlem.er_admin}
              medlemmer={medlemmer || []}
            />
          ))}
        </section>
      )}
    </div>
  );
}
