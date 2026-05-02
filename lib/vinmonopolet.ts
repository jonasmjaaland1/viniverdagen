// Vinmonopolet API-integrasjon
// Dokumentasjon: https://api.vinmonopolet.no/

const API_BASE = 'https://apis.vinmonopolet.no';

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
}

// Forenkle produkttype til hovedkategori for filtrering i UI
export function tilHovedkategori(produkttype: string | undefined): string {
  if (!produkttype) return 'Annet';
  const t = produkttype.toLowerCase();
  if (t.includes('rødvin')) return 'Rødvin';
  if (t.includes('hvitvin')) return 'Hvitvin';
  if (t.includes('rosévin') || t.includes('rosevin')) return 'Rosévin';
  if (t.includes('musserende') || t.includes('champagne')) return 'Musserende';
  if (t.includes('dessert') || t.includes('sterkvin') || t.includes('hetvin')) return 'Dessert/Sterkvin';
  if (t.includes('øl')) return 'Øl';
  if (t.includes('brennevin') || t.includes('whisky') || t.includes('cognac')) return 'Brennevin';
  if (t.includes('sider')) return 'Sider';
  return 'Annet';
}

// Hent produktdetaljer for ett varenummer
export async function hentProdukt(varenummer: string): Promise<VinmonopolProdukt | null> {
  const apiKey = process.env.VINMONOPOLET_API_KEY;
  if (!apiKey) throw new Error('VINMONOPOLET_API_KEY mangler');

  const url = `${API_BASE}/products/v0/details-normal?productId=${varenummer}&maxResults=1`;
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.length === 0) return null;

  return mapProdukt(data[0]);
}

// Hent alle produkter (paginert) - brukes ved daglig sync
export async function hentAlleProdukter(
  start: number = 0,
  maxResults: number = 100
): Promise<VinmonopolProdukt[]> {
  const apiKey = process.env.VINMONOPOLET_API_KEY;
  if (!apiKey) throw new Error('VINMONOPOLET_API_KEY mangler');

  const url = `${API_BASE}/products/v0/details-normal?start=${start}&maxResults=${maxResults}`;
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
  });

  if (!res.ok) {
    throw new Error(`Vinmonopolet API feilet: ${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data.map(mapProdukt) : [];
}

// Konverter Vinmonopolets respons til vårt format
// Merk: Det åpne API-et har et bestemt skjema. Hvis felter mangler eller heter annerledes
// i din versjon, juster denne funksjonen.
function mapProdukt(raw: any): VinmonopolProdukt {
  const varenummer = String(raw.basic?.productId || raw.productId || raw.code || '');
  const navn = raw.basic?.product?.productShortName || raw.name || '';
  const produkttype = raw.classification?.mainProductTypeName || raw.productType;
  const land = raw.origins?.origin?.country;
  const distrikt = raw.origins?.origin?.region;
  const underdistrikt = raw.origins?.origin?.subRegion;
  const argang = raw.basic?.product?.vintage;
  const druer = raw.ingredients?.grapes?.map((g: any) => g.grapeName) || [];
  const alkoholprosent = parseFloat(raw.basic?.alcohol);
  const pris = parseFloat(raw.prices?.[0]?.salesPrice);
  const pris_per_liter = parseFloat(raw.prices?.[0]?.salesPricePrLiter);
  const volum = parseFloat(raw.basic?.bottlesPerCase) || parseFloat(raw.basic?.volume);
  const produsent = raw.logistics?.manufacturerName;
  const lukt = raw.description?.characteristics?.smell;
  const smak = raw.description?.characteristics?.taste;

  // Bilde-URL bygges fra varenummer
  const bilde_url = varenummer
    ? `https://bilder.vinmonopolet.no/cache/515x515-0/${varenummer}-1.jpg`
    : undefined;

  // Produkt-URL på Vinmonopolet.no
  const produkt_url = varenummer
    ? `https://www.vinmonopolet.no/p/${varenummer}`
    : undefined;

  return {
    varenummer,
    navn,
    produkttype,
    hovedkategori: tilHovedkategori(produkttype),
    land,
    distrikt,
    underdistrikt,
    argang,
    druer,
    alkoholprosent: isNaN(alkoholprosent) ? undefined : alkoholprosent,
    pris: isNaN(pris) ? undefined : pris,
    pris_per_liter: isNaN(pris_per_liter) ? undefined : pris_per_liter,
    volum: isNaN(volum) ? undefined : volum,
    produsent,
    bilde_url,
    produkt_url,
    lukt,
    smak,
  };
}

// Søk i lokal database (vår synkroniserte kopi)
export async function sokVinmonopolet(
  supabase: any,
  spørring: string,
  limit: number = 10
) {
  // Søk på både navn (fuzzy) og varenummer
  const erTall = /^\d+$/.test(spørring.trim());

  if (erTall) {
    const { data } = await supabase
      .from('vinmonopol_produkter')
      .select('*')
      .ilike('varenummer', `${spørring}%`)
      .limit(limit);
    return data || [];
  }

  const { data } = await supabase
    .from('vinmonopol_produkter')
    .select('*')
    .ilike('navn', `%${spørring}%`)
    .limit(limit);
  return data || [];
}
