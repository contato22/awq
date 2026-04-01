/**
 * notion-fetch.ts
 * Abstracts the data source for Caza Vision pages:
 *   - On Vercel/SSR: GET /api/notion?database=X
 *   - On GitHub Pages (NEXT_PUBLIC_STATIC_DATA=1): GET /awq/data/caza-X.json
 */

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = IS_STATIC ? (process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq") : "";

const STATIC_PATHS: Record<string, string> = {
  properties:    `${BASE_PATH}/data/caza-properties.json`,
  financial:     `${BASE_PATH}/data/caza-financial.json`,
  clients:       `${BASE_PATH}/data/caza-clients.json`,
  "venture-sales": `${BASE_PATH}/data/venture-sales.json`,
};

export interface VentureSalesData {
  rows:         VentureSaleRow[];
  totalFechado: number;
  totalLeads:   number;
  byCategoria:  Record<string, number>;
  byCanal:      { canal: string; leads: number; valor: number; pct: number }[];
  byQuarter:    Record<string, number>;
  byQCat:       Record<string, Record<string, number>>;
}

export interface VentureSaleRow {
  id:        string;
  nome:      string;
  valor:     number;
  categoria: string;
  canal:     string;
  status:    string;
  data:      string;
}

const VENTURE_MOCK: VentureSalesData = {
  rows: [],
  totalFechado: 42506.99,
  totalLeads: 481,
  byCategoria: { "O&M": 40411.97, "Seguro": 2095.02, "Integração": 201189 },
  byCanal: [
    { canal: "Não informado", leads: 354, valor: 1189409.49, pct: 74 },
    { canal: "Indicação",     leads: 29,  valor: 469598.96,  pct: 6  },
    { canal: "Cliente Ativo", leads: 21,  valor: 498506.14,  pct: 4  },
    { canal: "Site/ADS",      leads: 17,  valor: 192101.32,  pct: 4  },
  ],
  byQuarter: { Q1: 42506.99, Q2: 0, Q3: 0, Q4: 0 },
  byQCat: {
    Q1: { "O&M": 40411.97, "Seguro": 2095.02, "Integração": 201189 },
    Q2: {}, Q3: {}, Q4: {},
  },
};

export async function fetchVentureSales(): Promise<VentureSalesData> {
  try {
    const url = IS_STATIC
      ? STATIC_PATHS["venture-sales"]
      : `/api/notion?database=venture-sales`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const data = IS_STATIC ? json : json.data;
    if (data && typeof data === "object" && "totalLeads" in data) {
      return data as VentureSalesData;
    }
    return VENTURE_MOCK;
  } catch {
    return VENTURE_MOCK;
  }
}

export async function fetchNotionData(database: string): Promise<{
  source: "notion" | "mock";
  data:   unknown[] | null;
  error?: string;
}> {
  try {
    let url: string;
    if (IS_STATIC) {
      url = STATIC_PATHS[database];
      if (!url) return { source: "mock", data: null, error: `Unknown database: ${database}` };
    } else {
      url = `/api/notion?database=${database}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    if (IS_STATIC) {
      const data = await res.json() as unknown[];
      return {
        source: Array.isArray(data) && data.length > 0 ? "notion" : "mock",
        data:   Array.isArray(data) && data.length > 0 ? data : null,
      };
    } else {
      const json = await res.json() as { source: "notion" | "mock"; data: unknown[] | null; error?: string };
      return json;
    }
  } catch (err) {
    return {
      source: "mock",
      data:   null,
      error:  err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
