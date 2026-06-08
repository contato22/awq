import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getErpAdminClient } from "@/lib/supabase-erp";

export const runtime = "nodejs";

// ─── /api/erp/seed-demo ───────────────────────────────────────────────────────
// POST  → insere conjunto de demonstração em erp_purchases, erp_sales_orders,
//         erp_inventory_warehouses e erp_inventory_movements.
//         Todos os registros marcados com prefixo "DEMO-" ou flag is_demo
//         (quando a coluna existe) para permitir limpeza posterior.
// DELETE → remove TUDO que tem prefix DEMO-* nos order_number / referência.
//
// Útil para demonstrar a integração inventory ↔ purchases/sales sem precisar
// cadastrar dezenas de registros manualmente. Reversível.

async function requireAuth(req: NextRequest) {
  return getToken({ req, secret: process.env.NEXTAUTH_SECRET });
}

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export async function POST(req: NextRequest) {
  const token = await requireAuth(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getErpAdminClient();
  const createdBy = (token.email as string) ?? "seed-demo";

  // ── Purchases ──────────────────────────────────────────────────────────────
  const purchases = [
    { order_number: "DEMO-PC-001", supplier_name: "Papelaria Central LTDA",   bu_code: "AWQ",    order_date: daysAgo(45), expected_date: daysAgo(40), total_amount:   480.00, status: "Recebido", notes: "Material de escritório — demo" },
    { order_number: "DEMO-PC-002", supplier_name: "TechShop Equipamentos",     bu_code: "AWQ",    order_date: daysAgo(30), expected_date: daysAgo(25), total_amount:  3850.00, status: "Recebido", notes: "2x notebooks — demo" },
    { order_number: "DEMO-PC-003", supplier_name: "Coffee Express SP",         bu_code: "JACQES", order_date: daysAgo(15), expected_date: daysAgo(10), total_amount:   320.00, status: "Recebido", notes: "Café/copa — demo" },
    { order_number: "DEMO-PC-004", supplier_name: "Mobiliário Corporativo",    bu_code: "AWQ",    order_date: daysAgo(8),  expected_date: today(),     total_amount:  1450.00, status: "Aprovado", notes: "Cadeira ergonômica — aguardando entrega" },
    { order_number: "DEMO-PC-005", supplier_name: "Software House",            bu_code: "JACQES", order_date: daysAgo(2),  expected_date: "",          total_amount:   199.00, status: "Rascunho", notes: "Licença anual — demo" },
  ];

  // ── Sales Orders ───────────────────────────────────────────────────────────
  const sales = [
    { order_number: "DEMO-SO-001", customer_name: "Live Roupas Esportivas",    bu_code: "AWQ",    order_date: daysAgo(50), delivery_date: daysAgo(45), total_amount:  5000.00, status: "Entregue",         notes: "Evento esportivo — demo" },
    { order_number: "DEMO-SO-002", customer_name: "AT Films",                  bu_code: "AWQ",    order_date: daysAgo(35), delivery_date: daysAgo(30), total_amount:  9000.00, status: "Entregue",         notes: "Produção audiovisual — demo" },
    { order_number: "DEMO-SO-003", customer_name: "Carol C Marketing",         bu_code: "JACQES", order_date: daysAgo(20), delivery_date: daysAgo(18), total_amount:  1790.00, status: "Faturado",         notes: "MRR Social Media — demo" },
    { order_number: "DEMO-SO-004", customer_name: "Centro Ensino Moderno",     bu_code: "AWQ",    order_date: daysAgo(10), delivery_date: daysAgo(5),  total_amount:  3200.00, status: "Faturado",         notes: "Serviço recorrente — demo" },
    { order_number: "DEMO-SO-005", customer_name: "Tati Simões Produções",     bu_code: "JACQES", order_date: daysAgo(5),  delivery_date: "",          total_amount:  1790.00, status: "Em Processamento", notes: "Em andamento — demo" },
  ];

  // ── Warehouses (vazia em prod hoje) ────────────────────────────────────────
  const warehouses = [
    { name: "DEMO-Matriz SP",     address: "Av. Paulista, 1000 - São Paulo/SP",       bu_code: "AWQ"    },
    { name: "DEMO-Estúdio Pinheiros", address: "R. dos Pinheiros, 200 - São Paulo/SP", bu_code: "JACQES" },
  ];

  const [purchasesRes, salesRes, warehousesRes] = await Promise.all([
    db.from("erp_purchases")            .insert(purchases.map((p)  => ({ ...p, created_by: createdBy }))).select(),
    db.from("erp_sales_orders")         .insert(sales.map((s)      => ({ ...s, created_by: createdBy }))).select(),
    db.from("erp_inventory_warehouses") .insert(warehouses)                                              .select(),
  ]);

  // ── Manual inventory movements (best-effort — depende de schema) ───────────
  let movementsRes: { data: unknown[] | null; error: unknown } = { data: [], error: null };
  try {
    const movements = [
      { movement_date: daysAgo(40), type: "Entrada",       document_ref: "DEMO-MV-001", item_name: "Material escritório (DEMO)", quantity: 50,  amount: 480.00,  status: "Concluída", notes: "Recebimento DEMO-PC-001" },
      { movement_date: daysAgo(25), type: "Entrada",       document_ref: "DEMO-MV-002", item_name: "Notebooks Dell (DEMO)",       quantity: 2,   amount: 3850.00, status: "Concluída", notes: "Recebimento DEMO-PC-002" },
      { movement_date: daysAgo(20), type: "Transferência", document_ref: "DEMO-MV-003", item_name: "Material escritório (DEMO)", quantity: 10,  amount: null,    status: "Concluída", notes: "Matriz → Estúdio (demo)" },
    ];
    movementsRes = await db.from("erp_inventory_movements").insert(movements).select();
  } catch (e) {
    movementsRes = { data: null, error: e instanceof Error ? e.message : "unknown" };
  }

  return NextResponse.json({
    inserted: {
      purchases:  purchasesRes.data?.length  ?? 0,
      sales:      salesRes.data?.length      ?? 0,
      warehouses: warehousesRes.data?.length ?? 0,
      movements:  Array.isArray(movementsRes.data) ? movementsRes.data.length : 0,
    },
    errors: {
      purchases:  purchasesRes.error?.message  ?? null,
      sales:      salesRes.error?.message      ?? null,
      warehouses: warehousesRes.error?.message ?? null,
      movements:  movementsRes.error
        ? (typeof movementsRes.error === "object" && movementsRes.error !== null && "message" in movementsRes.error
            ? (movementsRes.error as { message: string }).message
            : String(movementsRes.error))
        : null,
    },
    note: "Para limpar: DELETE /api/erp/seed-demo",
  });
}

export async function DELETE(req: NextRequest) {
  if (!await requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getErpAdminClient();

  const [p, s, w, m] = await Promise.all([
    db.from("erp_purchases")            .delete().like("order_number", "DEMO-%").select(),
    db.from("erp_sales_orders")         .delete().like("order_number", "DEMO-%").select(),
    db.from("erp_inventory_warehouses") .delete().like("name",         "DEMO-%").select(),
    db.from("erp_inventory_movements")  .delete().like("document_ref", "DEMO-%").select().then(
      (r) => r,
      (e) => ({ data: null, error: e })
    ),
  ]);

  return NextResponse.json({
    deleted: {
      purchases:  p.data?.length ?? 0,
      sales:      s.data?.length ?? 0,
      warehouses: w.data?.length ?? 0,
      movements:  Array.isArray(m.data) ? m.data.length : 0,
    },
  });
}
