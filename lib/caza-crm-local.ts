// localStorage CRUD layer — usado no modo estático (GitHub Pages).
// Em Vercel (IS_STATIC=false) estas funções não são chamadas.

const KEY = (entity: string) => `awq_caza_${entity}`;

export function lsGet<T>(entity: string): T[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY(entity));
    return raw !== null ? (JSON.parse(raw) as T[]) : null;
  } catch { return null; }
}

export function lsSet<T>(entity: string, items: T[]): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY(entity), JSON.stringify(items)); } catch {}
}

export function lsLocalId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).slice(-6).toUpperCase()}`;
}
