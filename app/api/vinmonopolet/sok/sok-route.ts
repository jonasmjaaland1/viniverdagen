import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { sokVinmonopolet } from '@/lib/vinmonopolet';

// Søk: GET /api/vinmonopolet/sok?q=...
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ resultater: [] });
  }

  try {
    const resultater = await sokVinmonopolet(supabase, q, 10);
    return NextResponse.json({ resultater });
  } catch (e: any) {
    return NextResponse.json({ resultater: [], feil: e.message }, { status: 500 });
  }
}
