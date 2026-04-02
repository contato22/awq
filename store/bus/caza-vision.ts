// ─── Caza Vision — BU Data Module ──────────────────────────────────────────────
// Wraps lib/caza-data.ts with source metadata.
// Does NOT duplicate data — imports and re-exports from the original file.

import {
  cazaKpis,
  cazaRevenueData,
  projectTypeRevenue,
  projetos,
  cazaClients,
  cazaAlerts,
} from "@/lib/caza-data";

import type {
  CazaKPI,
  CazaRevenuePoint,
  ProjectTypeRevenue,
  Projeto,
  CazaClient,
  CazaAlert,
} from "@/lib/caza-data";

import { createEnvelope } from "../types/source-meta";
import { SOURCE_CATALOG } from "../meta";

// ─── Raw re-exports ───────────────────────────────────────────────────────────
export {
  cazaKpis,
  cazaRevenueData,
  projectTypeRevenue,
  projetos,
  cazaClients,
  cazaAlerts,
};

// ─── Type re-exports ──────────────────────────────────────────────────────────
export type {
  CazaKPI,
  CazaRevenuePoint,
  ProjectTypeRevenue,
  Projeto,
  CazaClient,
  CazaAlert,
};

// ─── Governed data access (with metadata envelopes) ───────────────────────────

export function getCazaKpis() {
  return createEnvelope<CazaKPI[]>(cazaKpis, SOURCE_CATALOG["caza:kpis"]);
}

export function getCazaRevenueTrend() {
  return createEnvelope<CazaRevenuePoint[]>(cazaRevenueData, SOURCE_CATALOG["caza:revenue-trend"]);
}

export function getCazaProjectTypeRevenue() {
  return createEnvelope<ProjectTypeRevenue[]>(projectTypeRevenue, SOURCE_CATALOG["caza:project-type-revenue"]);
}

export function getCazaProjetos() {
  return createEnvelope<Projeto[]>(projetos, SOURCE_CATALOG["caza:projetos"]);
}

export function getCazaClients() {
  return createEnvelope<CazaClient[]>(cazaClients, SOURCE_CATALOG["caza:clients"]);
}

export function getCazaAlerts() {
  return createEnvelope<CazaAlert[]>(cazaAlerts, SOURCE_CATALOG["caza:alerts"]);
}

// ─── BU-level summary ─────────────────────────────────────────────────────────

export const CAZA_BU_ID = "caza-vision" as const;

export function getCazaSummary() {
  const activeProjects = projetos.filter(
    (p) => p.status === "Em Produção" || p.status === "Em Edição"
  ).length;
  const deliveredProjects = projetos.filter((p) => p.status === "Entregue").length;
  const totalPipelineValue = projetos.reduce((sum, p) => sum + p.valor, 0);
  const activeClients = cazaClients.filter((c) => c.status === "Ativo").length;

  return {
    buId: CAZA_BU_ID,
    activeProjects,
    deliveredProjects,
    totalPipelineValue,
    activeClients,
    totalClients: cazaClients.length,
    activeAlerts: cazaAlerts.length,
  };
}
