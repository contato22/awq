// Shared safe-fetch utility for PPM client pages.
// Throws a descriptive Error instead of letting .json() blow up with
// "Unexpected token '<'" when the server returns HTML (auth redirect, 404, 500).

export async function ppmFetch(url: string, opts?: RequestInit): Promise<unknown> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch { /* ignore */ }
    // Truncate to avoid flooding the error boundary with a full HTML page
    throw new Error(`PPM API ${res.status}: ${detail.slice(0, 120)}`);
  }
  return res.json();
}

export async function ppmFetchJson<T = unknown>(url: string, opts?: RequestInit): Promise<T> {
  return ppmFetch(url, opts) as Promise<T>;
}
