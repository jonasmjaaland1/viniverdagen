import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase-server';
import { hentProduktDetaljer } from '@/lib/vinmonopolet';

// GET /api/vinmonopolet/detaljer?varenummer=...
// Henter (eller scraper) detaljer for én vin.
// Brukes når brukeren velger en vin fra søkeresultatet.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });

  const varenummer = req.nextUrl.searchParams.get('varenummer')?.trim();
  if (!varenummer) {
    return NextResponse.json({ feil: 'Mangler varenummer' }, { status: 400 });
  }

  // Sjekk cache først (7 dager)
  const enUkeSiden = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { data: cache } = await supabase
    .from('vinmonopol_produkter')
    .select('*')
    .eq('varenummer', varenummer)
    .maybeSingle();

  if (cache && cache.sist_oppdatert && new Date(cache.sist_oppdatert) > enUkeSiden && cache.pris) {
    return NextResponse.json({ produkt: cache });
  }

  // Scrape detaljer
  const detaljer = await hentProduktDetaljer(varenummer);
  if (!detaljer) {
    return NextResponse.json({ feil: 'Kunne ikke hente detaljer' }, { status: 404 });
  }

  // Lagre i cache via service-klient (omgår RLS)
  const service = createServiceClient();
  await service.from('vinmonopol_produkter').upsert({
    varenummer: detaljer.varenummer,
    navn: detaljer.navn,
    produkttype: detaljer.produkttype,
    hovedkategori: detaljer.hovedkategori,
    land: detaljer.land,
    distrikt: detaljer.distrikt,
    underdistrikt: detaljer.underdistrikt,
    pris: detaljer.pris,
    volum: detaljer.volum,
    bilde_url: detaljer.bilde_url,
    produkt_url: detaljer.produkt_url,
    smak: detaljer.smak,
    sist_oppdatert: new Date().toISOString(),
  }, { onConflict: 'varenummer' });

  return NextResponse.json({ produkt: detaljer });
}
