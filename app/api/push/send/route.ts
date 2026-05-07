import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createServiceClient } from '@/lib/supabase-server';

// Sett opp web-push med VAPID-nøkler
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:noreply@viniverdagen.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface VarselPayload {
  tittel: string;
  tekst: string;
  url?: string;
  ikon?: string;
  ekskluderMedlem?: string; // Ikke send til denne brukeren (typisk avsender)
}

// POST /api/push/send
// Sender varsler til alle abonnenter (unntatt ekskluderMedlem)
// Beskyttet med CRON_SECRET for å hindre misbruk
export async function POST(req: NextRequest) {
  // Sjekk autentisering
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ feil: 'Ikke tillatt' }, { status: 401 });
  }

  const body: VarselPayload = await req.json();
  const { tittel, tekst, url, ikon, ekskluderMedlem } = body;

  if (!tittel || !tekst) {
    return NextResponse.json({ feil: 'Mangler tittel eller tekst' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Hent alle abonnementer (unntatt avsender)
  let query = supabase.from('push_abonnementer').select('*');
  if (ekskluderMedlem) {
    query = query.neq('medlem_id', ekskluderMedlem);
  }
  const { data: abonnementer, error } = await query;

  if (error) {
    return NextResponse.json({ feil: error.message }, { status: 500 });
  }

  if (!abonnementer || abonnementer.length === 0) {
    return NextResponse.json({ ok: true, sendt: 0 });
  }

  const payload = JSON.stringify({
    tittel,
    tekst,
    url: url || '/',
    ikon: ikon || '/icon-192.png',
  });

  let sendt = 0;
  let mislykket = 0;
  const ugyldige: string[] = [];

  await Promise.all(
    abonnementer.map(async (abo: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: abo.endpoint,
            keys: {
              p256dh: abo.p256dh,
              auth: abo.auth,
            },
          },
          payload
        );
        sendt++;
      } catch (e: any) {
        mislykket++;
        // Hvis abonnementet er ugyldig (404/410), slett det
        if (e.statusCode === 404 || e.statusCode === 410) {
          ugyldige.push(abo.endpoint);
        }
      }
    })
  );

  // Rydd opp i ugyldige abonnementer
  if (ugyldige.length > 0) {
    await supabase
      .from('push_abonnementer')
      .delete()
      .in('endpoint', ugyldige);
  }

  return NextResponse.json({ ok: true, sendt, mislykket, ryddet: ugyldige.length });
}
