// ─── Grupo Enerdy — BU Data Module ─────────────────────────────────────────────
// Enerdy is currently nested under AWQ Venture.
// Its data comes from the venture-sales.json file.
// This module provides a clear, isolated access point
// for Enerdy-specific data, preparing for when it becomes
// a standalone BU or gets its own data sources.

import { fetchVentureSales } from "@/lib/notion-fetch";
import type { VentureSalesData } from "@/lib/notion-fetch";
import { createEnvelope } from "../types/source-meta";
import { SOURCE_CATALOG } from "../meta";

// ─── Governed data access ─────────────────────────────────────────────────────

export const ENERDY_BU_ID = "enerdy" as const;

/**
 * Fetches Enerdy sales data.
 * Currently uses the same source as AWQ Venture sales (venture-sales.json).
 * When Enerdy gets its own data source, only this function needs to change.
 */
export async function getEnerdySales() {
  const data = await fetchVentureSales();
  return createEnvelope<VentureSalesData>(data, SOURCE_CATALOG["venture:sales"]);
}

/** Extract Enerdy-specific summary from sales data */
export async function getEnerdySummary() {
  const salesData = await fetchVentureSales();

  return {
    buId: ENERDY_BU_ID,
    status: "planned" as const,
    totalLeads: salesData.totalLeads,
    totalFechado: salesData.totalFechado,
    categorias: salesData.byCategoria,
    canais: salesData.byCanal,
    quarterlyBreakdown: salesData.byQuarter,
  };
}
