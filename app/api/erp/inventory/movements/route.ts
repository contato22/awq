import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getErpAdminClient } from "@/lib/supabase-erp";

export const runtime = "nodejs";

// ─── /api/erp/inventory/movements ─────────────────────────────────────────────
// Visão unificada de movimentações de estoque:
//   - Manuais: erp_inventory_movements (quando a tabela tem registros)
//   - Sintéticas Entrada: erp_purchases com status="Recebido"
//   - Sintéticas Saída:   erp_sales_orders com status ∈ {"Faturado","Entregue"}
//
// Permite que /awq/erp/inventory/movements mostre atividade real mesmo enquanto
// a tabela manual de movimentos não foi populada. Os registros sintéticos vêm
// marcados com `source` para o front diferenciar.

export type MovementType = "Entrada" | "Saída" | "Transferência";
export type MovementSource = "manual" | "purchase" | "sale";

export interface UnifiedMovement {
  id:           string;
  date:         string;          // YYYY-MM-DD
  type:         MovementType;
  source:       MovementSource;
  reference:    string;          // PO/SO number ou doc manual
  description:  string;          // supplier/customer/item
  quantity:     number | null;   // null para sintéticos sem item-level data
  amount:       number | null;   // R$
  origin:       string | null;
  destination:  string | null;
  status:       string | null;
}

async function requireAuth(req: NextRequest) {
  return getToken({ req, secret: process.env.NEXTAUTH_SECRET });
}

export async function GET(req: NextRequest) {
  if (!await requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("q") ?? "").toLowerCase();

  const db = getErpAdminClient();

  // Fan-out em paralelo. Falhas individuais não derrubam o endpoint —
  // cada fonte é resiliente: array vazio em vez de 500.
  const [manualRes, purchasesRes, salesRes] = await Promise.all([
    db.from("erp_inventory_movements").select("*").order("movement_date", { ascending: false }).limit(200),
    db.from("erp_purchases").select("id, order_number, supplier_name, order_date, expected_date, total_amount, status").eq("status", "Recebido").order("order_date", { ascending: false }).limit(100),
    db.from("erp_sales_orders").select("id, order_number, customer_name, order_date, delivery_date, total_amount, status").in("status", ["Faturado", "Entregue"]).order("order_date", { ascending: false }).limit(100),
  ]);

  const movements: UnifiedMovement[] = [];

  for (const m of manualRes.data ?? []) {
    movements.push({
      id:          `manual:${m.id}`,
      date:        m.movement_date,
      type:        m.type as MovementType,
      source:      "manual",
      reference:   m.document_ref ?? m.id,
      description: m.item_name ?? m.notes ?? "—",
      quantity:    m.quantity != null ? Number(m.quantity) : null,
      amount:      m.amount    != null ? Number(m.amount)    : null,
      origin:      m.origin      ?? null,
      destination: m.destination ?? null,
      status:      m.status ?? null,
    });
  }

  for (const p of purchasesRes.data ?? []) {
    movements.push({
      id:          `purchase:${p.id}`,
      date:        p.expected_date ?? p.order_date,
      type:        "Entrada",
      source:      "purchase",
      reference:   p.order_number,
      description: p.supplier_name,
      quantity:    null,
      amount:      p.total_amount != null ? Number(p.total_amount) : null,
      origin:      p.supplier_name,
      destination: "Estoque",
      status:      p.status,
    });
  }

  for (const s of salesRes.data ?? []) {
    movements.push({
      id:          `sale:${s.id}`,
      date:        s.delivery_date ?? s.order_date,
      type:        "Saída",
      source:      "sale",
      reference:   s.order_number,
      description: s.customer_name,
      quantity:    null,
      amount:      s.total_amount != null ? Number(s.total_amount) : null,
      origin:      "Estoque",
      destination: s.customer_name,
      status:      s.status,
    });
  }

  // Sort unified by date desc
  movements.sort((a, b) => b.date.localeCompare(a.date));

  // Filter
  const filtered = search
    ? movements.filter((m) =>
        m.reference.toLowerCase().includes(search) ||
        m.description.toLowerCase().includes(search)
      )
    : movements;

  return NextResponse.json({
    movements: filtered,
    counts: {
      total:   movements.length,
      manual:  manualRes.data?.length    ?? 0,
      entrada: purchasesRes.data?.length ?? 0,
      saida:   salesRes.data?.length     ?? 0,
    },
  });
}
