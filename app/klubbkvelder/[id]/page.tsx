import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import LeggTilVin from '@/components/LeggTilVin';
import SmakingsKort from '@/components/SmakingsKort';
import DelPaWhatsApp from '@/components/DelPaWhatsApp';

export default async function Klubbkveld({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return notFound();

  const { data: meg } = await supabase
    .from('medlemmer')
    .select('er_klubbmedlem')
    .eq('id', user.id)
    .single();

  if (!meg?.er_klubbmedlem) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="font-display text-3xl text-wine-800 mb-4">Ikke tilgang</h1>
        <div className="gold-line w-24 mx-auto my-4" />
        <p className="text-ink-700/80">
          Klubbkvelder er forbeholdt medlemmer av VinIverdagen.
        </p>
      </div>
    );
  }

  const { data: kveld } = await supabase
    .from('klubbkvelder')
    .select('*')
    .eq('id', id)
    .single();

  if (!kveld) notFound();

  const { data: oppmotte } = await supabase
    .from('oppmote')
    .select('medlem_id, medlemmer(navn)')
    .eq('klubbkveld_id', id);

  const { data: smakinger } = await supabase
    .from('smakinger')
    .select(`
      id, varenummer, tatt_med_av, opprettet_at, klubbkveld_id,
      vinmonopol_produkter(navn, hovedkategori, produkttype, land, druer, pris, bilde_url, produkt_url, produsent, alkoholprosent),
      medlemmer(id, navn),
      scorer(id, score, medlem_id, medlemmer(navn)),
      kommentarer(id, tekst, opprettet_at, medlem_id, medlemmer(navn))
    `)
    .eq('klubbkveld_id', id)
    .order('opprettet_at', { ascending: true });

  // Bygg WhatsApp-tekst for kvelden
  const datoFormat = new Date(kveld.dato).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://viniverdagen.vercel.app';
  const kveldUrl = `${baseUrl}/klubbkvelder/${id}`;

  let whatsappTekst = `🍷 *${kveld.tittel}*\n📅 ${datoFormat}`;
  if (kveld.sted) whatsappTekst += `\n📍 ${kveld.sted}`;
  if (smakinger && smakinger.length > 0) {
    whatsappTekst += `\n\n🍇 *Viner:*`;
    smakinger.forEach((s: any) => {
      const v = s.vinmonopol_produkter;
      const scorer = s.scorer || [];
      const snitt =
        scorer.length > 0
          ? (scorer.reduce((a: number, b: any) => a + b.score, 0) / scorer.length).toFixed(1)
          : null;
      whatsappTekst += `\n• ${v?.navn}`;
      if (snitt) whatsappTekst += ` (★ ${snitt})`;
      if (s.medlemmer?.navn) whatsappTekst += ` – ${s.medlemmer.navn}`;
    });
  }
  whatsappTekst += `\n\n${kveldUrl}`;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {kveld.bilde_url && (
        <div
          className="h-64 md:h-96 -mx-6 mb-12 bg-cover bg-center"
          style={{ backgroundImage: `url(${kveld.bilde_url})` }}
        />
      )}

      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.25em] text-wine-700 font-sans mb-3">
          Klubbkveld
        </p>
        <h1 className="font-display text-5xl text-wine-900 mb-3">{kveld.tittel}</h1>
        <p className="text-ink-700/70 italic mb-4">
          {new Date(kveld.dato).toLocaleDateString('nb-NO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          {kveld.sted && ` · ${kveld.sted}`}
        </p>
        {kveld.kommentar && (
          <p className="text-lg text-ink-700/80 leading-relaxed mb-6">{kveld.kommentar}</p>
        )}
        {oppmotte && oppmotte.length > 0 && (
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wider text-ink-700/50 font-sans mb-1.5">
              Til stede
            </p>
            <p className="text-ink-700/80">
              {oppmotte.map((o: any) => o.medlemmer?.navn).filter(Boolean).join(' · ')}
            </p>
          </div>
        )}

        <div className="mt-6">
          <DelPaWhatsApp tekst={whatsappTekst} />
        </div>
      </div>

      <div className="gold-line w-32 mx-auto mb-12" />

      <div className="mb-12">
        <h2 className="font-display text-3xl text-wine-900 mb-6">Viner</h2>
        <LeggTilVin klubbkveldId={kveld.id} />
      </div>

      <div className="space-y-6">
        {smakinger && smakinger.length > 0 ? (
          smakinger.map((s: any) => (
            <SmakingsKort
              key={s.id}
              smaking={s}
              brukerId={user?.id || ''}
              kanScoreOgKommentere={true}
            />
          ))
        ) : (
          <p className="text-center text-ink-700/60 italic py-12">
            Ingen viner lagt til ennå. Vær den første!
          </p>
        )}
      </div>
    </div>
  );
}
