import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import SmakingsKort from "@/components/SmakingsKort";
import DelPaWhatsApp from "@/components/DelPaWhatsApp";
import SlettVinKnapp from "@/components/SlettVinKnapp";
import MineVinerKnapp from "@/components/MineVinerKnapp";
import VinAktivitet from "@/components/VinAktivitet";

export default async function VinDetaljSide({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: medlem } = await supabase
    .from("medlemmer")
    .select("godkjent, er_klubbmedlem, er_admin")
    .eq("id", user.id)
    .single();

  if (!medlem?.godkjent) {
    redirect("/login");
  }

  // Hent vin-data
  const { data: vin } = await supabase
    .from("vinmonopol_produkter")
    .select("*")
    .eq("varenummer", id)
    .single();

  if (!vin) {
    notFound();
  }

  // Hent alle smakinger av denne vinen
  const { data: smakinger } = await supabase
    .from("smakinger")
    .select(
      `
      *,
      vinmonopol_produkter (*),
      medlemmer:tatt_med_av (navn),
      scorer (id, score, medlem_id, medlemmer (navn)),
      kommentarer (id, tekst, medlem_id, opprettet_at, medlemmer (navn))
    `,
    )
    .eq("varenummer", id)
    .order("opprettet_at", { ascending: false });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const vinUrl = `${baseUrl}/viner/${id}`;
  let delTekst = `🍷 Sjekk ut *${vin.navn}*`;
  const detaljer = [vin.hovedkategori, vin.land].filter(Boolean).join(" · ");
  if (detaljer) delTekst += `\n${detaljer}`;
  if (vin.pris) delTekst += `\n💰 ${Number(vin.pris).toFixed(0)} kr`;
  delTekst += `\n\n${vinUrl}`;

  return (
    <div className="space-y-8">
      <Link
        href="/viner"
        className="text-sm font-sans text-wine-700 hover:text-wine-900"
      >
        ← Tilbake til viner
      </Link>

      {/* Vin-info */}
      <article className="kort p-6 md:p-8">
        <div className="flex flex-col sm:flex-row gap-6">
          {vin.bilde_url && (
            <img
              src={vin.bilde_url}
              alt={vin.navn}
              className="w-32 h-48 object-contain mx-auto sm:mx-0 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl text-wine-900">{vin.navn}</h1>
            <p className="text-base font-sans text-ink-700/70 mt-2">
              {[vin.hovedkategori, vin.land, vin.distrikt, vin.produsent]
                .filter(Boolean)
                .join(" · ")}
              {vin.alkoholprosent && ` · ${vin.alkoholprosent}%`}
            </p>
            {vin.pris && (
              <p className="text-xl text-wine-700 font-display mt-3">
                {Number(vin.pris).toFixed(2)} kr
              </p>
            )}
            {vin.smak && (
              <p className="text-sm font-sans text-ink-700/80 mt-4 italic">
                {vin.smak}
              </p>
            )}

            {/* Mine viner-knapper */}
            <div className="mt-5">
              <MineVinerKnapp varenummer={id} brukerId={user.id} />
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              {vin.produkt_url && (
                <a
                  href={vin.produkt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs"
                >
                  Se på Vinmonopolet ↗
                </a>
              )}
              <DelPaWhatsApp tekst={delTekst} />
            </div>
          </div>
        </div>
      </article>

      {/* Klubbens aktivitet på denne vinen */}
      <VinAktivitet varenummer={id} />

      {/* Smakinger */}
      <section>
        <h2 className="font-display text-2xl text-wine-900 mb-4">
          Smakinger ({smakinger?.length || 0})
        </h2>
        {smakinger && smakinger.length > 0 ? (
          <div className="space-y-4">
            {smakinger.map((s: any) => (
              <SmakingsKort
                key={s.id}
                smaking={s}
                brukerId={user.id}
                visVin={false}
                kanScoreOgKommentere={!s.klubbkveld_id || medlem.er_klubbmedlem}
              />
            ))}
          </div>
        ) : (
          <p className="text-ink-700/60 italic">Ingen smakinger ennå.</p>
        )}
      </section>

      {/* Admin-handlinger */}
      {medlem.er_admin && (
        <section className="pt-8 border-t border-wine-900/10">
          <h2 className="font-display text-lg text-ink-700/60 mb-3">
            Administrator
          </h2>
          <SlettVinKnapp varenummer={id} vinNavn={vin.navn} />
        </section>
      )}
    </div>
  );
}
