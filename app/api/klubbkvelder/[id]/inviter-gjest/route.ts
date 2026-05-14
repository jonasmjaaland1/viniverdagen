// app/api/klubbkvelder/[id]/inviter-gjest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: klubbkveldId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ feil: "Ikke innlogget" }, { status: 401 });
    }

    const { data: meg } = await supabase
      .from("medlemmer")
      .select("er_admin")
      .eq("id", user.id)
      .single();

    if (!meg?.er_admin) {
      return NextResponse.json({ feil: "Krever admin" }, { status: 403 });
    }

    const { navn, epost, sendEpost } = await req.json();
    if (!navn?.trim() || !epost?.trim()) {
      return NextResponse.json(
        { feil: "Navn og e-post må oppgis" },
        { status: 400 },
      );
    }

    const epostRen = epost.trim().toLowerCase();
    const service = createServiceClient();

    // Finn/opprett bruker
    const {
      data: { users },
      error: listErr,
    } = await service.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json(
        { feil: "Kunne ikke sjekke brukere: " + listErr.message },
        { status: 500 },
      );
    }

    let gjestId: string;
    const eksisterende = users?.find(
      (u: any) => u.email?.toLowerCase() === epostRen,
    );

    if (eksisterende) {
      gjestId = eksisterende.id;

      const { data: medlem } = await service
        .from("medlemmer")
        .select("id")
        .eq("id", gjestId)
        .maybeSingle();

      if (!medlem) {
        const { error: e } = await service.from("medlemmer").insert({
          id: gjestId,
          navn: navn.trim(),
          epost: epostRen,
          godkjent: true,
          er_gjest: true,
          er_klubbmedlem: false,
          er_admin: false,
        });
        if (e) {
          return NextResponse.json(
            { feil: "Kunne ikke opprette medlem: " + e.message },
            { status: 500 },
          );
        }
      }
    } else {
      const { data: ny, error: createErr } =
        await service.auth.admin.createUser({
          email: epostRen,
          email_confirm: true,
        });

      if (createErr || !ny.user) {
        return NextResponse.json(
          {
            feil:
              "Kunne ikke opprette bruker: " +
              (createErr?.message || "Ukjent feil"),
          },
          { status: 500 },
        );
      }

      gjestId = ny.user.id;

      const { error: medlemErr } = await service.from("medlemmer").insert({
        id: gjestId,
        navn: navn.trim(),
        epost: epostRen,
        godkjent: true,
        er_gjest: true,
        er_klubbmedlem: false,
        er_admin: false,
      });

      if (medlemErr) {
        return NextResponse.json(
          { feil: "Kunne ikke opprette medlem: " + medlemErr.message },
          { status: 500 },
        );
      }
    }

    // Legg til som gjest
    const { error: gjestErr } = await service
      .from("klubbkveld_gjester")
      .insert({
        klubbkveld_id: klubbkveldId,
        medlem_id: gjestId,
        invitert_av: user.id,
      });

    if (gjestErr && gjestErr.code !== "23505") {
      return NextResponse.json(
        { feil: "Kunne ikke invitere: " + gjestErr.message },
        { status: 500 },
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.viniverdagen.com";

    // Generer magic link (returnerer lenken)
    const { data: linkData, error: linkErr } =
      await service.auth.admin.generateLink({
        type: "magiclink",
        email: epostRen,
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=/klubbkvelder/${klubbkveldId}`,
        },
      });

    if (linkErr || !linkData) {
      return NextResponse.json(
        {
          feil: "Kunne ikke generere lenke: " + (linkErr?.message || "Ukjent"),
        },
        { status: 500 },
      );
    }

    const lenke = linkData.properties?.action_link || null;

    // Send e-post hvis ønsket
    let epostSendt = false;
    let epostFeil: string | null = null;

    if (sendEpost !== false) {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: epostRen,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=/klubbkvelder/${klubbkveldId}`,
        },
      });
      if (otpErr) {
        epostFeil = otpErr.message;
      } else {
        epostSendt = true;
      }
    }

    return NextResponse.json({
      ok: true,
      gjest_id: gjestId,
      lenke,
      epost_sendt: epostSendt,
      epost_feil: epostFeil,
    });
  } catch (e: any) {
    console.error("Inviter-gjest-feil:", e);
    return NextResponse.json({ feil: e.message }, { status: 500 });
  }
}
