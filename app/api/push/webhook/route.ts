import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createServiceClient } from '@/lib/supabase-server';

// Sett opp web-push
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@viniverdagen.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// POST /api/push/webhook
// Mottar database-events fra Supabase og sender push-varsler
export async function POST(req: NextRequest) {
  // Sjekk autentisering med CRON_SECRET
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ feil: 'Ikke tillatt' }, { status: 401 });
  }

  const body = await req.json();
  const { table, type, record, old_record } = body;

  // Bestem varselinnhold basert på tabell og hendelse
  let varsel: { tittel: string; tekst: string; url: string; ekskluderMedlem?: string } | null = null;

  const supabase = createServiceClient();

  if (table === 'meldinger' && type === 'INSERT') {
    // Hent avsender-navn
    const { data: medlem } = await supabase
      .from('medlemmer')
      .select('navn')
      .eq('id', record.medlem_id)
      .single();

    const navn = medlem?.navn || 'Noen';
    let forhandsvisning = record.tekst || '📷 Bilde';
    if (forhandsvisning.length > 80) {
      forhandsvisning = forhandsvisning.substring(0, 77) + '...';
    }

    varsel = {
      tittel: `💬 ${navn}`,
      tekst: forhandsvisning,
      url: '/chat',
      ekskluderMedlem: record.medlem_id,
    };
  } else if (table === 'klubbkvelder' && type === 'INSERT') {
    varsel = {
      tittel: '🍷 Ny klubbkveld',
      tekst: `${record.tema || 'Ny klubbkveld'} er opprettet`,
      url: `/klubbkvelder/${record.id}`,
      ekskluderMedlem: record.opprettet_av,
    };
  } else if (table === 'smakinger' && type === 'INSERT') {
    // Hent vin-navn
    const { data: vin } = await supabase
      .from('vinmonopol_produkter')
      .select('navn')
      .eq('varenummer', record.varenummer)
      .single();

    const { data: medlem } = await supabase
      .from('medlemmer')
      .select('navn')
      .eq('id', record.tatt_med_av)
      .single();

    if (record.klubbkveld_id) {
      varsel = {
        tittel: '🍷 Ny vin på klubbkvelden',
        tekst: `${medlem?.navn || 'Noen'} tok med ${vin?.navn || 'en vin'}`,
        url: `/klubbkvelder/${record.klubbkveld_id}`,
        ekskluderMedlem: record.tatt_med_av,
      };
    } else {
      varsel = {
        tittel: '🍷 Ny vin lagt til',
        tekst: `${medlem?.navn || 'Noen'} la til ${vin?.navn || 'en vin'}`,
        url: `/viner/${record.varenummer}`,
        ekskluderMedlem: record.tatt_med_av,
      };
    }
  } else if (table === 'scorer' && type === 'INSERT') {
    // Hent smaking + vin-info
    const { data: smaking } = await supabase
      .from('smakinger')
      .select(`
        varenummer,
        tatt_med_av,
        vinmonopol_produkter(navn)
      `)
      .eq('id', record.smaking_id)
      .single();

    const { data: medlem } = await supabase
      .from('medlemmer')
      .select('navn')
      .eq('id', record.medlem_id)
      .single();

    const vinNavn = (smaking?.vinmonopol_produkter as any)?.navn || 'en vin';
    varsel = {
      tittel: `⭐ Ny score: ${record.score}/10`,
      tekst: `${medlem?.navn || 'Noen'} ga ${record.score}/10 til ${vinNavn}`,
      url: smaking?.varenummer ? `/viner/${smaking.varenummer}` : '/',
      ekskluderMedlem: record.medlem_id,
    };
  } else if (table === 'kommentarer' && type === 'INSERT') {
    // Hent smaking + vin-info
    const { data: smaking } = await supabase
      .from('smakinger')
      .select(`
        varenummer,
        vinmonopol_produkter(navn)
      `)
      .eq('id', record.smaking_id)
      .single();

    const { data: medlem } = await supabase
      .from('medlemmer')
      .select('navn')
      .eq('id', record.medlem_id)
      .single();

    const vinNavn = (smaking?.vinmonopol_produkter as any)?.navn || 'en vin';
    let forhandsvisning = record.tekst || '';
    if (forhandsvisning.length > 60) {
      forhandsvisning = forhandsvisning.substring(0, 57) + '...';
    }

    varsel = {
      tittel: `💭 ${medlem?.navn || 'Noen'} kommenterte`,
      tekst: `På ${vinNavn}: ${forhandsvisning}`,
      url: smaking?.varenummer ? `/viner/${smaking.varenummer}` : '/',
      ekskluderMedlem: record.medlem_id,
    };
  }

  if (!varsel) {
    return NextResponse.json({ ok: true, hopp: true });
  }

  // Hent alle abonnementer (unntatt ekskluderMedlem)
  let query = supabase.from('push_abonnementer').select('*');
  if (varsel.ekskluderMedlem) {
    query = query.neq('medlem_id', varsel.ekskluderMedlem);
  }
  const { data: abonnementer } = await query;

  if (!abonnementer || abonnementer.length === 0) {
    return NextResponse.json({ ok: true, sendt: 0 });
  }

  const payload = JSON.stringify({
    tittel: varsel.tittel,
    tekst: varsel.tekst,
    url: varsel.url,
    ikon: '/icon-192.png',
  });

  let sendt = 0;
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
        if (e.statusCode === 404 || e.statusCode === 410) {
          ugyldige.push(abo.endpoint);
        }
      }
    })
  );

  if (ugyldige.length > 0) {
    await supabase.from('push_abonnementer').delete().in('endpoint', ugyldige);
  }

  return NextResponse.json({ ok: true, sendt, ryddet: ugyldige.length });
}
