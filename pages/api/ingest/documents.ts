import type { NextApiRequest, NextApiResponse } from "next";
import { getAllDocuments } from "@/lib/financial-db";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { entity, bank, status } = req.query;

  let docs = getAllDocuments();

  if (entity) docs = docs.filter((d) => d.entity === (entity as string));
  if (bank)   docs = docs.filter((d) => d.bank   === (bank   as string));
  if (status) docs = docs.filter((d) => d.status === (status as string));

  res.json({ documents: docs, total: docs.length });
}
