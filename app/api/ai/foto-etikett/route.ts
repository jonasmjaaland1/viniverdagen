import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fil = formData.get("bilde") as File | null;

    if (!fil) {
      return NextResponse.json({ feil: "Bilde mangler" }, { status: 400 });
    }

    // Konverter bilde til base64
    const buffer = Buffer.from(await fil.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mediaType = fil.type as
      | "image/jpeg"
      | "image/png"
      | "image/webp"
      | "image/gif";

    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        mediaType,
      )
    ) {
      return NextResponse.json(
        { feil: "Bildet må være JPEG, PNG, WebP eller GIF" },
        { status: 400 },
      );
    }

    // Sjekk størrelse - max 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { feil: "Bildet er for stort. Maks 5MB." },
        { status: 400 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { feil: "API-nøkkel mangler på serveren" },
        { status: 500 },
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: `Du ser på bildet av en vinetikett. Identifiser vinen og returner KUN gyldig JSON med følgende struktur (ingen forklaring, ingen markdown):

{
  "navn": "produsent + vinnavn (f.eks. Antinori Tignanello)",
  "produsent": "produsenten",
  "vinnavn": "navnet på vinen uten produsent",
  "argang": "årstall hvis synlig, ellers null",
  "land": "landet hvis du kan se det",
  "type": "rødvin/hvitvin/rosévin/musserende/dessertvin/annet",
  "sokestreng": "kortest mulig søkestreng for å finne vinen på Vinmonopolet (uten årstall)"
}

Hvis du ikke ser en vinetikett tydelig, returner: {"feil": "Kunne ikke lese vinetiketten tydelig"}

Eksempel sokestreng:
- "Antinori Tignanello" → "Tignanello"
- "Domaine de la Romanée-Conti La Tâche" → "La Tâche"
- "Château Margaux" → "Château Margaux"

Returner kun JSON, ingenting annet.`,
            },
          ],
        },
      ],
    });

    // Hent ut tekstinnholdet
    const tekstinnhold = response.content.find((c: any) => c.type === "text");
    if (!tekstinnhold || tekstinnhold.type !== "text") {
      return NextResponse.json(
        { feil: "Klarte ikke å lese vinetiketten" },
        { status: 500 },
      );
    }

    let parsed;
    try {
      // Fjern eventuelle markdown-fences hvis Claude la dem til
      const renTekst = tekstinnhold.text
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(renTekst);
    } catch (e) {
      return NextResponse.json(
        { feil: "Klarte ikke å tolke svaret fra AI", svar: tekstinnhold.text },
        { status: 500 },
      );
    }

    if (parsed.feil) {
      return NextResponse.json({ feil: parsed.feil }, { status: 400 });
    }

    // Søk opp i Vinmonopolet basert på sokestreng
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    const sokRes = await fetch(
      `${baseUrl}/api/vinmonopolet/sok?q=${encodeURIComponent(parsed.sokestreng || parsed.vinnavn || parsed.navn)}`,
    );
    const sokData = await sokRes.json();

    return NextResponse.json({
      identifisert: parsed,
      resultater: sokData.resultater || [],
    });
  } catch (e: any) {
    console.error("AI-foto-feil:", e);
    return NextResponse.json(
      { feil: e.message || "Noe gikk galt" },
      { status: 500 },
    );
  }
}
