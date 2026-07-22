// ─── /api/enrd/bi-daily ──────────────────────────────────────────────────────
// BI diário da BU ENRD (perímetro pós-venda/O&M): por dia, quanto está
//   FATURANDO  = Σ valor das OS de pós-venda realizadas no dia
//   GASTANDO   = custo variável do dia (material+combustível) + rateio diário
//                do custo FIXO do mês (folha+veículo ÷ dias do mês)
//   MARGEM     = faturado − gasto
// Fonte: CRM projetos (pos_venda_servicos) AO VIVO, fallback snapshot.

import { NextResponse } from "next/server";
import { getConfig } from "@/lib/enrd-posvenda-db";
import { getLiveProjetosPosVenda } from "@/lib/enerdy-projetos";
import { getReconciliacaoMes } from "@/lib/enrd-reconciliacao";
import {
  contribuicaoOS,
  resultadoMes,
  classificarDono,
  isRealizado,
} from "@/lib/enrd-posvenda-costing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(): Promise<NextResponse> {
  try {
    const config = await getConfig();
    const pv = await getLiveProjetosPosVenda();
    const os = pv?.servicos ?? [];
    const stale = !!pv?.stale;

    // Perímetro do vesting: só OS de pós-venda realizada.
    const contrib = os
      .map((o) => ({
        ...contribuicaoOS(o, config),
        status: o.status ?? null,
        dono: classificarDono(o.tipoServico),
      }))
      .filter((o) => o.dono === "pos_venda" && isRealizado(o.status));

    const hoje = new Date().toISOString().slice(0, 10);
    const mes = hoje.slice(0, 7);
    const recon = await getReconciliacaoMes(mes);
    const mtd = contrib.filter((o) => (o.data ?? "").startsWith(mes));
    const res = resultadoMes(mtd, config);
    const [y, m] = mes.split("-").map(Number);
    const diasNoMes = new Date(y, m, 0).getDate();
    // Custo fixo do mês rateado por dia (folha+veículo — o "burn" diário).
    const custoFixoDia = diasNoMes > 0 ? res.custoFixoAplicado / diasNoMes : 0;

    type Acc = { faturado: number; custoVar: number; nOS: number };
    const byDay = new Map<string, Acc>();
    for (const o of contrib) {
      if (!o.data) continue;
      const a = byDay.get(o.data) ?? { faturado: 0, custoVar: 0, nOS: 0 };
      a.faturado += o.valor;
      a.custoVar += o.valor - o.contribuicao; // material + combustível
      a.nOS += 1;
      byDay.set(o.data, a);
    }

    function dayMetrics(d: string) {
      const a = byDay.get(d) ?? { faturado: 0, custoVar: 0, nOS: 0 };
      const gasto = a.custoVar + custoFixoDia;
      const margem = a.faturado - gasto;
      return {
        date: d,
        faturado: round2(a.faturado),
        gasto: round2(gasto),
        custoVar: round2(a.custoVar),
        custoFixoDia: round2(custoFixoDia),
        margem: round2(margem),
        margemPct: a.faturado > 0 ? margem / a.faturado : margem < 0 ? -1 : 0,
        nOS: a.nOS,
      };
    }

    // Últimos 14 dias (inclui hoje).
    const dias: ReturnType<typeof dayMetrics>[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dias.push(dayMetrics(d));
    }

    return NextResponse.json({
      ok: true,
      stale,
      fetchedAt: pv?.fetchedAt ?? null,
      hoje: dayMetrics(hoje),
      dias,
      mes: {
        ref: mes,
        faturamento: round2(res.faturamento),
        custoFixo: round2(res.custoFixoAplicado),
        resultado: round2(res.resultado),
        custoFixoDia: round2(custoFixoDia),
        diasNoMes,
        comBonus: res.comBonus,
      },
      // Caixa REAL (Cora) — a verdade, para o número do CRM não enganar.
      real: {
        recebidoCora: round2(recon.recebidoCora),
        logadoCRM: round2(recon.valorLogado),
        resultadoOM: round2(recon.resultadoOM),
        suporteIntegracao: round2(recon.suporteIntegracao),
        saldoCaixa: round2(recon.saldoCaixa),
        coraDisponivel: recon.coraDisponivel,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
