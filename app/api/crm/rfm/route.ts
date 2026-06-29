import { NextRequest, NextResponse } from "next/server";
import { getForcedBu } from "@/lib/api-guard";
import { erpAdmin, erpAnon } from "@/lib/supabase";
import type { RfmSegment, RfmCustomer, RfmResponse } from "@/lib/crm-rfm-types";
export type { RfmSegment, RfmCustomer, RfmResponse } from "@/lib/crm-rfm-types";

const db = erpAdmin ?? erpAnon;

// ─── 5×5 grid segment lookup  (r=column 1-5, f=row 1-5) ──────────────────────
const CELL_SEGMENTS: Record<string, RfmSegment> = {
  "1,1":"Perdidos",            "1,2":"Hibernando",       "1,3":"Em Risco",
  "1,4":"Não Pode Perder",     "1,5":"Não Pode Perder",
  "2,1":"Hibernando",          "2,2":"Hibernando",       "2,3":"Em Risco",
  "2,4":"Em Risco",            "2,5":"Não Pode Perder",
  "3,1":"Clientes Promissores","3,2":"Quase Dormentes",  "3,3":"Precisam de Atenção",
  "3,4":"Clientes Fiéis",      "3,5":"Clientes Fiéis",
  "4,1":"Novos Clientes",      "4,2":"Fiéis em Potencial","4,3":"Fiéis em Potencial",
  "4,4":"Clientes Fiéis",      "4,5":"Campeões",
  "5,1":"Novos Clientes",      "5,2":"Fiéis em Potencial","5,3":"Fiéis em Potencial",
  "5,4":"Campeões",            "5,5":"Campeões",
};

const SEGMENT_META: Record<RfmSegment, { color: string; bg: string }> = {
  "Campeões":             { color: "#1e40af", bg: "#dbeafe" },
  "Clientes Fiéis":       { color: "#2563eb", bg: "#eff6ff" },
  "Fiéis em Potencial":   { color: "#3b82f6", bg: "#e0f2fe" },
  "Novos Clientes":       { color: "#0284c7", bg: "#f0f9ff" },
  "Clientes Promissores": { color: "#0369a1", bg: "#e0f2fe" },
  "Precisam de Atenção":  { color: "#6b7280", bg: "#f3f4f6" },
  "Quase Dormentes":      { color: "#d97706", bg: "#fef3c7" },
  "Não Pode Perder":      { color: "#92400e", bg: "#fde68a" },
  "Em Risco":             { color: "#dc2626", bg: "#fee2e2" },
  "Hibernando":           { color: "#ea580c", bg: "#ffedd5" },
  "Perdidos":             { color: "#991b1b", bg: "#fecaca" },
};

function assignSegment(r: number, f: number): RfmSegment {
  return CELL_SEGMENTS[`${r},${f}`] ?? "Precisam de Atenção";
}

function scoreQuantile(value: number, sorted: number[], lowerIsBetter = false): number {
  if (sorted.length === 0) return 3;
  const rank = sorted.filter(v => v < value).length;
  const pct = rank / sorted.length;
  if (pct >= 0.8) return lowerIsBetter ? 1 : 5;
  if (pct >= 0.6) return lowerIsBetter ? 2 : 4;
  if (pct >= 0.4) return lowerIsBetter ? 3 : 3;
  if (pct >= 0.2) return lowerIsBetter ? 4 : 2;
  return lowerIsBetter ? 5 : 1;
}

type CustomerRaw = {
  account_id: string;
  account_name: string;
  industry: string | null;
  owner: string;
  bu: string;
  recency_days: number;
  frequency: number;
  monetary: number;
};

// Seed fallback — synthetic data covering main segments
const SEED_RFM_RAW: CustomerRaw[] = [
  { account_id:"a1",  account_name:"XP Investimentos S.A.",       industry:"finance",   owner:"Miguel", bu:"JACQES",  recency_days:10,  frequency:6, monetary:420000 },
  { account_id:"a2",  account_name:"Nu Pagamentos S.A.",           industry:"finance",   owner:"Danilo", bu:"JACQES",  recency_days:28,  frequency:4, monetary:285000 },
  { account_id:"a3",  account_name:"Colégio CEM",                  industry:"education", owner:"Miguel", bu:"ADVISOR", recency_days:95,  frequency:3, monetary:125000 },
  { account_id:"a4",  account_name:"Reabilicor Clínica Cardíaca",  industry:"health",    owner:"Danilo", bu:"CAZA",    recency_days:175, frequency:2, monetary:95000  },
  { account_id:"a5",  account_name:"Clínica Teresópolis",          industry:"health",    owner:"Danilo", bu:"CAZA",    recency_days:370, frequency:1, monetary:50000  },
  { account_id:"a6",  account_name:"Carol Bertolini",              industry:"media",     owner:"Miguel", bu:"VENTURE", recency_days:19,  frequency:1, monetary:18000  },
  { account_id:"a7",  account_name:"Grupo Pão de Açúcar",          industry:"retail",    owner:"Miguel", bu:"JACQES",  recency_days:320, frequency:5, monetary:380000 },
  { account_id:"a8",  account_name:"Positivo Tecnologia",          industry:"tech",      owner:"Danilo", bu:"VENTURE", recency_days:210, frequency:4, monetary:195000 },
  { account_id:"a9",  account_name:"Faculdade Einstein",           industry:"education", owner:"Miguel", bu:"ADVISOR", recency_days:45,  frequency:2, monetary:78000  },
  { account_id:"a10", account_name:"Farmácias Nissei",             industry:"health",    owner:"Danilo", bu:"CAZA",    recency_days:60,  frequency:1, monetary:42000  },
  { account_id:"a11", account_name:"Hospital São Lucas",            industry:"health",    owner:"Miguel", bu:"ADVISOR", recency_days:85,  frequency:2, monetary:72000  },
];

function buildRfmCustomers(raw: CustomerRaw[]): RfmCustomer[] {
  const recencies   = raw.map(c => c.recency_days).sort((a, b) => a - b);
  const frequencies = raw.map(c => c.frequency).sort((a, b) => a - b);
  const monetaries  = raw.map(c => c.monetary).sort((a, b) => a - b);

  return raw.map(c => {
    const r = scoreQuantile(c.recency_days, recencies, true);
    const f = scoreQuantile(c.frequency, frequencies, false);
    const m = scoreQuantile(c.monetary, monetaries, false);
    const segment = assignSegment(r, f);
    return {
      ...c,
      r_score: r,
      f_score: f,
      m_score: m,
      rfm_score: r + f + m,
      segment,
      segment_color: SEGMENT_META[segment].color,
      segment_bg:    SEGMENT_META[segment].bg,
    };
  });
}

async function fetchFromDb(forcedBu: string | null): Promise<CustomerRaw[] | null> {
  if (!db) return null;

  // Universo de clientes = as CONTAS (não só quem tem negócio fechado). Assim
  // todo cliente da BU aparece no RFM, mesmo sem oportunidade lançada ainda
  // (frequência/monetário = 0, recência a partir da criação da conta).
  let accQ = db
    .from("crm_accounts")
    .select("account_id,account_name,industry,owner,bu,account_type,created_at")
    .in("account_type", ["customer", "former_customer"]);
  if (forcedBu) accQ = accQ.eq("bu", forcedBu);
  const { data: accs, error: accErr } = await accQ;
  if (accErr || !accs?.length) return null;

  // Estatísticas de compra vêm das oportunidades fechadas (closed_won).
  let oppQ = db
    .from("crm_opportunities")
    .select("account_id,bu,deal_value,actual_close_date")
    .eq("stage", "closed_won")
    .not("actual_close_date", "is", null);
  if (forcedBu) oppQ = oppQ.eq("bu", forcedBu);
  const { data: opps } = await oppQ;

  const today = Date.now();
  const byAccount = new Map<string, { opp_count: number; total: number; latest_close: number }>();
  for (const o of opps ?? []) {
    if (!o.account_id) continue;
    const closeMs = new Date(o.actual_close_date as string).getTime();
    const cur = byAccount.get(o.account_id);
    if (cur) {
      cur.opp_count++;
      cur.total += o.deal_value ?? 0;
      if (closeMs > cur.latest_close) cur.latest_close = closeMs;
    } else {
      byAccount.set(o.account_id, { opp_count: 1, total: o.deal_value ?? 0, latest_close: closeMs });
    }
  }

  const rows: CustomerRaw[] = accs.map(acc => {
    const stats = byAccount.get(acc.account_id);
    const createdMs = acc.created_at ? new Date(acc.created_at).getTime() : 0;
    // Recência: última compra se houver; senão, dias desde a criação da conta.
    const recencyBase = stats ? stats.latest_close : createdMs;
    return {
      account_id:   acc.account_id,
      account_name: acc.account_name,
      industry:     acc.industry ?? null,
      owner:        acc.owner ?? "—",
      bu:           acc.bu ?? "",
      recency_days: recencyBase > 0 ? Math.round((today - recencyBase) / 86400000) : 999,
      frequency:    stats?.opp_count ?? 0,
      monetary:     stats?.total ?? 0,
    };
  });
  rows.sort((a, b) => b.monetary - a.monetary || a.account_name.localeCompare(b.account_name));
  return rows.length > 0 ? rows : null;
}

export async function GET(req: NextRequest) {
  try {
    const forcedBu = await getForcedBu(req);

    // Allow explicit ?bu= override from page UI
    const urlBu = req.nextUrl.searchParams.get("bu");
    const effectiveBu = urlBu && urlBu !== "Todos" ? urlBu : forcedBu;

    let raw = await fetchFromDb(effectiveBu);
    if (!raw) {
      raw = effectiveBu
        ? SEED_RFM_RAW.filter(c => c.bu === effectiveBu)
        : SEED_RFM_RAW;
      if (raw.length === 0) raw = SEED_RFM_RAW;
    }

    const customers = buildRfmCustomers(raw);

    const SEGMENT_ORDER: RfmSegment[] = [
      "Campeões","Clientes Fiéis","Fiéis em Potencial","Novos Clientes",
      "Clientes Promissores","Precisam de Atenção","Quase Dormentes",
      "Não Pode Perder","Em Risco","Hibernando","Perdidos",
    ];

    const segments = Object.fromEntries(
      SEGMENT_ORDER.map(seg => [
        seg,
        { count: customers.filter(c => c.segment === seg).length, ...SEGMENT_META[seg] },
      ])
    ) as RfmResponse["segments"];

    const totalMonetary = customers.reduce((s, c) => s + c.monetary, 0);
    const totals: RfmResponse["totals"] = {
      customers: customers.length,
      monetary: totalMonetary,
      avgMonetary: customers.length > 0 ? Math.round(totalMonetary / customers.length) : 0,
    };

    return NextResponse.json({ success: true, data: { customers, segments, totals } });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
