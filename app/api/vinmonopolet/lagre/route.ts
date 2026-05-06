import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase-server';
import { hentProduktDetaljer } from '@/lib/vinmonopolet';

// POST /api/vinmonopolet/lagre
// Sørger for at en vin er lagret i vinmonopol_produkter-tabellen.
// Bruker service_role for å omgå RLS (cachen skal kun oppdateres av server).
export async function POST(req: NextRequest) {
  // Sjekk innlogging med vanlig klient
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });

  // Sjekk at brukeren er godkjent
  const { data: medlem } = await supabase
    .from('medlemmer')
    .select('godkjent')
    .eq('id', user.id)
    .single();
  if (!medlem?.godkjent) {
    return NextResponse.json({ feil: 'Ikke godkjent medlem' }, { status: 403 });
  }

  const body = await req.json();
  const { varenummer, ...rest } = body;

  if (!varenummer) {
    return NextResponse.json({ feil: 'Mangler varenummer' }, { status: 400 });
  }

  // Bruk service-klient for å skrive til cachen (omgår RLS)
  const service = createServiceClient();

  // Sjekk om vinen allerede finnes
  const { data: eksisterende } = await service
    .from('vinmonopol_produkter')
    .select('varenummer')
    .eq('varenummer', varenummer)
    .maybeSingle();

  if (eksisterende) {
    return NextResponse.json({ ok: true, lagret: false });
  }

  // Hent detaljer hvis vi ikke har dem fra body
  let produkt: any = rest;
  if (!produkt.navn) {
    produkt = await hentProduktDetaljer(varenummer);
    if (!produkt) {
      return NextResponse.json({ feil: 'Kunne ikke hente vin-data' }, { status: 404 });
    }
  }

  // Lagre i databasen
  const { error } = await service.from('vinmonopol_produkter').upsert({
    varenummer,
    navn: produkt.navn,
    produkttype: produkt.produkttype,
    hovedkategori: produkt.hovedkategori,
    land: produkt.land,
    distrikt: produkt.distrikt,
    underdistrikt: produkt.underdistrikt,
    argang: produkt.argang,
    druer: produkt.druer,
    alkoholprosent: produkt.alkoholprosent,
    pris: produkt.pris,
    pris_per_liter: produkt.pris_per_liter,
    volum: produkt.volum,
    produsent: produkt.produsent,
    bilde_url: produkt.bilde_url,
    produkt_url: produkt.produkt_url,
    lukt: produkt.lukt,
    smak: produkt.smak,
    sist_oppdatert: new Date().toISOString(),
  }, { onConflict: 'varenummer' });

  if (error) {
    return NextResponse.json({ feil: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lagret: true });
}