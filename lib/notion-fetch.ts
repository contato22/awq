/**
 * notion-fetch.ts
 * Abstracts the data source for Caza Vision pages:
 *   - On Vercel/SSR: GET /api/notion?database=X
 *   - On GitHub Pages (NEXT_PUBLIC_STATIC_DATA=1): GET /awq/data/caza-X.json
 */

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = IS_STATIC ? "/awq" : "";

const STATIC_PATHS: Record<string, string> = {
  properties: `${BASE_PATH}/data/caza-properties.json`,
  financial:  `${BASE_PATH}/data/caza-financial.json`,
  clients:    `${BASE_PATH}/data/caza-clients.json`,
};

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
