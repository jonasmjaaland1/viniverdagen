// Vinmonopolet-integrasjon
// - Søk: Open API (rask, gir kun navn + varenummer + forutsigbar bilde-URL)
// - Detaljer: Scraping av offentlig produktside (kun når brukeren velger en vin)
// - Strekkode: Open API gtin-parameter

const OPEN_API = 'https://apis.vinmonopolet.no/products/v0';
const PUBLIC_BASE = 'https://www.vinmonopolet.no';

interface VinmonopolProdukt {
  varenummer: string;
  navn: string;
  produkttype?: string;
  hovedkategori?: string;
  land?: string;
  distrikt?: string;
  underdistrikt?: string;
  argang?: string;
  druer?: string[];
  alkoholprosent?: number;
  pris?: number;
  pris_per_liter?: number;
  volum?: number;
  produsent?: string;
  bilde_url?: string;
  produkt_url?: string;
  lukt?: string;
  smak?: string;
  passer_til?: string[];
  ean?: string;
}

export function tilHovedkategori(produkttype: string | undefined): string {
  if (!produkttype) return 'Annet';
  const t = produkttype.toLowerCase();
  if (t.includes('rødvin') || t.includes('rodvin')) return 'Rødvin';
  if (t.includes('hvitvin')) return 'Hvitvin';
  if (t.includes('rosévin') || t.includes('rosevin')) return 'Rosévin';
  if (t.includes('musserende') || t.includes('champagne')) return 'Musserende';
  if (t.includes('dessert') || t.includes('sterkvin') || t.includes('hetvin')) return 'Dessert/Sterkvin';
  if (t.includes('øl') || t.includes('ol')) return 'Øl';
  if (t.includes('brennevin') || t.includes('whisky') || t.includes('cognac') || t.includes('aquavit') || t.includes('rom') || t.includes('gin') || t.includes('vodka')) return 'Brennevin';
  if (t.includes('sider')) return 'Sider';
  if (t.includes('mjød')) return 'Mjød';
  if (t.includes('alkoholfri')) return 'Alkoholfritt';
  return 'Annet';
}

// ============= SØK MOT OPEN API (RASKT - ingen scraping) =============

export async function sokOpenApi(spørring: string, limit: number = 10): Promise<{ varenummer: string; navn: string }[]> {
  const apiKey = process.env.VINMONOPOLET_API_KEY;
  if (!apiKey) {
    console.error('VINMONOPOLET_API_KEY mangler');
    return [];
  }

  const erVarenummer = /^\d{4,7}$/.test(spørring.trim());
  let url: string;

  if (erVarenummer) {
    url = `${OPEN_API}/details-normal?productId=${encodeURIComponent(spørring.trim())}&maxResults=1`;
  } else {
    url = `${OPEN_API}/details-normal?productShortNameContains=${encodeURIComponent(spørring)}&maxResults=${limit}`;
  }

  try {
    const res = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });
    if (!res.ok) {
      console.error('Open API feilet:', res.status);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((p: any) => p.basic?.productId && p.basic?.productShortName)
      .map((p: any) => ({
        varenummer: String(p.basic.productId),
        navn: p.basic.productShortName,
      }));
  } catch (e) {
    console.error('Feil ved Open API-søk:', e);
    return [];
  }
}

// ============= STREKKODE-OPPSLAG =============

export async function sokPaStrekkode(ean: string): Promise<{ varenummer: string; navn: string } | null> {
  const apiKey = process.env.VINMONOPOLET_API_KEY;
  if (!apiKey) {
    console.error('VINMONOPOLET_API_KEY mangler');
    return null;
  }

  const url = `${OPEN_API}/details-normal?gtin=${encodeURIComponent(ean.trim())}&maxResults=1`;

  try {
    const res = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const p = data[0];
    if (!p.basic?.productId) return null;

    return {
      varenummer: String(p.basic.productId),
      navn: p.basic.productShortName || '',
    };
  } catch (e) {
    console.error('Feil ved strekkode-oppslag:', e);
    return null;
  }
}

// ============= SCRAPE PRODUKTSIDE =============

function parsePris(text: string): number | undefined {
  const match = text.match(/Kr\s+([\d\s]+[,.]?\d*)/i);
  if (!match) return undefined;
  const tall = match[1].replace(/\s/g, '').replace(',', '.');
  const pris = parseFloat(tall);
  return isNaN(pris) ? undefined : pris;
}

function parseVolum(text: string): number | undefined {
  const clMatch = text.match(/(\d+(?:[,.]\d+)?)\s*cl/i);
  if (clMatch) {
    const cl = parseFloat(clMatch[1].replace(',', '.'));
    return cl / 100;
  }
  const lMatch = text.match(/(\d+(?:[,.]\d+)?)\s*l(?:iter)?/i);
  if (lMatch) {
    return parseFloat(lMatch[1].replace(',', '.'));
  }
  return undefined;
}

function metaTag(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeHtml(m[1]);
  }
  return undefined;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&aring;/g, 'å')
    .replace(/&aelig;/g, 'æ')
    .replace(/&oslash;/g, 'ø');
}

function parseGeografiFraUrl(url: string): { land?: string; distrikt?: string; underdistrikt?: string } {
  const m = url.match(/\/Land\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?/);
  if (!m) return {};
  return {
    land: m[1] ? decodeURIComponent(m[1].replace(/-/g, ' ')) : undefined,
    distrikt: m[2] ? decodeURIComponent(m[2].replace(/-/g, ' ')) : undefined,
    underdistrikt: m[3] ? decodeURIComponent(m[3].replace(/-/g, ' ')) : undefined,
  };
}

function parseBeskrivelse(beskrivelse: string): { produkttype?: string; smak?: string } {
  if (!beskrivelse) return {};
  const deler = beskrivelse.split('.').map(d => d.trim()).filter(Boolean);
  if (deler.length === 0) return {};

  const produkttype = deler[0];
  const smaksDeler = deler.slice(1).filter(d => !d.match(/Kr\s+[\d\s,]/i) && !d.match(/cl$|liter$|l$/i));
  const smak = smaksDeler.length > 0 ? smaksDeler.join('. ') + '.' : undefined;

  return { produkttype, smak };
}

export async function hentProduktDetaljer(varenummer: string, navn?: string): Promise<VinmonopolProdukt | null> {
  const url = `${PUBLIC_BASE}/p/${encodeURIComponent(varenummer)}`;

  try {
    // Avbryt scraping etter 5 sekunder
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'nb-NO,nb;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      // Fallback: returner bare navn og forutsigbart bilde
      return {
        varenummer,
        navn: navn || '',
        bilde_url: `https://bilder.vinmonopolet.no/cache/515x515-0/${varenummer}-1.jpg`,
        produkt_url: url,
      };
    }

    const html = await res.text();
    const finalUrl = res.url;

    const tittel = metaTag(html, 'og:title') || navn || '';
    const beskrivelse = metaTag(html, 'og:description') || metaTag(html, 'description') || '';
    const bilde = metaTag(html, 'og:image') || `https://bilder.vinmonopolet.no/cache/515x515-0/${varenummer}-1.jpg`;

    const { land, distrikt, underdistrikt } = parseGeografiFraUrl(finalUrl);
    const { produkttype, smak } = parseBeskrivelse(beskrivelse);
    const pris = parsePris(beskrivelse);
    const volum = parseVolum(beskrivelse);

    return {
      varenummer,
      navn: tittel,
      produkttype,
      hovedkategori: tilHovedkategori(produkttype),
      land,
      distrikt,
      underdistrikt,
      pris,
      volum,
      bilde_url: bilde,
      produkt_url: finalUrl,
      smak,
    };
  } catch (e) {
    // Ved feil/timeout: returner minimum data
    return {
      varenummer,
      navn: navn || '',
      bilde_url: `https://bilder.vinmonopolet.no/cache/515x515-0/${varenummer}-1.jpg`,
      produkt_url: url,
    };
  }
}

// ============= LETTVEKTS-SØK (uten scraping) =============
// Returnerer kun navn + varenummer + forutsigbart bilde
// Bruker cachen hvis tilgjengelig

export async function sokVinmonopolet(supabase: any, spørring: string, limit: number = 10) {
  const grunnTreff = await sokOpenApi(spørring, limit);
  if (grunnTreff.length === 0) return [];

  const varenumre = grunnTreff.map(t => t.varenummer);

  // Hent fra cache (hvis vi har scrapet før)
  const { data: cachet } = await supabase
    .from('vinmonopol_produkter')
    .select('*')
    .in('varenummer', varenumre);

  const cacheMap = new Map<string, any>();
  (cachet || []).forEach((c: any) => cacheMap.set(c.varenummer, c));

  // Returner cache der vi har det, ellers minimum data
  return grunnTreff.map(t => {
    const cache = cacheMap.get(t.varenummer);
    if (cache) {
      return cache;
    }
    return {
      varenummer: t.varenummer,
      navn: t.navn,
      bilde_url: `https://bilder.vinmonopolet.no/cache/515x515-0/${t.varenummer}-1.jpg`,
    };
  });
}

// ============= STREKKODE: SAMLET FLYT =============

export async function sokFraStrekkode(supabase: any, ean: string): Promise<VinmonopolProdukt | null> {
  const treff = await sokPaStrekkode(ean);
  if (!treff) return null;

  // Sjekk cache
  const enUkeSiden = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { data: cache } = await supabase
    .from('vinmonopol_produkter')
    .select('*')
    .eq('varenummer', treff.varenummer)
    .single();

  if (cache && cache.sist_oppdatert && new Date(cache.sist_oppdatert) > enUkeSiden) {
    return cache;
  }

  // Scrape detaljer
  const detaljer = await hentProduktDetaljer(treff.varenummer, treff.navn);
  if (!detaljer) return null;

  // Lagre i cache
  await supabase.from('vinmonopol_produkter').upsert({
    varenummer: detaljer.varenummer,
    navn: detaljer.navn,
    produkttype: detaljer.produkttype,
    hovedkategori: detaljer.hovedkategori,
    land: detaljer.land,
    distrikt: detaljer.distrikt,
    underdistrikt: detaljer.underdistrikt,
    pris: detaljer.pris,
    volum: detaljer.volum,
    bilde_url: detaljer.bilde_url,
    produkt_url: detaljer.produkt_url,
    smak: detaljer.smak,
    ean: ean,
    sist_oppdatert: new Date().toISOString(),
  }, { onConflict: 'varenummer' });

  return detaljer;
}

export async function hentProdukt(varenummer: string): Promise<VinmonopolProdukt | null> {
  return await hentProduktDetaljer(varenummer);
}

export async function hentAlleProdukter(): Promise<VinmonopolProdukt[]> {
  return [];
}
