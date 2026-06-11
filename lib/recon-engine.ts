// ─── Conciliação Inteligente — motor de matching (4 vias em cascata) ─────────
// STUB (PR-2): a ingestão chama reconcile(bu) após sincronizar, mas o motor em
// si — trava determinística, scoring aditivo, fuzzy N:1/1:N e memória — entra
// nos PR-3/PR-4. Por enquanto é um no-op idempotente para que a pipeline de
// ingestão já fique cabeada sem criar grupos incorretos.
//
// Contrato (a ser honrado pelos PR-3/4):
//   • idempotente — reprocessar não duplica grupos `auto`
//   • toda escrita em recon_* passa por função server-side

import type { BU } from "@/lib/recon-types";

export interface ReconcileResult {
  bu: BU;
  ran: boolean;
  auto: number;
  suggested: number;
  weak: number;
  exceptions: number;
  /** Marcador temporário enquanto o motor não está implementado (PR-3/4). */
  note?: string;
}

/**
 * Executa o motor de conciliação para uma BU. No-op até PR-3/4.
 * Mantido aqui para a rota de ingestão já chamar e não precisar refatorar depois.
 */
export async function reconcile(bu: BU): Promise<ReconcileResult> {
  return {
    bu,
    ran: false,
    auto: 0,
    suggested: 0,
    weak: 0,
    exceptions: 0,
    note: "motor não implementado (PR-3/4) — ingestão apenas",
  };
}
