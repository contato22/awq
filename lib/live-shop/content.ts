// ─── Live Shop — Grade de conteúdo por marca ──────────────────────────────────
//
// Organiza as lives: blocos com horário, roteiro, resultado esperado e status.
// Leitura: ls_content_block (migration 008) ?? seed por marca. Conteúdo
// operacional/editorial — NÃO carrega número financeiro.

import { erpAdmin, erpAnon } from "@/lib/supabase";
import { LIVE_SHOP_BU } from "./types";

export type ContentStatus = "planejado" | "confirmado" | "feito";

export interface ContentBlock {
  id: string;
  brandId: string;
  position: number; // ordem na grade
  slot: string; // ex.: "Bloco 1 · 0–20min" ou "16/07 19h00"
  title: string; // tema do bloco
  script: string; // roteiro
  expected: string; // resultado esperado
  status: ContentStatus;
}

// Seed por marca (editável depois via UI/DB). Bless Rio: blocos ancorados no
// diagnóstico do piloto (§2) — vazamento no checkout, cross-sell ~zero, produto
// próprio como alavanca.
export const CONTENT_GRID_SEED: Record<string, ContentBlock[]> = {
  "bless-rio": [
    { id: "blr-b1", brandId: "bless-rio", position: 1, slot: "Bloco 1 · 0–20min",
      title: "Abertura + oferta âncora", status: "planejado",
      script: "Boas-vindas, regra de frete clara já na abertura, oferta âncora abaixo de R$ 50.",
      expected: "Reduzir o vazamento no checkout (frete) e prender a audiência." },
    { id: "blr-b2", brandId: "bless-rio", position: 2, slot: "Bloco 2 · 20–60min",
      title: "Cross-sell / montagem de looks", status: "planejado",
      script: "Montar looks e kits combinando peças para elevar itens por pedido.",
      expected: "Subir itens/pedido acima de 1,3 (hoje ~1,10)." },
    { id: "blr-b3", brandId: "bless-rio", position: 3, slot: "Bloco 3 · 60–90min",
      title: "Produto próprio / dead stock", status: "planejado",
      script: "Destaque de peças fábrica-direto e dead stock, com storytelling de fábrica.",
      expected: "Vender peças de produto próprio (critério do gate de verticalização)." },
    { id: "blr-b4", brandId: "bless-rio", position: 4, slot: "Encerramento",
      title: "Recap + próxima live", status: "planejado",
      script: "Recapitular ofertas, CTA de recompra e anunciar a próxima data.",
      expected: "Recompra e retenção de audiência entre lives." },
  ],
};

const db = erpAdmin ?? erpAnon;

/** Grade de conteúdo de uma marca. ls_content_block (008) ?? seed. */
export async function getContentGrid(brandId: string): Promise<ContentBlock[]> {
  if (!db) return CONTENT_GRID_SEED[brandId] ?? [];
  try {
    const { data, error } = await db
      .from("ls_content_block")
      .select("*")
      .eq("bu_id", LIVE_SHOP_BU)
      .eq("brand_id", brandId)
      .order("position", { ascending: true });
    if (error || !data || data.length === 0) return CONTENT_GRID_SEED[brandId] ?? [];
    return data.map((r: any) => ({
      id: r.id, brandId: r.brand_id, position: r.position, slot: r.slot,
      title: r.title, script: r.script, expected: r.expected, status: r.status,
    }));
  } catch {
    return CONTENT_GRID_SEED[brandId] ?? [];
  }
}

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  planejado: "Planejado",
  confirmado: "Confirmado",
  feito: "Feito",
};
