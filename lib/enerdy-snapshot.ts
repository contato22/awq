// ─── Snapshot estático dos dados ENERDY (fallback offline) ───────────────────
// Cópia ponto-no-tempo de montagem (gestão) + pós-venda CRM (projetos), capturada
// com a conta de serviço. Serve para o front mostrar dados REAIS sem depender das
// env vars na Vercel. Quando ENERDY_USER/ENERDY_PASS existem, os leitores usam o
// dado AO VIVO e ignoram este snapshot.
//
// Atualizar: rodar o gerador (scripts) com as credenciais e re-commitar o JSON.

import data from "@/lib/enerdy-snapshot.json";
import type {
  MontagemInstallation,
  MontagemCliente,
  MontagemCleaningReport,
} from "@/lib/enrd-montagem-db";
import type { ServicoOS } from "@/lib/enerdy-projetos";

type SnapshotShape = {
  capturedAt: string;
  montagem: {
    installations: MontagemInstallation[];
    clientes: MontagemCliente[];
    cleaningReports: MontagemCleaningReport[];
  };
  projetos: { servicos: ServicoOS[] };
};

const snap = data as unknown as SnapshotShape;

export const SNAPSHOT_AT: string = snap.capturedAt;

export function snapshotMontagem() {
  return {
    installations: snap.montagem.installations,
    clientes: snap.montagem.clientes,
    cleaningReports: snap.montagem.cleaningReports,
    fetchedAt: SNAPSHOT_AT,
    stale: true as const,
  };
}

export function snapshotProjetos() {
  return { servicos: snap.projetos.servicos, fetchedAt: SNAPSHOT_AT, stale: true as const };
}
