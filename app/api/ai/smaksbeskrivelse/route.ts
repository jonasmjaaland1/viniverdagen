import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });
    }

    const body = await req.json();
    const { stikkord, vinNavn, vinType, vinLand, lengde, stil } = body;

    if (!stikkord || stikkord.trim().length < 2) {
      return NextResponse.json(
        { feil: 'Du må skrive noen stikkord først' },
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

    const lengdeBeskrivelse =
      lengde === 'kort' ? '1-2 setninger (under 30 ord)' :
      lengde === 'lang' ? '3-5 setninger (60-120 ord)' :
      '2-3 setninger (30-60 ord)';

    const stilBeskrivelse =
      stil === 'lekent' ? 'Lekent og personlig, gjerne med en humoristisk vri eller en visuell metafor.' :
      stil === 'profesjonelt' ? 'Profesjonelt og nøkternt, som en sommelier-anmeldelse.' :
      'Naturlig og ærlig, som en vennlig anbefaling fra en kollega.';

    const vinKontekst = [
      vinNavn && `Vin: ${vinNavn}`,
      vinType && `Type: ${vinType}`,
      vinLand && `Land: ${vinLand}`,
    ].filter(Boolean).join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `Du er en hjelper som skriver vin-anmeldelser på norsk for et vinklubb-medlem.

${vinKontekst ? `${vinKontekst}\n\n` : ''}Brukerens stikkord/inntrykk:
"${stikkord}"

Skriv en ${lengdeBeskrivelse} anmeldelse av vinen basert på disse stikkordene.

Stil: ${stilBeskrivelse}

Viktige regler:
- Skriv på naturlig norsk (bokmål)
- Bruk førsteperson ("Jeg synes...", "Den minner meg om...")
- Hold deg til informasjon brukeren har gitt - ikke finn på nye smaker eller egenskaper
- Ikke bruk anførselstegn eller markdown
- Returner KUN anmeldelsen som ren tekst - ingen overskrift, ingen "Her er en anmeldelse:", ikke noe annet

Anmeldelse:`,
        },
      ],
    });

    const tekstinnhold = response.content.find((c: any) => c.type === 'text');
    if (!tekstinnhold || tekstinnhold.type !== 'text') {
      return NextResponse.json(
        { feil: 'Klarte ikke å generere anmeldelse' },
        { status: 500 }
      );
    }

    const anmeldelse = tekstinnhold.text.trim()
      .replace(/^["']|["']$/g, '')  // fjern anførselstegn på start/slutt
      .replace(/^Anmeldelse:\s*/i, '');  // fjern eventuell prefix

    return NextResponse.json({ anmeldelse });
  } catch (e: any) {
    console.error('Smaksbeskrivelse-feil:', e);
    return NextResponse.json(
      { feil: e.message || 'Noe gikk galt' },
      { status: 500 }
    );
  }
}
