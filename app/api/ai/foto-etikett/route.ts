import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, createServiceClient } from '@/lib/supabase-server';
import { sokVinmonopolet, hentProdukt, tilHovedkategori } from '@/lib/vinmonopolet';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });
    }

    const formData = await req.formData();
    const fil = formData.get('bilde') as File | null;

    if (!fil) {
      return NextResponse.json({ feil: 'Bilde mangler' }, { status: 400 });
    }

    const buffer = Buffer.from(await fil.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mediaType = fil.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mediaType)) {
      return NextResponse.json(
        { feil: 'Bildet må være JPEG, PNG, WebP eller GIF' },
        { status: 400 }
      );
    }

    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { feil: 'Bildet er for stort. Maks 5MB.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { feil: 'API-nøkkel mangler på serveren' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Du ser på en vinetikett. Identifiser vinen og returner KUN gyldig JSON (ingen markdown, ingen forklaring):

{
  "produsent": "produsenten med korrekt skrivemåte (med bindestrek hvis det er det)",
  "vinnavn": "navnet på vinen",
  "drueype": "druetype hvis synlig (f.eks. Riesling, Pinot Noir)",
  "argang": "årstall hvis synlig, ellers null",
  "land": "landet",
  "type": "rødvin/hvitvin/rosévin/musserende/dessertvin/annet",
  "konfidens": 1-10 (hvor sikker du er på at du leser etiketten korrekt - 10 = helt sikker, 1 = veldig usikker),
  "sokestrenger": [
    "den mest sannsynlige korte søkestrengen for Vinmonopolet",
    "en kortere variant kun produsent + ett sentralt ord",
    "kun produsentnavn"
  ]
}

Konfidens vurderes basert på:
- 9-10: Tydelig etikett, all tekst lesbar, ingen tvil
- 7-8: Hovedinformasjonen klart synlig
- 5-6: Noe usikkerhet på en eller flere detaljer
- 3-4: Mange detaljer er uklare
- 1-2: Du gjetter mest

Sokestrenger MÅ være 3 ulike forsøk fra mest spesifikk til minst:
- Forsøk 1: produsent + vinnavn (uten årstall)
- Forsøk 2: produsent + ett sentralt ord
- Forsøk 3: kun produsenten

Eksempler:
- "Kruger-Rumpf Phyllit" → ["Kruger-Rumpf Phyllit Riesling", "Kruger-Rumpf Phyllit", "Kruger-Rumpf"]
- "Antinori Tignanello" → ["Antinori Tignanello", "Tignanello", "Antinori"]

Hvis du ikke ser vinetikett: {"feil": "Kunne ikke lese vinetiketten tydelig"}

Returner kun JSON.`,
            },
          ],
        },
      ],
    });

    const tekstinnhold = response.content.find((c: any) => c.type === 'text');
    if (!tekstinnhold || tekstinnhold.type !== 'text') {
      return NextResponse.json({ feil: 'Klarte ikke å lese vinetiketten' }, { status: 500 });
    }

    let parsed;
    try {
      const renTekst = tekstinnhold.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(renTekst);
    } catch (e) {
      return NextResponse.json(
        { feil: 'Klarte ikke å tolke svaret fra AI', svar: tekstinnhold.text },
        { status: 500 }
      );
    }

    if (parsed.feil) {
      return NextResponse.json({ feil: parsed.feil }, { status: 400 });
    }

    const navn = `${parsed.produsent || ''} ${parsed.vinnavn || ''}`.trim();
    const identifisert = {
      navn,
      produsent: parsed.produsent,
      vinnavn: parsed.vinnavn,
      drueype: parsed.drueype,
      argang: parsed.argang,
      land: parsed.land,
      type: parsed.type,
      konfidens: parsed.konfidens || 5,
    };

    const sokestrenger = parsed.sokestrenger || [navn];
    let resultater: any[] = [];
    let brukteSokestreng = '';

    for (const sokestreng of sokestrenger) {
      if (!sokestreng) continue;
      try {
        const trefferLokalt = await sokVinmonopolet(supabase, sokestreng, 10);
        if (trefferLokalt.length > 0) {
          resultater = trefferLokalt;
          brukteSokestreng = sokestreng;
          break;
        }
      } catch {
        continue;
      }
    }

    // Sjekk om første treff er et godt match
    let kanAutoVelge = false;
    if (resultater.length > 0 && parsed.konfidens >= 8) {
      const forste = resultater[0];
      const forsteNavn = (forste.navn || '').toLowerCase();
      const produsent = (parsed.produsent || '').toLowerCase();
      const vinnavn = (parsed.vinnavn || '').toLowerCase();

      // Et "godt match" = produsent OG vinnavn finnes i resultatets navn
      const harProdusent = produsent && forsteNavn.includes(produsent.replace('-', '').replace(' ', ''))
        || produsent && forsteNavn.includes(produsent);
      const harVinnavn = vinnavn && forsteNavn.includes(vinnavn);

      if (harProdusent && (harVinnavn || resultater.length === 1)) {
        kanAutoVelge = true;
      }
    }

    return NextResponse.json({
      identifisert,
      resultater,
      brukteSokestreng,
      alleSokestrenger: sokestrenger,
      kanAutoVelge,
    });
  } catch (e: any) {
    console.error('AI-foto-feil:', e);
    return NextResponse.json(
      { feil: e.message || 'Noe gikk galt' },
      { status: 500 }
    );
  }
}
