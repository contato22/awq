import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { guard } from "@/lib/security-guard";
import { getAllDocuments } from "@/lib/financial-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── RBAC guard: view em dados_infra — owner/admin/finance ──
  const token   = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const user_id = (token?.email as string | undefined) ?? "anonymous";
  const rawRole = (token?.role  as string | undefined) ?? "anonymous";
  const { result, reason } = guard(
    user_id, rawRole, "/api/ingest/documents", "dados_infra", "view", "Documentos financeiros ingeridos"
  );
  if (result === "blocked") {
    return res.status(403).json({ error: "Acesso negado", code: "RBAC_DENIED", reason });
  }

  const { entity, bank, status } = req.query;

  let docs = await getAllDocuments();

  if (entity) docs = docs.filter((d) => d.entity === (entity as string));
  if (bank)   docs = docs.filter((d) => d.bank   === (bank   as string));
  if (status) docs = docs.filter((d) => d.status === (status as string));

  res.json({ documents: docs, total: docs.length });
}
