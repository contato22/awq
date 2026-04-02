// ─── Data Quality Classification ───────────────────────────────────────────────
// Provides quality scores and migration readiness assessments
// for each data source in the platform.

import type { SourceMeta } from "../types/source-meta";
import { SOURCE_CATALOG } from "./index";

export type QualityGrade = "A" | "B" | "C" | "D" | "F";

export interface QualityAssessment {
  sourceId: string;
  grade: QualityGrade;
  isMock: boolean;
  isReadyForProduction: boolean;
  migrationPriority: "high" | "medium" | "low";
  migrationTarget: string;
}

/** Compute a quality grade based on source metadata */
function gradeSource(meta: SourceMeta): QualityGrade {
  if (meta.reliability === "verified" && meta.origin !== "mock") return "A";
  if (meta.origin === "derived" && meta.reliability !== "mock") return "B";
  if (meta.origin === "static-json") return "C";
  if (meta.origin === "mock" && meta.lifecycle === "active") return "D";
  return "F";
}

/** Assess all data sources for quality and migration readiness */
export function assessAllSources(): QualityAssessment[] {
  return Object.values(SOURCE_CATALOG).map((meta) => {
    const isMock = meta.origin === "mock" || meta.reliability === "mock";
    const grade = gradeSource(meta);

    return {
      sourceId: meta.sourceId,
      grade,
      isMock,
      isReadyForProduction: grade === "A" || grade === "B",
      migrationPriority: isMock
        ? meta.buOwner
          ? "high"
          : "medium"
        : "low",
      migrationTarget: isMock
        ? "Notion API or database"
        : meta.origin === "static-json"
          ? "Notion API with static fallback"
          : "Current source adequate",
    };
  });
}

/** Get a summary of data quality across the platform */
export function getQualitySummary(): {
  total: number;
  byGrade: Record<QualityGrade, number>;
  mockCount: number;
  productionReady: number;
} {
  const assessments = assessAllSources();
  const byGrade: Record<QualityGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };

  for (const a of assessments) {
    byGrade[a.grade]++;
  }

  return {
    total: assessments.length,
    byGrade,
    mockCount: assessments.filter((a) => a.isMock).length,
    productionReady: assessments.filter((a) => a.isReadyForProduction).length,
  };
}
