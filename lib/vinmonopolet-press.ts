// lib/vinmonopolet-press.ts
// Helper for Vinmonopolets Press API v1

const BASE_URL = 'https://apis.vinmonopolet.no/press-products/v1';

function apiKey(): string {
  const key = process.env.VINMONOPOLET_PRESS_API_KEY;
  if (!key) throw new Error('VINMONOPOLET_PRESS_API_KEY mangler i env');
  return key;
}

async function pressFetch(sti: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${sti}`, {
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey(),
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Vinmonopolet Press API feilet: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface PressProduct {
  basic: {
    productId: string;
    productShortName: string;
    productLongName: string;
    volume: number;
    alcoholContent: number;
    vintage?: number | string;
    ageLimit?: string;
    packagingMaterial?: string;
    corkType?: string;
    introductionDate?: string;
    productStatusSaleName?: string;
  };
  logistics?: {
    wholesalerName?: string;
    vendorName?: string;
    manufacturerName?: string;
    barcodes?: Array<{ gtin: string; isMainGtin: boolean; unitOfMeasure: string }>;
  };
  origins?: {
    origin?: { country?: string; region?: string; subRegion?: string };
    localQualityClassif?: string;
  };
  properties?: {
    ecoLabelling?: string;
    storagePotential?: string;
    organic?: boolean;
    biodynamic?: boolean;
    ethicallyCertified?: boolean;
    sweetWine?: boolean;
    freeOrLowOnGluten?: boolean;
    kosher?: boolean;
    noAddedSulphur?: boolean;
    productionMethodStorage?: string;
  };
  classification?: {
    mainProductTypeName?: string;
    subProductTypeName?: string;
    productTypeName?: string;
    productGroupName?: string;
  };
  ingredients?: {
    grapes?: Array<{ grapeId: string; grapeDesc: string; grapePct: string | number }>;
    sugar?: string;
    acid?: string;
    allergens?: string;
  };
  description?: {
    characteristics?: { colour?: string; odour?: string; taste?: string };
    freshness?: string;
    fullness?: string;
    bitterness?: string;
    sweetness?: string;
    tannins?: string;
    recommendedFood?: Array<{ foodId: string; foodDesc: string }>;
  };
  assortment?: {
    assortment?: string;
  };
  prices?: Array<{
    salesPrice?: number;
    salesPricePrLiter?: number;
  }>;
}

export async function hentProdukt(varenummer: string): Promise<PressProduct | null> {
  const data = await pressFetch(`/details-normal?productId=${encodeURIComponent(varenummer)}&maxResults=1`);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function sokProdukter(sok: string, limit = 20): Promise<PressProduct[]> {
  const ren = sok.trim();
  if (!ren) return [];
  const data = await pressFetch(
    `/details-normal?productShortNameContains=${encodeURIComponent(ren)}&maxResults=${limit}`
  );
  return Array.isArray(data) ? data : [];
}

export async function fritekstSok(sok: string, limit = 20): Promise<PressProduct[]> {
  const ren = sok.trim().replace(/\s+/g, '_');
  if (!ren) return [];
  const data = await pressFetch(
    `/details-normal?freeText=${encodeURIComponent(ren)}&maxResults=${limit}`
  );
  return Array.isArray(data) ? data : [];
}

export async function hentPaStrekkode(gtin: string): Promise<PressProduct | null> {
  const data = await pressFetch(`/details-normal?gtin=${encodeURIComponent(gtin)}&maxResults=1`);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

/**
 * Mapper Press API-data til vårt database-skjema.
 * NB: druer og passer_til er TEXT[] (ARRAY) i databasen, ikke jsonb.
 *     matparing er jsonb.
 */
export function tilDatabase(p: PressProduct): Record<string, any> {
  const argang = p.basic.vintage ? String(p.basic.vintage) : null;
  const gjeldendePris = p.prices && p.prices.length > 0 ? p.prices[p.prices.length - 1] : null;
  const hovedStrekkode = p.logistics?.barcodes?.find((b) => b.isMainGtin)?.gtin || null;

  function toInt(v: string | undefined): number | null {
    if (!v) return null;
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  // Druer som array av tekst: ["Pinot Nero 15%", "Glera 85%"]
  const druerArray = (p.ingredients?.grapes || []).map((g) => {
    const pct = g.grapePct ? ` ${g.grapePct}%` : '';
    return `${g.grapeDesc}${pct}`;
  });

  // Mat-paring som array av tekst for passer_til: ["Aperitiff/avec", "Skalldyr", "Fisk"]
  const passerTilArray = (p.description?.recommendedFood || []).map((f) => f.foodDesc);

  // Mat-paring som jsonb beholder hele strukturen
  const matparingJsonb = p.description?.recommendedFood || [];

  const hovedkategori = p.classification?.mainProductTypeName || null;
  const undertypeNavn = p.classification?.subProductTypeName || null;

  return {
    varenummer: p.basic.productId,
    navn: p.basic.productShortName,
    langt_navn: p.basic.productLongName,
    volum: p.basic.volume,
    volum_liter: p.basic.volume,
    alkoholprosent: p.basic.alcoholContent,
    argang,
    kork_type: p.basic.corkType || null,
    embalasje: p.basic.packagingMaterial || null,
    salg_status: p.basic.productStatusSaleName || null,

    // Klassifisering - bruk eksisterende kolonner
    hovedkategori,
    produkttype: undertypeNavn,
    hovedtype: hovedkategori,
    undertype: undertypeNavn,
    produktgruppe: p.classification?.productGroupName || null,

    // Opprinnelse
    land: p.origins?.origin?.country || null,
    distrikt: p.origins?.origin?.region || null,
    underdistrikt: p.origins?.origin?.subRegion || null,
    kvalitetsklassifisering: p.origins?.localQualityClassif || null,

    // Logistikk
    produsent: p.logistics?.manufacturerName || null,
    grossist: p.logistics?.wholesalerName || null,
    hovedstrekkode: hovedStrekkode,

    // Egenskaper
    eco_merking: p.properties?.ecoLabelling || null,
    lagringspotensial: p.properties?.storagePotential || null,
    er_okologisk: p.properties?.organic || false,
    er_biodynamisk: p.properties?.biodynamic || false,
    er_etisk_sertifisert: p.properties?.ethicallyCertified || false,
    er_glutenfri: p.properties?.freeOrLowOnGluten || false,
    er_kosher: p.properties?.kosher || false,
    ingen_tilsatt_svovel: p.properties?.noAddedSulphur || false,
    er_sotvin: p.properties?.sweetWine || false,
    produksjonsmetode: p.properties?.productionMethodStorage || null,

    // Ingredienser
    druer: druerArray,
    sukker: p.ingredients?.sugar || null,
    syre: p.ingredients?.acid || null,
    allergener: p.ingredients?.allergens || null,

    // Smaksprofil
    friskhet: toInt(p.description?.freshness),
    fylde: toInt(p.description?.fullness),
    bitterhet: toInt(p.description?.bitterness),
    sodme: toInt(p.description?.sweetness),
    garvestoffer: toInt(p.description?.tannins),

    // Beskrivelse
    farge_beskrivelse: p.description?.characteristics?.colour || null,
    lukt: p.description?.characteristics?.odour || null,
    smak: p.description?.characteristics?.taste || null,
    smak_beskrivelse: p.description?.characteristics?.taste || null,

    // Mat-paring
    matparing: matparingJsonb,
    passer_til: passerTilArray,

    // Salg
    utvalg: p.assortment?.assortment || null,
    pris: gjeldendePris?.salesPrice ?? null,
    pris_per_liter: gjeldendePris?.salesPricePrLiter ?? null,

    // Bilde
    bilde_url: `https://bilder.vinmonopolet.no/cache/515x515-0/${p.basic.productId}-1.jpg`,
    produkt_url: `https://www.vinmonopolet.no/p/${p.basic.productId}`,

    sist_oppdatert: new Date().toISOString(),
    press_data_oppdatert: new Date().toISOString(),
  };
}
