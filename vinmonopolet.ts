// Vinmonopolet-integrasjon via det åpne søke-API-et på vinmonopolet.no
// Krever ingen API-nøkkel. Bruker samme endepunkter som vinmonopolet.no selv bruker.
// Inspirert av https://github.com/rexxars/vinmonopolet (MIT-lisens)

const BASE = 'https://www.vinmonopolet.no/vmpws/v2/vmp';

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

// Forenkle produkttype til hovedkategori for filtrering i UI
export function tilHovedkategori(produkttype: string | undefined): string {
  if (!produkttype) return 'Annet';
  const t = produkttype.toLowerCase();
  if (t.includes('rødvin') || t.includes('rodvin')) return 'Rødvin';
  if (t.includes('hvitvin')) return 'Hvitvin';
  if (t.includes('rosévin') || t.includes('rosevin')) return 'Rosévin';
  if (t.includes('musserende') || t.includes('champagne')) return 'Musserende';
  if (t.includes('dessert') || t.includes('sterkvin') || t.includes('hetvin') || t.includes('aromatisert')) return 'Dessert/Sterkvin';
  if (t.includes('øl') || t.includes('ol')) return 'Øl';
  if (t.includes('brennevin') || t.includes('whisky') || t.includes('cognac') || t.includes('aquavit') || t.includes('rom') || t.includes('gin') || t.includes('vodka') || t.includes('likør')) return 'Brennevin';
  if (t.includes('sider')) return 'Sider';
  if (t.includes('mjød')) return 'Mjød';
  if (t.includes('alkoholfri')) return 'Alkoholfritt';
  return 'Annet';
}

// Hjelper: bygg standard headers
function headers() {
  return {
    'Accept': 'application/json',
    'User-Agent': 'VinIverdagen/1.0',
  };
}

// Hjelper: trekk ut produsent fra produktnavn (Vinmonopolet bruker typisk "Produsent Produktnavn")
function ekstraherProdusent(raw: any): string | undefined {
  return raw.main_producer?.name || raw.mainProducer?.name || undefined;
}

// Konverter ett rå-produkt fra Vinmonopolet sitt søke-API til vårt format
function mapProdukt(raw: any): VinmonopolProdukt {
  const varenummer = String(raw.code || '');
  const navn = raw.name || '';

  // Bilde-URL: bruk fra raw hvis tilgjengelig, ellers konstruer fra varenummer
  let bilde_url: string | undefined;
  if (raw.images && Array.isArray(raw.images) && raw.images.length > 0) {
    const zoomBilde = raw.images.find((i: any) => i.format === 'zoom') || raw.images[0];
    bilde_url = zoomBilde.url;
  }
  if (!bilde_url && varenummer) {
    bilde_url = `https://bilder.vinmonopolet.no/cache/515x515-0/${varenummer}-1.jpg`;
  }

  // Produkt-URL
  const produkt_url = raw.url
    ? (raw.url.startsWith('http') ? raw.url : `https://www.vinmonopolet.no${raw.url}`)
    : (varenummer ? `https://www.vinmonopolet.no/p/${varenummer}` : undefined);

  // Druer fra rawMaterial
  let druer: string[] = [];
  if (raw.rawMaterial && Array.isArray(raw.rawMaterial)) {
    druer = raw.rawMaterial
      .map((r: any) => r.name)
      .filter((n: any) => typeof n === 'string' && n.length > 0);
  }

  // Pris
  const pris = parseFloat(raw.price?.value || raw.priceValue);
  const pris_per_liter = parseFloat(raw.pricePerLiter?.value || raw.pricePerLiterValue);

  // Volum (kommer som "0,75 L" eller liknende)
  let volum: number | undefined;
  if (raw.volume?.value) volum = parseFloat(raw.volume.value);
  else if (raw.containerSize) volum = parseFloat(raw.containerSize);
  if (volum && volum > 100) volum = volum / 1000; // hvis i ml, konverter til liter

  return {
    varenummer,
    navn,
    produkttype: raw.main_category?.name || raw.mainCategory?.name || raw.productType,
    hovedkategori: tilHovedkategori(raw.main_category?.name || raw.mainCategory?.name || raw.productType),
    land: raw.main_country?.name || raw.mainCountry?.name,
    distrikt: raw.district?.name,
    underdistrikt: raw.sub_District?.name || raw.subDistrict?.name,
    argang: raw.year || raw.vintage,
    druer: druer.length > 0 ? druer : undefined,
    alkoholprosent: parseFloat(raw.abv) || undefined,
    pris: isNaN(pris) ? undefined : pris,
    pris_per_liter: isNaN(pris_per_liter) ? undefined : pris_per_liter,
    volum,
    produsent: ekstraherProdusent(raw),
    bilde_url,
    produkt_url,
    lukt: raw.smell || raw.aroma,
    smak: raw.taste,
    passer_til: undefined,
    ean: raw.barcode || undefined,
  };
}

// Hent ett produkt på varenummer (med detaljer)
export async function hentProdukt(varenummer: string): Promise<VinmonopolProdukt | null> {
  const url = `${BASE}/products/${encodeURIComponent(varenummer)}?fields=FULL`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.code) return null;
  return mapProdukt(data);
}

// Søk på navn eller varenummer
export async function sokVinmonopoletApi(spørring: string, limit: number = 10): Promise<VinmonopolProdukt[]> {
  const erVarenummer = /^\d{4,7}$/.test(spørring.trim());

  // Hvis varenummer, prøv direkte oppslag først
  if (erVarenummer) {
    const direkte = await hentProdukt(spørring.trim());
    if (direkte) return [direkte];
  }

  // Generelt søk
  const url = `${BASE}/search?q=${encodeURIComponent(spørring)}&fields=BASIC&pageSize=${limit}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return [];

  const data = await res.json();
  const products = data.productSearchResult?.products || data.products || [];
  return products.map(mapProdukt);
}

// Hent ett produkt på strekkode (EAN)
export async function hentProduktPaStrekkode(ean: string): Promise<VinmonopolProdukt | null> {
  // Vinmonopolets nettbutikk har ikke direkte barcode-søk via /search,
  // men vi kan søke på selve EAN-koden i fritekst og se om noe matcher
  const url = `${BASE}/search?q=${encodeURIComponent(ean)}&fields=BASIC&pageSize=5`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return null;

  const data = await res.json();
  const products = data.productSearchResult?.products || data.products || [];
  if (products.length === 0) return null;

  // Hent detaljer for første treff for å verifisere strekkode
  for (const p of products) {
    const detaljert = await hentProdukt(p.code);
    if (detaljert?.ean === ean) {
      return detaljert;
    }
  }
  // Hvis ingen verifiserte EAN, returner første treff (fallback)
  return await hentProdukt(products[0].code);
}

// Søk for vår API-rute (søker direkte mot Vinmonopolet, lagrer treff i lokal cache for raskere oppslag senere)
export async function sokVinmonopolet(
  supabase: any,
  spørring: string,
  limit: number = 10
) {
  // Søk direkte mot Vinmonopolet (ingen nøkkel kreves)
  const resultater = await sokVinmonopoletApi(spørring, limit);

  // Lagre i vår lokal cache for senere oppslag (bakgrunnsjobb, ikke vent)
  if (resultater.length > 0) {
    const rader = resultater
      .filter((p) => p.varenummer)
      .map((p) => ({
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

    if (rader.length > 0) {
      // Fire and forget - vi venter ikke på dette
      supabase
        .from('vinmonopol_produkter')
        .upsert(rader, { onConflict: 'varenummer' })
        .then(() => {})
        .catch(() => {});
    }
  }

  return resultater;
}

// Behold for kompatibilitet (brukes ikke lenger - vi trenger ikke daglig sync)
export async function hentAlleProdukter(): Promise<VinmonopolProdukt[]> {
  return [];
}
