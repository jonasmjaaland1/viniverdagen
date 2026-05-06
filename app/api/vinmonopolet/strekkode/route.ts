import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { sokFraStrekkode } from '@/lib/vinmonopolet';

// Strekkode: GET /api/vinmonopolet/strekkode?ean=...
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });

  const ean = req.nextUrl.searchParams.get('ean')?.trim();
  if (!ean) {
    return NextResponse.json({ feil: 'Mangler EAN' }, { status: 400 });
  }

  // Validér at EAN ser fornuftig ut (8-14 sifre)
  if (!/^\d{8,14}$/.test(ean)) {
    return NextResponse.json({ feil: 'Ugyldig EAN-format' }, { status: 400 });
  }

  try {
    const produkt = await sokFraStrekkode(supabase, ean);
    if (!produkt) {
      return NextResponse.json({ produkt: null, feil: 'Ingen treff' });
    }
    return NextResponse.json({ produkt });
  } catch (e: any) {
    return NextResponse.json({ produkt: null, feil: e.message }, { status: 500 });
  }
}
