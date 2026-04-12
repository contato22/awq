import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { guard } from "@/lib/security-guard";
import { getAllTransactions, getCashPositionByEntity } from "@/lib/financial-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── RBAC guard: view em dados_infra — owner/admin/finance ──
  const token   = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const user_id = (token?.email as string | undefined) ?? "anonymous";
  const rawRole = (token?.role  as string | undefined) ?? "anonymous";
  const { result, reason } = guard(
    user_id, rawRole, "/api/ingest/transactions", "dados_infra", "view", "Transações bancárias"
  );
  if (result === "blocked") {
    return res.status(403).json({ error: "Acesso negado", code: "RBAC_DENIED", reason });
  }

  const { documentId, entity, category, confidence, excludeIntercompany, consolidatedOnly } = req.query;

  let txns = await getAllTransactions();

  if (documentId)                          txns = txns.filter((t) => t.documentId            === (documentId as string));
  if (entity)                              txns = txns.filter((t) => t.entity                === (entity     as string));
  if (category)                            txns = txns.filter((t) => t.managerialCategory    === (category   as string));
  if (confidence)                          txns = txns.filter((t) => t.classificationConfidence === (confidence as string));
  if (excludeIntercompany === "true")      txns = txns.filter((t) => !t.isIntercompany);
  if (consolidatedOnly    === "true")      txns = txns.filter((t) => !t.excludedFromConsolidated);

  txns = txns.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  if (consolidatedOnly === "true") {
    const positions = await getCashPositionByEntity();
    return res.json({ transactions: txns, total: txns.length, cashPositions: positions });
  }

  res.json({ transactions: txns, total: txns.length });
}
