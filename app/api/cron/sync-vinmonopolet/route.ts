import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { hentAlleProdukter } from '@/lib/vinmonopolet';

// Kalles én gang per døgn av Vercel Cron
// Konfigurert i vercel.json
export const maxDuration = 300; // 5 min

export async function GET(req: NextRequest) {
  // Sikkerhet: bare Vercel Cron eller riktig hemmelighet kan kalle dette
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ feil: 'Uautorisert' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let totalSynced = 0;
  let start = 0;
  const batchSize = 100;
  const maxBatcher = 200; // Sikkerhetsnett: maks 20 000 produkter per kjøring

  try {
    for (let i = 0; i < maxBatcher; i++) {
      const produkter = await hentAlleProdukter(start, batchSize);
      if (produkter.length === 0) break;

      // Upsert til vår database
      const rader = produkter
        .filter((p) => p.varenummer)
        .map((p) => ({
          varenummer: p.varenummer,
          navn: p.navn,
          produkttype: p.produkttype,
          hovedkategori: p.hovedkategori,
          land: p.land,
          distrikt: p.distrikt,
          underdistrikt: p.underdistrikt,
          argang: p.argang,
          druer: p.druer,
          alkoholprosent: p.alkoholprosent,
          pris: p.pris,
          pris_per_liter: p.pris_per_liter,
          volum: p.volum,
          produsent: p.produsent,
          bilde_url: p.bilde_url,
          produkt_url: p.produkt_url,
          lukt: p.lukt,
          smak: p.smak,
          sist_oppdatert: new Date().toISOString(),
        }));

      if (rader.length > 0) {
        const { error } = await supabase
          .from('vinmonopol_produkter')
          .upsert(rader, { onConflict: 'varenummer' });

        if (error) throw error;
        totalSynced += rader.length;
      }

      start += batchSize;
      if (produkter.length < batchSize) break;

      // Unngå rate limit (60 kall per minutt)
      await new Promise((r) => setTimeout(r, 1100));
    }

    return NextResponse.json({
      ok: true,
      synced: totalSynced,
      tidspunkt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, feil: e.message, synced: totalSynced },
      { status: 500 }
    );
  }
}
