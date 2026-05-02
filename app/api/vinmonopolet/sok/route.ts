import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase-server';
import { hentProdukt, sokVinmonopolet, tilHovedkategori } from '@/lib/vinmonopolet';

// Søk: GET /api/vinmonopolet/sok?q=...
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ resultater: [] });
  }

  // Søk lokalt først
  let resultater = await sokVinmonopolet(supabase, q, 10);

  // Hvis varenummer og ikke funnet lokalt - prøv API direkte og lagre
  const erVarenummer = /^\d+$/.test(q);
  if (resultater.length === 0 && erVarenummer) {
    const produkt = await hentProdukt(q);
    if (produkt && produkt.varenummer) {
      const service = createServiceClient();
      await service.from('vinmonopol_produkter').upsert({
        ...produkt,
        hovedkategori: tilHovedkategori(produkt.produkttype),
        sist_oppdatert: new Date().toISOString(),
      }, { onConflict: 'varenummer' });
      resultater = [produkt];
    }
  }

  return NextResponse.json({ resultater });
}
