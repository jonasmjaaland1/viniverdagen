import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase-server';

// DELETE /api/viner/[varenummer]
// Sletter en vin og alle relaterte smakinger, scorer og kommentarer.
// Kun admin har tilgang.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ varenummer: string }> }
) {
  const { varenummer } = await params;

  // Sjekk innlogging og admin-status
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });

  const { data: medlem } = await supabase
    .from('medlemmer')
    .select('er_admin')
    .eq('id', user.id)
    .single();

  if (!medlem?.er_admin) {
    return NextResponse.json({ feil: 'Ikke tillatt' }, { status: 403 });
  }

  // Bruk service-klient for å slette (omgår RLS)
  const service = createServiceClient();

  // Hent alle smakinger av denne vinen
  const { data: smakinger } = await service
    .from('smakinger')
    .select('id')
    .eq('varenummer', varenummer);

  const smakingIds = (smakinger || []).map(s => s.id);

  if (smakingIds.length > 0) {
    // Slett kommentarer
    const { error: e1 } = await service
      .from('kommentarer')
      .delete()
      .in('smaking_id', smakingIds);
    if (e1) {
      return NextResponse.json({ feil: 'Kunne ikke slette kommentarer: ' + e1.message }, { status: 500 });
    }

    // Slett scorer
    const { error: e2 } = await service
      .from('scorer')
      .delete()
      .in('smaking_id', smakingIds);
    if (e2) {
      return NextResponse.json({ feil: 'Kunne ikke slette scorer: ' + e2.message }, { status: 500 });
    }

    // Slett smakinger
    const { error: e3 } = await service
      .from('smakinger')
      .delete()
      .in('id', smakingIds);
    if (e3) {
      return NextResponse.json({ feil: 'Kunne ikke slette smakinger: ' + e3.message }, { status: 500 });
    }
  }

  // Slett selve vinen fra cachen
  const { error: e4 } = await service
    .from('vinmonopol_produkter')
    .delete()
    .eq('varenummer', varenummer);
  if (e4) {
    return NextResponse.json({ feil: 'Kunne ikke slette vin: ' + e4.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
