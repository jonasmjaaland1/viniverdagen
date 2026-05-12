// app/api/vinmonopolet/oppdater-alle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase-server';
import { hentProdukt, tilDatabase } from '@/lib/vinmonopolet-press';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Sjekk at brukeren er admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });
    }

    const { data: medlem } = await supabase
      .from('medlemmer')
      .select('er_admin')
      .eq('id', user.id)
      .single();

    if (!medlem?.er_admin) {
      return NextResponse.json({ feil: 'Krever admin' }, { status: 403 });
    }

    const service = createServiceClient();

    // Hent alle viner
    const { data: viner, error: e1 } = await service
      .from('vinmonopol_produkter')
      .select('varenummer');

    if (e1 || !viner) {
      return NextResponse.json({ feil: e1?.message || 'Kunne ikke hente viner' }, { status: 500 });
    }

    const resultater = {
      totalt: viner.length,
      vellykket: 0,
      feilet: 0,
      feil: [] as Array<{ varenummer: string; feil: string }>,
    };

    // Press API: 60 kall/min = 1 kall hvert sekund. Vi limiterer til 5 samtidige.
    const batchStorrelse = 5;
    for (let i = 0; i < viner.length; i += batchStorrelse) {
      const batch = viner.slice(i, i + batchStorrelse);
      await Promise.all(
        batch.map(async (v) => {
          try {
            const produkt = await hentProdukt(v.varenummer);
            if (!produkt) {
              resultater.feilet++;
              resultater.feil.push({ varenummer: v.varenummer, feil: 'Ikke funnet i Press API' });
              return;
            }
            const dbData = tilDatabase(produkt);
            const { error } = await service
              .from('vinmonopol_produkter')
              .update(dbData)
              .eq('varenummer', v.varenummer);
            if (error) {
              resultater.feilet++;
              resultater.feil.push({ varenummer: v.varenummer, feil: error.message });
            } else {
              resultater.vellykket++;
            }
          } catch (e: any) {
            resultater.feilet++;
            resultater.feil.push({ varenummer: v.varenummer, feil: e.message });
          }
        })
      );
      // Liten pause mellom batches for å holde oss innenfor rate limit
      if (i + batchStorrelse < viner.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return NextResponse.json(resultater);
  } catch (e: any) {
    console.error('Oppdater-alle-feil:', e);
    return NextResponse.json({ feil: e.message }, { status: 500 });
  }
}
