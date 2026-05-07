import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// POST /api/push/abonner
// Lagrer et push-abonnement i databasen
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });

  const { abonnement, enhetsnavn } = await req.json();

  if (!abonnement?.endpoint || !abonnement?.keys?.p256dh || !abonnement?.keys?.auth) {
    return NextResponse.json({ feil: 'Ugyldig abonnement' }, { status: 400 });
  }

  const { error } = await supabase.from('push_abonnementer').upsert({
    medlem_id: user.id,
    endpoint: abonnement.endpoint,
    p256dh: abonnement.keys.p256dh,
    auth: abonnement.keys.auth,
    enhetsnavn: enhetsnavn || null,
    sist_brukt: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  if (error) {
    return NextResponse.json({ feil: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/push/abonner
// Sletter et abonnement
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) {
    return NextResponse.json({ feil: 'Mangler endpoint' }, { status: 400 });
  }

  const { error } = await supabase
    .from('push_abonnementer')
    .delete()
    .eq('medlem_id', user.id)
    .eq('endpoint', endpoint);

  if (error) {
    return NextResponse.json({ feil: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
