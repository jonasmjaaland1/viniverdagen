import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Verktøy AI har tilgang til
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'sok_viner',
    description: 'Søk i klubbens viner. Returnerer viner med snitt-score, antall smakinger, land, kategori, pris.',
    input_schema: {
      type: 'object',
      properties: {
        sok: { type: 'string', description: 'Søketekst (navn, produsent, område). Tom streng for å hente alle.' },
        kategori: { type: 'string', description: 'Filter: Rødvin, Hvitvin, Rosévin, Musserende, Dessertvin, etc.' },
        land: { type: 'string', description: 'Filter på land' },
        min_score: { type: 'number', description: 'Minimum snitt-score (1-10)' },
        maks_pris: { type: 'number', description: 'Maks pris i kroner' },
        limit: { type: 'number', description: 'Maks antall resultater (default 20)' },
      },
    },
  },
  {
    name: 'hent_topp_viner',
    description: 'Hent klubbens høyest scorede viner sortert etter snitt-score. Bruk når brukeren spør om "beste", "favoritt", "topp" viner.',
    input_schema: {
      type: 'object',
      properties: {
        kategori: { type: 'string', description: 'Filter på vinkategori' },
        land: { type: 'string', description: 'Filter på land' },
        limit: { type: 'number', description: 'Maks antall (default 10)' },
        min_smakinger: { type: 'number', description: 'Minst antall smakinger (default 1)' },
      },
    },
  },
  {
    name: 'hent_klubbkvelder',
    description: 'Hent klubbkvelder med dato, navn, antall viner, antall oppmøtte. Brukes for spørsmål om klubbkvelder.',
    input_schema: {
      type: 'object',
      properties: {
        siste: { type: 'number', description: 'Hent siste N kvelder (default 5)' },
      },
    },
  },
  {
    name: 'hent_klubbkveld_detaljer',
    description: 'Hent detaljer om en spesifikk klubbkveld: alle viner, scorer, kommentarer.',
    input_schema: {
      type: 'object',
      properties: {
        klubbkveld_id: { type: 'string', description: 'ID til klubbkvelden' },
      },
      required: ['klubbkveld_id'],
    },
  },
  {
    name: 'hent_medlems_smakinger',
    description: 'Hent et medlems scorer og kommentarer på viner. Brukes for spørsmål om "hva har X likt", "X sin favoritt", etc.',
    input_schema: {
      type: 'object',
      properties: {
        medlem_navn: { type: 'string', description: 'Navnet på medlemmet (kan være delvis match)' },
        sortert_etter: { type: 'string', enum: ['score', 'dato'], description: 'Sortér etter score (høyest først) eller dato (nyest først)' },
        limit: { type: 'number', description: 'Maks antall (default 10)' },
      },
      required: ['medlem_navn'],
    },
  },
  {
    name: 'hent_klubb_statistikk',
    description: 'Hent generell statistikk om klubben: antall viner, snittscore, fordeling per land/kategori, mest aktive medlemmer.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['oversikt', 'per_land', 'per_kategori', 'medlemmer'],
          description: 'Hvilken type statistikk',
        },
      },
      required: ['type'],
    },
  },
];

async function utforVerktoy(supabase: any, navn: string, input: any): Promise<string> {
  try {
    if (navn === 'sok_viner') {
      let query = supabase.from('vin_oversikt').select('*');
      if (input.sok && input.sok.trim()) {
        query = query.ilike('navn', `%${input.sok.trim()}%`);
      }
      if (input.kategori) {
        query = query.eq('hovedkategori', input.kategori);
      }
      if (input.land) {
        query = query.ilike('land', `%${input.land}%`);
      }
      if (input.min_score) {
        query = query.gte('snitt_total', input.min_score);
      }
      if (input.maks_pris) {
        query = query.lte('pris', input.maks_pris);
      }
      const limit = input.limit || 20;
      const { data, error } = await query.order('snitt_total', { ascending: false, nullsFirst: false }).limit(limit);
      if (error) return JSON.stringify({ feil: error.message });
      return JSON.stringify({ antall: data?.length || 0, viner: data || [] });
    }

    if (navn === 'hent_topp_viner') {
      let query = supabase.from('vin_oversikt').select('*');
      if (input.kategori) query = query.eq('hovedkategori', input.kategori);
      if (input.land) query = query.ilike('land', `%${input.land}%`);
      const minSmakinger = input.min_smakinger || 1;
      query = query.gte('antall_smakinger', minSmakinger);
      const { data, error } = await query
        .not('snitt_total', 'is', null)
        .order('snitt_total', { ascending: false })
        .limit(input.limit || 10);
      if (error) return JSON.stringify({ feil: error.message });
      return JSON.stringify({ antall: data?.length || 0, viner: data || [] });
    }

    if (navn === 'hent_klubbkvelder') {
      const limit = input.siste || 5;
      const { data, error } = await supabase
        .from('klubbkvelder')
        .select(`
          id,
          navn,
          dato,
          tema,
          smakinger:smakinger(count),
          oppmote(count)
        `)
        .order('dato', { ascending: false })
        .limit(limit);
      if (error) return JSON.stringify({ feil: error.message });
      return JSON.stringify({ antall: data?.length || 0, klubbkvelder: data || [] });
    }

    if (navn === 'hent_klubbkveld_detaljer') {
      const { data, error } = await supabase
        .from('klubbkvelder')
        .select(`
          id, navn, dato, tema,
          smakinger (
            id,
            varenummer,
            vinmonopol_produkter (navn, hovedkategori, land, produsent),
            medlemmer:tatt_med_av (navn),
            scorer (score, medlemmer (navn)),
            kommentarer (tekst, medlemmer (navn))
          )
        `)
        .eq('id', input.klubbkveld_id)
        .single();
      if (error) return JSON.stringify({ feil: error.message });
      return JSON.stringify(data);
    }

    if (navn === 'hent_medlems_smakinger') {
      const { data: medlem, error: e1 } = await supabase
        .from('medlemmer')
        .select('id, navn')
        .ilike('navn', `%${input.medlem_navn}%`)
        .limit(1)
        .maybeSingle();
      if (e1) return JSON.stringify({ feil: e1.message });
      if (!medlem) return JSON.stringify({ feil: `Fant ikke medlem som matcher "${input.medlem_navn}"` });

      const { data: scorer, error: e2 } = await supabase
        .from('scorer')
        .select(`
          score,
          opprettet_at,
          smakinger (
            varenummer,
            vinmonopol_produkter (navn, hovedkategori, land)
          )
        `)
        .eq('medlem_id', medlem.id)
        .order(input.sortert_etter === 'dato' ? 'opprettet_at' : 'score', { ascending: false })
        .limit(input.limit || 10);
      if (e2) return JSON.stringify({ feil: e2.message });
      return JSON.stringify({ medlem: medlem.navn, scorer: scorer || [] });
    }

    if (navn === 'hent_klubb_statistikk') {
      if (input.type === 'oversikt') {
        const [{ count: antVin }, { count: antSmak }, { count: antMedl }] = await Promise.all([
          supabase.from('vinmonopol_produkter').select('*', { count: 'exact', head: true }),
          supabase.from('smakinger').select('*', { count: 'exact', head: true }),
          supabase.from('medlemmer').select('*', { count: 'exact', head: true }).eq('godkjent', true),
        ]);
        const { data: snittData } = await supabase.from('vin_oversikt').select('snitt_total').not('snitt_total', 'is', null);
        const snitt = snittData && snittData.length > 0
          ? (snittData.reduce((a: number, b: any) => a + b.snitt_total, 0) / snittData.length).toFixed(2)
          : 'N/A';
        return JSON.stringify({ antall_viner: antVin, antall_smakinger: antSmak, antall_medlemmer: antMedl, gjennomsnitt_score: snitt });
      }
      if (input.type === 'per_land' || input.type === 'per_kategori') {
        const kolonne = input.type === 'per_land' ? 'land' : 'hovedkategori';
        const { data } = await supabase.from('vin_oversikt').select(`${kolonne}, snitt_total, antall_smakinger`);
        if (!data) return JSON.stringify({ feil: 'Ingen data' });
        const grupper: Record<string, { antall: number; snitt: number; total: number }> = {};
        for (const v of data as any[]) {
          const key = v[kolonne] || 'Ukjent';
          if (!grupper[key]) grupper[key] = { antall: 0, snitt: 0, total: 0 };
          grupper[key].antall += 1;
          if (v.snitt_total) {
            grupper[key].total += v.snitt_total;
            grupper[key].snitt = grupper[key].total / grupper[key].antall;
          }
        }
        return JSON.stringify({ grupper });
      }
      if (input.type === 'medlemmer') {
        const { data } = await supabase.from('medlemmer').select(`
          navn,
          scorer:scorer(count),
          smakinger:smakinger!tatt_med_av(count)
        `).eq('godkjent', true);
        return JSON.stringify({ medlemmer: data || [] });
      }
    }

    return JSON.stringify({ feil: `Ukjent verktøy: ${navn}` });
  } catch (e: any) {
    return JSON.stringify({ feil: e.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });
    }

    const { meldinger } = await req.json();
    if (!Array.isArray(meldinger) || meldinger.length === 0) {
      return NextResponse.json({ feil: 'Mangler meldinger' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ feil: 'API-nøkkel mangler' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = `Du er VinIverdagens AI-sommelier. Du har tilgang til klubbens database via verktøy og hjelper medlemmene med spørsmål om vinene de har drukket, klubbkveldene, og personlige preferanser.

Regler:
- Svar alltid på norsk (bokmål), naturlig og vennlig
- Bruk verktøyene for å hente faktiske data - ikke gjett eller finn på
- Når du presenterer viner, oppgi navn, kategori/land, snitt-score, og antall smakinger
- For score: vis alltid med 1 desimal (8.4, ikke 8)
- Hvis brukeren spør om noe som ikke finnes i databasen, si det ærlig
- Vær konsis - ikke overforklar
- Bruk gjerne emoji som 🍷 ⭐ 🥂 sparsomt for å gi varme
- Når brukeren spør om "klubbens favoritt", "beste", osv. - bruk hent_topp_viner med min_smakinger=2 for relevans

Du kan kombinere verktøy: f.eks. først hent_klubb_statistikk, deretter sok_viner for å gi rikere svar.`;

    const conversationMessages: Anthropic.MessageParam[] = meldinger.map((m: any) => ({
      role: m.rolle,
      content: m.innhold,
    }));

    const verktoyKall: Array<{ navn: string; input: any }> = [];
    let svar = '';
    let iterasjon = 0;
    const maksIterasjoner = 10;

    while (iterasjon < maksIterasjoner) {
      iterasjon++;

      const respons = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: systemPrompt,
        tools: TOOLS,
        messages: conversationMessages,
      });

      // Sjekk om AI vil bruke verktøy
      const verktoyBlokker = respons.content.filter((c: any) => c.type === 'tool_use');
      const tekstBlokker = respons.content.filter((c: any) => c.type === 'text');

      if (verktoyBlokker.length === 0) {
        // AI er ferdig - returnér tekstsvaret
        svar = tekstBlokker.map((b: any) => b.text).join('\n').trim();
        break;
      }

      // AI vil bruke verktøy - utfør dem og gi resultatene tilbake
      conversationMessages.push({
        role: 'assistant',
        content: respons.content,
      });

      const verktoyResultater: any[] = [];
      for (const blokk of verktoyBlokker as any[]) {
        verktoyKall.push({ navn: blokk.name, input: blokk.input });
        const resultat = await utforVerktoy(supabase, blokk.name, blokk.input);
        verktoyResultater.push({
          type: 'tool_result',
          tool_use_id: blokk.id,
          content: resultat,
        });
      }

      conversationMessages.push({
        role: 'user',
        content: verktoyResultater,
      });
    }

    if (!svar) {
      svar = 'Beklager, jeg klarte ikke å lage et godt svar. Prøv å spørre på en annen måte.';
    }

    return NextResponse.json({ svar, verktoyKall });
  } catch (e: any) {
    console.error('AI-chat-feil:', e);
    return NextResponse.json({ feil: e.message || 'Noe gikk galt' }, { status: 500 });
  }
}
