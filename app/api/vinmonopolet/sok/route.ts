// app/api/vinmonopolet/sok/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sokProdukter, fritekstSok, type PressProduct } from '@/lib/vinmonopolet-press';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sok = searchParams.get('q')?.trim() || '';
  if (!sok) {
    return NextResponse.json({ resultater: [] });
  }

  try {
    let treff = await sokProdukter(sok, 20);
    if (treff.length === 0) {
      treff = await fritekstSok(sok, 20);
    }

    const resultater = treff.map((p: PressProduct) => ({
      varenummer: p.basic.productId,
      navn: p.basic.productShortName,
      land: p.origins?.origin?.country || null,
      produsent: p.logistics?.manufacturerName || null,
      hovedkategori: p.classification?.mainProductTypeName || null,
      pris: p.prices && p.prices.length > 0 ? p.prices[p.prices.length - 1].salesPrice : null,
      bilde_url: `https://bilder.vinmonopolet.no/cache/515x515-0/${p.basic.productId}-1.jpg`,
    }));

    return NextResponse.json({ resultater });
  } catch (e: any) {
    console.error('Sok-feil:', e);
    return NextResponse.json({ feil: e.message, resultater: [] }, { status: 500 });
  }
}
