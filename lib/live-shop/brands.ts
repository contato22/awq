// ─── Live Shop — Marcas (clientes-marca da BU) ────────────────────────────────
//
// Cada marca é um cliente do Live Shop (a BU opera a live; a marca é o seller).
// Bless Rio é o cliente-piloto (§2). É aqui que entra o "cliente #2" do gate §9.
//
// Leitura: ls_brand (migration 007) ?? seed. Pure-ish: o read server-side fica
// em getBrands(); o seed é importável em client/server.

import { erpAdmin, erpAnon } from "@/lib/supabase";
import { LIVE_SHOP_BU } from "./types";

export type BrandKind = "fabricante" | "revenda" | "marca_propria";
export type BrandStatus = "piloto" | "ativo" | "prospect" | "pausado" | "arquivado";

export interface Brand {
  id: string;
  name: string;
  segment: string; // ex.: "Moda feminina"
  kind: BrandKind;
  status: BrandStatus;
  dealModel: string; // ex.: "Revenue share 10% GMV (estrutura A)"
  isPilot: boolean;
  firstLiveAt: string | null; // YYYY-MM-DD
  notes?: string;
}

// Seed — fonte FIXA de negócio (§2), não inventar atributos.
export const BRANDS_SEED: Brand[] = [
  {
    id: "bless-rio",
    name: "Bless Rio",
    segment: "Moda feminina",
    kind: "fabricante",
    status: "piloto",
    dealModel: "Revenue share 10% GMV (estrutura A)",
    isPilot: true,
    firstLiveAt: "2026-06-16",
    notes: "Fabricante — quer vender produto fábrica-direto e dead stock.",
  },
];

const db = erpAdmin ?? erpAnon;

/** Marcas da BU. Fallback para o seed quando não há DB (dev / migration 007 ausente). */
export async function getBrands(): Promise<Brand[]> {
  if (!db) return BRANDS_SEED;
  try {
    const { data, error } = await db
      .from("ls_brand")
      .select("*")
      .eq("bu_id", LIVE_SHOP_BU)
      .order("is_pilot", { ascending: false })
      .order("name", { ascending: true });
    if (error || !data || data.length === 0) return BRANDS_SEED;
    return data.map(rowToBrand);
  } catch {
    return BRANDS_SEED;
  }
}

function rowToBrand(r: any): Brand {
  return {
    id: r.id, name: r.name, segment: r.segment, kind: r.kind, status: r.status,
    dealModel: r.deal_model, isPilot: !!r.is_pilot, firstLiveAt: r.first_live_at, notes: r.notes ?? undefined,
  };
}

// Rótulos pt-BR para exibição.
export const BRAND_KIND_LABEL: Record<BrandKind, string> = {
  fabricante: "Fabricante",
  revenda: "Revenda",
  marca_propria: "Marca própria",
};
export const BRAND_STATUS_LABEL: Record<BrandStatus, string> = {
  piloto: "Piloto",
  ativo: "Ativo",
  prospect: "Prospect",
  pausado: "Pausado",
  arquivado: "Arquivado",
};
