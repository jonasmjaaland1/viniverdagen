// Vinmonopolet-integrasjon
// - Søk: bruker Open API (krever API-nøkkel, gir kun navn + varenummer)
// - Detaljer: scraper offentlige produktsider på vinmonopolet.no
//   (siden Open API ikke gir pris/land/druer)
 
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
 
// ============= SØK MOT OPEN API =============
 
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
 
// ============= SCRAPE PRODUKTSIDE =============
 
// Parser pris fra "Kr 229,90, 75 cl" eller "Kr 1 234,50, 75 cl"
function parsePris(text: string): number | undefined {
  const match = text.match(/Kr\s+([\d\s]+[,.]?\d*)/i);
  if (!match) return undefined;
  const tall = match[1].replace(/\s/g, '').replace(',', '.');
  const pris = parseFloat(tall);
  return isNaN(pris) ? undefined : pris;
}
 
// Parser volum fra "75 cl" eller "0,75 L"
function parseVolum(text: string): number | undefined {
  const clMatch = text.match(/(\d+(?:[,.]\d+)?)\s*cl/i);
  if (clMatch) {
    const cl = parseFloat(clMatch[1].replace(',', '.'));
    return cl / 100; // til liter
  }
  const lMatch = text.match(/(\d+(?:[,.]\d+)?)\s*l(?:iter)?/i);
  if (lMatch) {
    return parseFloat(lMatch[1].replace(',', '.'));
  }
  return undefined;
}
 
// Hent meta-tag fra HTML
function metaTag(html: string, property: string): string | undefined {
  // Match både property="..." og name="..." varianter
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
 
// Parse land og distrikt fra Vinmonopolet-URL
// Eksempel: /Land/Italia/Veneto/Valpolicella-Ripasso/Sartori-...-/p/1174701
function parseGeografiFraUrl(url: string): { land?: string; distrikt?: string; underdistrikt?: string } {
  const m = url.match(/\/Land\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?/);
  if (!m) return {};
  return {
    land: m[1] ? m[1].replace(/-/g, ' ') : undefined,
    distrikt: m[2] ? m[2].replace(/-/g, ' ') : undefined,
    underdistrikt: m[3] ? m[3].replace(/-/g, ' ') : undefined,
  };
}
 
// Parse type og smaksbeskrivelse fra meta-description
// Format: "Rødvin. Tørr og fyldig. Rund og bløt frukt. Lang ettersmak. ... . Kr 229,90, 75 cl"
function parseBeskrivelse(beskrivelse: string): { produkttype?: string; smak?: string } {
  if (!beskrivelse) return {};
  // Første ord før første punktum er typisk produkttype
  const deler = beskrivelse.split('.').map(d => d.trim()).filter(Boolean);
  if (deler.length === 0) return {};
 
  const produkttype = deler[0];
 
  // Smak er resten av setningene, men uten den siste som inneholder pris
  const smaksDeler = deler.slice(1).filter(d => !d.match(/Kr\s+[\d\s,]/i) && !d.match(/cl$|liter$|l$/i));
  const smak = smaksDeler.length > 0 ? smaksDeler.join('. ') + '.' : undefined;
 
  return { produkttype, smak };
}
 
// Hent produktdetaljer ved å scrape produktsiden
export async function hentProduktDetaljer(varenummer: string, navn?: string): Promise<VinmonopolProdukt | null> {
  // Vinmonopolet redirecter /p/{varenummer} til riktig URL
  const url = `${PUBLIC_BASE}/p/${encodeURIComponent(varenummer)}`;
 
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'nb-NO,nb;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });
 
    if (!res.ok) {
      console.error('Produktside feilet:', res.status, varenummer);
      return null;
    }
 
    const html = await res.text();
    const finalUrl = res.url;
 
    // Hent meta-tagger
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
    console.error('Feil ved scraping:', e);
    return null;
  }
}
 
// ============= SAMLET SØK =============
// Brukes av /api/vinmonopolet/sok
// Steg 1: Open API gir navn + varenummer
// Steg 2: For hvert resultat, hent detaljer fra produktsiden (parallellt)
// Steg 3: Lagre alt i Supabase-cachen
 
export async function sokVinmonopolet(
  supabase: any,
  spørring: string,
  limit: number = 10
) {
  const grunnTreff = await sokOpenApi(spørring, limit);
  if (grunnTreff.length === 0) return [];
 
  // Sjekk hva vi allerede har i cache
  const varenumre = grunnTreff.map(t => t.varenummer);
  const { data: cachet } = await supabase
    .from('vinmonopol_produkter')
    .select('*')
    .in('varenummer', varenumre);
 
  const cacheMap = new Map<string, any>();
  (cachet || []).forEach((c: any) => cacheMap.set(c.varenummer, c));
 
  // For viner som ikke er cachet (eller cache er > 7 dager gammel), scrape detaljer
  const enUkeSiden = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const trengerOppdatering: { varenummer: string; navn: string }[] = [];
  const ferdige: VinmonopolProdukt[] = [];
 
  for (const t of grunnTreff) {
    const cache = cacheMap.get(t.varenummer);
    if (cache && cache.sist_oppdatert && new Date(cache.sist_oppdatert) > enUkeSiden) {
      ferdige.push(cache);
    } else {
      trengerOppdatering.push(t);
    }
  }
 
  // Scrape parallellt med rate-limit (maks 3 samtidig for å være snill)
  const detaljerteResultater: VinmonopolProdukt[] = [];
  for (let i = 0; i < trengerOppdatering.length; i += 3) {
    const batch = trengerOppdatering.slice(i, i + 3);
    const results = await Promise.all(
      batch.map(t => hentProduktDetaljer(t.varenummer, t.navn))
    );
    results.forEach(r => {
      if (r) detaljerteResultater.push(r);
    });
  }
 
  // Lagre nye/oppdaterte i cache (fire and forget)
  if (detaljerteResultater.length > 0) {
    const rader = detaljerteResultater.map(p => ({
      varenummer: p.varenummer,
      navn: p.navn,
      produkttype: p.produkttype,
      hovedkategori: p.hovedkategori,
      land: p.land,
      distrikt: p.distrikt,
      underdistrikt: p.underdistrikt,
      argang: p.argang,
      druer: p.druer,
      alkoholprosent: p.alkoholprosent,
      pris: p.pris,
      pris_per_liter: p.pris_per_liter,
      volum: p.volum,
      produsent: p.produsent,
      bilde_url: p.bilde_url,
      produkt_url: p.produkt_url,
      lukt: p.lukt,
      smak: p.smak,
      sist_oppdatert: new Date().toISOString(),
    }));
 
    supabase
      .from('vinmonopol_produkter')
      .upsert(rader, { onConflict: 'varenummer' })
      .then(() => {})
      .catch((e: any) => console.error('Cache-skriving feilet:', e));
  }
 
  // Returner ferdige (fra cache) + nye (fra scraping), i samme rekkefølge som søk
  const allByVarenr = new Map<string, VinmonopolProdukt>();
  ferdige.forEach(p => allByVarenr.set(p.varenummer, p));
  detaljerteResultater.forEach(p => allByVarenr.set(p.varenummer, p));
 
  return grunnTreff
    .map(t => allByVarenr.get(t.varenummer))
    .filter((p): p is VinmonopolProdukt => !!p);
}
 
// Eksport for kompatibilitet
export async function hentProdukt(varenummer: string): Promise<VinmonopolProdukt | null> {
  return await hentProduktDetaljer(varenummer);
}
 
export async function hentAlleProdukter(): Promise<VinmonopolProdukt[]> {
  return [];
}