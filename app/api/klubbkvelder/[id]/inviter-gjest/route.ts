// app/api/klubbkvelder/[id]/inviter-gjest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 20;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: klubbkveldId } = await params;

    // Bare admin kan invitere
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });
    }

    const { data: meg } = await supabase
      .from('medlemmer')
      .select('er_admin')
      .eq('id', user.id)
      .single();

    if (!meg?.er_admin) {
      return NextResponse.json({ feil: 'Krever admin' }, { status: 403 });
    }

    const { navn, epost } = await req.json();
    if (!navn?.trim() || !epost?.trim()) {
      return NextResponse.json({ feil: 'Navn og e-post må oppgis' }, { status: 400 });
    }

    const epostRen = epost.trim().toLowerCase();

    const service = createServiceClient();

    // Sjekk om bruker allerede finnes
    const { data: { users }, error: listErr } = await service.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json({ feil: 'Kunne ikke sjekke brukere: ' + listErr.message }, { status: 500 });
    }

    let gjestId: string;
    const eksisterende = users?.find((u: any) => u.email?.toLowerCase() === epostRen);

    if (eksisterende) {
      gjestId = eksisterende.id;

      // Sjekk medlems-status
      const { data: medlem } = await service
        .from('medlemmer')
        .select('id, er_gjest, godkjent')
        .eq('id', gjestId)
        .maybeSingle();

      if (!medlem) {
        // Bruker finnes i auth men ikke som medlem - opprett som gjest
        const { error: e } = await service.from('medlemmer').insert({
          id: gjestId,
          navn: navn.trim(),
          godkjent: true,
          er_gjest: true,
          er_klubbmedlem: false,
          er_admin: false,
        });
        if (e) {
          return NextResponse.json({ feil: 'Kunne ikke opprette medlem: ' + e.message }, { status: 500 });
        }
      }
    } else {
      // Opprett ny bruker via Admin API
      const { data: ny, error: createErr } = await service.auth.admin.createUser({
        email: epostRen,
        email_confirm: true,  // skip e-postbekreftelse
      });

      if (createErr || !ny.user) {
        return NextResponse.json({ feil: 'Kunne ikke opprette bruker: ' + (createErr?.message || 'Ukjent feil') }, { status: 500 });
      }

      gjestId = ny.user.id;

      // Opprett medlems-rad som gjest
      const { error: medlemErr } = await service.from('medlemmer').insert({
        id: gjestId,
        navn: navn.trim(),
        godkjent: true,
        er_gjest: true,
        er_klubbmedlem: false,
        er_admin: false,
      });

      if (medlemErr) {
        return NextResponse.json({ feil: 'Kunne ikke opprette medlem: ' + medlemErr.message }, { status: 500 });
      }
    }

    // Legg til som gjest på klubbkvelden
    const { error: gjestErr } = await service.from('klubbkveld_gjester').insert({
      klubbkveld_id: klubbkveldId,
      medlem_id: gjestId,
      invitert_av: user.id,
    });

    if (gjestErr) {
      // Hvis det allerede er invitert, er det greit
      if (gjestErr.code !== '23505') {
        return NextResponse.json({ feil: 'Kunne ikke invitere: ' + gjestErr.message }, { status: 500 });
      }
    }

    // Send magic link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.viniverdagen.com';
    const { error: linkErr } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: epostRen,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/klubbkvelder/${klubbkveldId}`,
      },
    });

    // Vi sender ikke selve e-posten manuelt - Supabase bruker SMTP-en vi har satt opp (Resend)
    // generateLink trigger ikke e-post automatisk. Vi må bruke inviteUserByEmail i stedet.
    // Eller bruke signInWithOtp som sender e-post.

    // Alternativ: bruk signInWithOtp for å sende e-post med magic link
    const supabaseAnon = await createClient();
    const { error: otpErr } = await supabaseAnon.auth.signInWithOtp({
      email: epostRen,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/klubbkvelder/${klubbkveldId}`,
      },
    });

    if (otpErr) {
      // Brukeren er invitert, men e-post feilet
      return NextResponse.json({
        ok: true,
        advarsel: `Gjest er lagt til, men e-post feilet: ${otpErr.message}. Be brukeren logge inn manuelt på ${siteUrl}/login`,
      });
    }

    return NextResponse.json({ ok: true, gjest_id: gjestId });
  } catch (e: any) {
    console.error('Inviter-gjest-feil:', e);
    return NextResponse.json({ feil: e.message }, { status: 500 });
  }
}
