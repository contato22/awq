import type { NextApiRequest, NextApiResponse } from "next";
import { getAllTransactions, getCashPositionByEntity } from "@/lib/financial-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { documentId, entity, category, confidence, excludeIntercompany, consolidatedOnly } = req.query;

  let txns = await getAllTransactions();

  if (documentId)                          txns = txns.filter((t) => t.documentId            === (documentId as string));
  if (entity)                              txns = txns.filter((t) => t.entity                === (entity     as string));
  if (category)                            txns = txns.filter((t) => t.managerialCategory    === (category   as string));
  if (confidence)                          txns = txns.filter((t) => t.classificationConfidence === (confidence as string));
  if (excludeIntercompany === "true")      txns = txns.filter((t) => !t.isIntercompany);
  if (consolidatedOnly    === "true")      txns = txns.filter((t) => !t.excludedFromConsolidated);

  // Sort by date descending
  txns = txns.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  if (consolidatedOnly === "true") {
    const positions = await getCashPositionByEntity();
    return res.json({ transactions: txns, total: txns.length, cashPositions: positions });
  }

  res.json({ transactions: txns, total: txns.length });
}
