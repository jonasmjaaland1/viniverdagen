// app/api/vinmonopolet/lagre/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { hentProdukt, tilDatabase } from '@/lib/vinmonopolet-press';

export const runtime = 'nodejs';
export const maxDuration = 20;

export async function POST(req: NextRequest) {
  try {
    const { varenummer } = await req.json();
    if (!varenummer) {
      return NextResponse.json({ feil: 'Mangler varenummer' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Sjekk om vi har Press-data fra før (mindre enn 7 dager gammel = bruk cache)
    const { data: eksisterende } = await supabase
      .from('vinmonopol_produkter')
      .select('varenummer, press_data_oppdatert')
      .eq('varenummer', varenummer)
      .maybeSingle();

    if (eksisterende?.press_data_oppdatert) {
      const dagerSiden = (Date.now() - new Date(eksisterende.press_data_oppdatert).getTime()) / (1000 * 60 * 60 * 24);
      if (dagerSiden < 7) {
        return NextResponse.json({ ok: true, cached: true });
      }
    }

    // Hent fra Press API
    const produkt = await hentProdukt(varenummer);
    if (!produkt) {
      return NextResponse.json({ feil: 'Fant ikke produkt i Vinmonopolets database' }, { status: 404 });
    }

    const dbData = tilDatabase(produkt);

    const { error } = await supabase
      .from('vinmonopol_produkter')
      .upsert(dbData, { onConflict: 'varenummer' });

    if (error) {
      console.error('Lagring-feil:', error);
      return NextResponse.json({ feil: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, cached: false, navn: produkt.basic.productShortName });
  } catch (e: any) {
    console.error('Lagring-feil:', e);
    return NextResponse.json({ feil: e.message }, { status: 500 });
  }
}
