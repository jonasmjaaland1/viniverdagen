import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient, createServiceClient } from '@/lib/supabase-server';

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@viniverdagen.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// POST /api/push/test
// Sender et test-varsel til ALLE enheter til den innloggede brukeren
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });

  const service = createServiceClient();

  const { data: abonnementer } = await service
    .from('push_abonnementer')
    .select('*')
    .eq('medlem_id', user.id);

  if (!abonnementer || abonnementer.length === 0) {
    return NextResponse.json({ feil: 'Ingen aktive abonnementer' }, { status: 404 });
  }

  const payload = JSON.stringify({
    tittel: '🍷 Test-varsel',
    tekst: 'Hvis du ser denne, fungerer push-varslene!',
    url: '/innstillinger',
    ikon: '/icon-192.png',
  });

  let sendt = 0;
  await Promise.all(
    abonnementer.map(async (abo: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: abo.endpoint,
            keys: { p256dh: abo.p256dh, auth: abo.auth },
          },
          payload
        );
        sendt++;
      } catch (e) {
        console.error('Test-varsel feilet:', e);
      }
    })
  );

  return NextResponse.json({ ok: true, sendt });
}
