// ─── Live Shop — Agenda de lives (plano por live) ─────────────────────────────
//
// Cada live planejada carrega: peças em destaque, responsáveis, roteiro, metas e
// comissões (de host/creator — OPERACIONAL, não é o P&L interno da AWQ).
// Leitura: ls_live_plan (migration 009) ?? seed por marca. Sem GMV/MC/ROIC.

import { erpAdmin, erpAnon } from "@/lib/supabase";
import { LIVE_SHOP_BU } from "./types";

export type LivePlanStatus = "planejada" | "confirmada" | "realizada";

export interface Responsavel { role: string; name: string }
export interface Comissao { label: string; value: string }

export interface LivePlan {
  id: string;
  brandId: string;
  startsAt: string; // ISO
  title: string;
  status: LivePlanStatus;
  pecas: string[];
  responsaveis: Responsavel[];
  roteiro: string;
  metas: string[];
  comissoes: Comissao[];
}

// Seed da agenda da Bless Rio — lives ao redor do flip 15/07 (§6/§9). Comissões
// = host/creator (operacional). Sem nomes reais onde não confirmados.
export const AGENDA_SEED: Record<string, LivePlan[]> = {
  "bless-rio": [
    {
      id: "blr-2026-07-16", brandId: "bless-rio", startsAt: "2026-07-16T19:00:00-03:00",
      title: "Live de Inverno — fábrica direto", status: "confirmada",
      pecas: ["Casaco de lã (linha própria)", "Vestido midi", "Kit 3 blusas", "Dead stock — saldão"],
      responsaveis: [
        { role: "Host", name: "A definir" },
        { role: "Operação/Estúdio", name: "Caza Vision" },
        { role: "Gestão", name: "AWQ Live Shop" },
      ],
      roteiro: "Abertura com oferta âncora < R$ 50 e regra de frete clara; bloco de looks (cross-sell); bloco de produto próprio; recap + próxima live.",
      metas: ["Vender ≥ 10 peças de produto próprio", "CTOR ≥ 3%", "Itens/pedido > 1,3"],
      comissoes: [
        { label: "Host", value: "10% sobre vendas da live" },
        { label: "Afiliado/creator", value: "até 15%" },
      ],
    },
    {
      id: "blr-2026-07-23", brandId: "bless-rio", startsAt: "2026-07-23T19:00:00-03:00",
      title: "Drop cápsula + recompra", status: "planejada",
      pecas: ["Cápsula nova (produto próprio)", "Best-sellers da L1", "Combo presente"],
      responsaveis: [
        { role: "Host", name: "A definir" },
        { role: "Operação/Estúdio", name: "Caza Vision" },
        { role: "Gestão", name: "AWQ Live Shop" },
      ],
      roteiro: "Reforço da cápsula própria; ofertas de recompra para clientes da 1ª live; encerramento com CTA de fidelização.",
      metas: ["Recompra ≥ 15% da base", "Sustentar MC% ≥ 35%"],
      comissoes: [
        { label: "Host", value: "10% sobre vendas da live" },
        { label: "Afiliado/creator", value: "até 15%" },
      ],
    },
  ],
};

const db = erpAdmin ?? erpAnon;

/** Agenda de uma marca. ls_live_plan (009) ?? seed. Mais cedo primeiro. */
export async function getAgenda(brandId: string): Promise<LivePlan[]> {
  if (!db) return AGENDA_SEED[brandId] ?? [];
  try {
    const { data, error } = await db
      .from("ls_live_plan")
      .select("*")
      .eq("bu_id", LIVE_SHOP_BU)
      .eq("brand_id", brandId)
      .order("starts_at", { ascending: true });
    if (error || !data || data.length === 0) return AGENDA_SEED[brandId] ?? [];
    return data.map((r: any): LivePlan => ({
      id: r.id, brandId: r.brand_id, startsAt: r.starts_at, title: r.title, status: r.status,
      pecas: r.pecas ?? [], responsaveis: r.responsaveis ?? [], roteiro: r.roteiro ?? "",
      metas: r.metas ?? [], comissoes: r.comissoes ?? [],
    }));
  } catch {
    return AGENDA_SEED[brandId] ?? [];
  }
}

export const LIVE_PLAN_STATUS_LABEL: Record<LivePlanStatus, string> = {
  planejada: "Planejada",
  confirmada: "Confirmada",
  realizada: "Realizada",
};
