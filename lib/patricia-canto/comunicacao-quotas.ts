// Metas recorrentes de entrega de conteúdo (hoje fixas para a Ana/marketing):
// 2 vídeos/semana (Instagram + TikTok), 1 arte/semana (Instagram) e 1
// planejamento de conteúdos/mês.
import type { ComunicacaoFormato, ComunicacaoItem, Plataforma } from "./gtm-extra";

export interface ContentQuota {
  id: string;
  label: string;
  formato: ComunicacaoFormato;
  plataformas: Plataforma[]; // vazio = qualquer plataforma
  quantidade: number;
  periodo: "semana" | "mes";
  responsavel: string;
}

export const CONTENT_QUOTAS: ContentQuota[] = [
  {
    id: "videos-semana",
    label: "Vídeos (Reels/TikTok)",
    formato: "video",
    plataformas: ["Instagram", "TikTok"],
    quantidade: 2,
    periodo: "semana",
    responsavel: "Ana",
  },
  {
    id: "arte-semana",
    label: "Arte (Instagram)",
    formato: "arte",
    plataformas: ["Instagram"],
    quantidade: 1,
    periodo: "semana",
    responsavel: "Ana",
  },
  {
    id: "planejamento-mes",
    label: "Planejamento de conteúdos",
    formato: "planejamento",
    plataformas: [],
    quantidade: 1,
    periodo: "mes",
    responsavel: "Ana",
  },
];

export function weekRange(reference: Date): { start: Date; end: Date } {
  const d = new Date(reference);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function monthRange(reference: Date): { start: Date; end: Date } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export interface QuotaProgress {
  quota: ContentQuota;
  entregues: number;
  planejados: number;
  rangeLabel: string;
}

export function computeQuotaProgress(items: ComunicacaoItem[], now: Date = new Date()): QuotaProgress[] {
  return CONTENT_QUOTAS.map((quota) => {
    const { start, end } = quota.periodo === "semana" ? weekRange(now) : monthRange(now);
    const inRange = items.filter((i) => {
      const d = new Date(i.dataPlanejada);
      if (d < start || d > end) return false;
      if (i.formato !== quota.formato) return false;
      if (quota.plataformas.length > 0 && (!i.plataforma || !quota.plataformas.includes(i.plataforma))) return false;
      return true;
    });
    const entregues = inRange.filter((i) => i.status === "publicado").length;
    const rangeLabel =
      quota.periodo === "semana"
        ? `${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} – ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
        : start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return { quota, entregues, planejados: inRange.length, rangeLabel };
  });
}
