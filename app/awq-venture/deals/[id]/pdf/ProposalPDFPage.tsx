"use client";
// ─── Proposta Digital — Layout PDF Consulting-Grade ───────────────────────────
// Documento técnico, objetivo, minimalista.
// window.print() disparado 800ms após mount para gerar PDF via browser.

import { useEffect } from "react";
import { notFound } from "next/navigation";
import { getDealById } from "@/lib/deal-data";
import type { ProposalMetrica, ProposalTrancheItem } from "@/lib/deal-types";

// ─── CSS completo (screen + print) ───────────────────────────────────────────

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:white;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:10pt;line-height:1.6;color:#0f172a}
@page{size:A4;margin:16mm 18mm 18mm 18mm}
@page:first{margin:0}

/* Screen */
@media screen{
  body{background:#e2e8f0}
  #topbar{position:fixed;top:0;left:0;right:0;z-index:999;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:9px 24px;font-size:12px;font-family:inherit;gap:12px}
  #topbar button{background:#d97706;color:#fff;border:none;padding:6px 16px;border-radius:6px;font-weight:700;cursor:pointer;font-size:11px;font-family:inherit}
  #topbar button:hover{background:#b45309}
  main{padding-top:44px}
  .page{background:white;max-width:210mm;margin:0 auto 10mm;padding:18mm 18mm 20mm;box-shadow:0 2px 16px rgba(0,0,0,.12)}
}

/* Print */
@media print{
  #topbar{display:none}
  main{padding-top:0}
  .page{page-break-after:always;padding:0;max-width:none;box-shadow:none;margin:0}
  .page:last-child{page-break-after:auto}
  .nb{page-break-inside:avoid}
}

/* Cover elements */
.eyebrow{font-size:7.5pt;letter-spacing:.22em;text-transform:uppercase;color:#64748b}
.cover-title{font-size:27pt;font-weight:900;line-height:1.15;letter-spacing:-.01em}
.cover-client{font-size:15pt;font-weight:300;color:#374151;margin-top:4pt}
.meta-lbl{font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#94a3b8;margin-bottom:1.5pt}
.meta-val{font-size:10pt;font-weight:600;color:#0f172a}

/* Section head */
.sh{display:flex;align-items:flex-end;gap:10pt;padding-bottom:7pt;border-bottom:1.5pt solid #0f172a;margin-bottom:15pt}
.sh-num{font-size:32pt;font-weight:900;color:#d97706;line-height:1}
.sh-title{font-size:13pt;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.sh-sub{font-size:7.5pt;color:#64748b;text-transform:uppercase;letter-spacing:.12em;margin-top:2pt}

/* Label-value row */
.lv{display:grid;grid-template-columns:108pt 1fr;gap:10pt;margin-bottom:7pt;align-items:start}
.lv-l{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#64748b;padding-top:2pt}
.lv-v{font-size:10pt;color:#0f172a;line-height:1.55}

/* Dividers */
hr{border:none;border-top:.5pt solid #e2e8f0;margin:8pt 0}
.rule{height:0;border-top:1pt solid #cbd5e1;margin:12pt 0}

/* Boxes */
.box{padding:10pt 12pt;margin:8pt 0}
.box-a{background:#fffbeb;border-left:3pt solid #d97706}
.box-r{background:#fef2f2;border-left:3pt solid #ef4444}
.box-g{background:#f0fdf4;border-left:3pt solid #16a34a}
.box-s{background:#f8fafc;border:.5pt solid #e2e8f0}
.box-lbl{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5pt}
.box-a .box-lbl{color:#b45309}
.box-r .box-lbl{color:#dc2626}
.box-g .box-lbl{color:#15803d}
.box-s .box-lbl{color:#475569}
.box-body{font-size:10pt;line-height:1.6;color:#0f172a}

/* Bullets */
.bl{list-style:none}
.bl li{display:flex;align-items:flex-start;gap:7pt;margin-bottom:4pt;font-size:10pt;line-height:1.5}
.bl li::before{content:"—";color:#d97706;font-weight:700;flex-shrink:0}
.bl.g li::before{color:#16a34a}
.bl.b li::before{color:#2563eb}
.bl.gr li::before{color:#94a3b8}
.ol{list-style:none;counter-reset:ol}
.ol li{counter-increment:ol;display:flex;gap:8pt;margin-bottom:5pt;font-size:10pt;line-height:1.5}
.ol li::before{content:counter(ol,decimal-leading-zero);font-size:7.5pt;font-weight:700;color:#d97706;min-width:18pt;margin-top:2pt}

/* Tables */
table{width:100%;border-collapse:collapse;font-size:9pt;margin:5pt 0}
thead th{font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#64748b;padding:5pt 7pt;border-bottom:.75pt solid #0f172a;text-align:left;white-space:nowrap}
tbody td{padding:5pt 7pt;border-bottom:.5pt solid #e2e8f0;vertical-align:top}
tbody tr:last-child td{border-bottom:none}
tbody tr:nth-child(even) td{background:#f8fafc}
.tb{font-weight:600}
.ta{color:#b45309;font-weight:600}
.tg{color:#15803d;font-weight:600}

/* Subsection title */
.ss{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#374151;border-bottom:.5pt solid #cbd5e1;padding-bottom:3pt;margin:11pt 0 7pt}

/* Grid */
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10pt}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12pt}
.gcol{padding:10pt;border:.5pt solid #e2e8f0}
.gcol-g{border-left:2.5pt solid #16a34a;background:#f0fdf4}
.gcol-b{border-left:2.5pt solid #2563eb;background:#eff6ff}
.gcol-s{border-left:2.5pt solid #94a3b8;background:#f8fafc}
.gcol-t{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6pt}
.gcol-g .gcol-t{color:#15803d}
.gcol-b .gcol-t{color:#1d4ed8}
.gcol-s .gcol-t{color:#475569}

/* Timeline */
.trow{display:flex;align-items:flex-start;gap:10pt;padding:8pt 0;border-bottom:.5pt solid #e2e8f0}
.trow:last-child{border-bottom:none}
.tnum{width:22pt;height:22pt;border-radius:50%;background:#d97706;color:white;font-size:8pt;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tlbl{font-size:10pt;font-weight:600;margin-bottom:2pt}
.tdesc{font-size:9pt;color:#475569;line-height:1.45}
.tmeta{font-size:8pt;color:#64748b;margin-top:3pt}

/* Decision grid */
.dg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8pt;margin-top:10pt}
.dc{padding:10pt;border:.5pt solid}
.dc-ap{border-color:#86efac;background:#f0fdf4}
.dc-aj{border-color:#fcd34d;background:#fffbeb}
.dc-co{border-color:#c4b5fd;background:#faf5ff}
.dc-t{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5pt}
.dc-ap .dc-t{color:#15803d}
.dc-aj .dc-t{color:#b45309}
.dc-co .dc-t{color:#7c3aed}
.dc-d{font-size:9pt;color:#374151;line-height:1.5}

/* Footer */
.pf{margin-top:20pt;padding-top:6pt;border-top:.5pt solid #e2e8f0;display:flex;justify-content:space-between;font-size:7.5pt;color:#94a3b8}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LV({ l, v }: { l: string; v: string }) {
  return (
    <div className="lv">
      <div className="lv-l">{l}</div>
      <div className="lv-v">{v}</div>
    </div>
  );
}

function Bl({ items, variant = "" }: { items: string[]; variant?: string }) {
  return (
    <ul className={`bl ${variant}`}>
      {items.map((x, i) => <li key={i}>{x}</li>)}
    </ul>
  );
}

function Ol({ items }: { items: string[] }) {
  return (
    <ol className="ol">
      {items.map((x, i) => <li key={i}>{x}</li>)}
    </ol>
  );
}

function MetricTbl({ rows }: { rows: ProposalMetrica[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Métrica</th><th>Fórmula / Definição</th>
          <th>Baseline</th><th>Meta</th><th>Aud.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((m, i) => (
          <tr key={i}>
            <td className="tb">{m.nome}</td>
            <td>{m.formula}</td>
            <td>{m.baseline}</td>
            <td className="tg">{m.meta}</td>
            <td>{m.auditavel ? "✓" : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TrancheTbl({ rows }: { rows: ProposalTrancheItem[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Tranche</th><th>Valor</th>
          <th>Condição de Liberação</th><th>Prazo</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t, i) => (
          <tr key={i}>
            <td className="tb">{t.label}</td>
            <td className="ta">{t.valor}</td>
            <td>{t.condicao}</td>
            <td>{t.prazo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PF({ id, n }: { id: string; n: number }) {
  return (
    <div className="pf">
      <span>AWQ Venture × {id} — Proposta Confidencial</span>
      <span>Pág. {n}</span>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ProposalPDFPage({ params }: { params: { id: string } }) {
  const deal = getDealById(params.id);
  if (!deal || !deal.proposal10Blocks) notFound();
  const B = deal.proposal10Blocks!;

  useEffect(() => {
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, []);

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Top bar (screen only) ──────────────────────────────────────────── */}
      <div id="topbar">
        <span>Proposta PDF · AWQ Venture × {deal.companyName} · {deal.id}</span>
        <button onClick={() => window.print()}>↓ Salvar / Imprimir PDF</button>
      </div>

      <main>

        {/* ══ CAPA ══════════════════════════════════════════════════════════ */}
        <div className="page" style={{ display:"flex", flexDirection:"column", minHeight:"297mm", padding:0 }}>
          <div style={{ height:"8mm", background:"#d97706" }} />
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"20mm 18mm" }}>
            {/* Top */}
            <div>
              <div className="eyebrow" style={{ marginBottom:"8pt" }}>AWQ VENTURE · DOCUMENTO CONFIDENCIAL</div>
              <div style={{ width:"36pt", height:"3pt", background:"#d97706", marginBottom:"14pt" }} />
              <div className="cover-title">Proposta de<br />Parceria Estratégica</div>
              <div className="cover-client">AWQ Venture × {deal.companyName}</div>
            </div>
            {/* Metadata grid */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14pt", maxWidth:"300pt" }}>
              {([
                ["Deal ID",         deal.id],
                ["Setor",           deal.identification.sector],
                ["Estágio",         deal.stage],
                ["Ticket avaliado", `R$ ${(deal.proposedValue/1_000_000).toFixed(1)}M`],
                ["Score interno",   `${deal.dealScore.toFixed(1)} / 10.0`],
                ["Versão",          `${B.versao}.0 — ${today}`],
              ] as [string,string][]).map(([k,v]) => (
                <div key={k}>
                  <div className="meta-lbl">{k}</div>
                  <div className="meta-val">{v}</div>
                </div>
              ))}
            </div>
            {/* Footer */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:".5pt solid #e2e8f0", paddingTop:"8pt" }}>
              <div style={{ fontSize:"7.5pt", color:"#94a3b8", maxWidth:"280pt" }}>
                Este documento é estritamente confidencial e destinado exclusivamente à empresa destinatária. Qualquer reprodução ou divulgação não autorizada é vedada.
              </div>
              <div style={{ fontWeight:900, fontSize:"12pt", color:"#d97706", letterSpacing:".05em" }}>AWQ VENTURE</div>
            </div>
          </div>
          <div style={{ height:"3mm", background:"#f59e0b" }} />
        </div>

        {/* ══ B1: CONTEXTO ══════════════════════════════════════════════════ */}
        <div className="page">
          <div className="sh"><div className="sh-num">01</div><div><div className="sh-title">Contexto do Deal</div><div className="sh-sub">Diagnóstico · Situação · Oportunidade · Risco</div></div></div>
          <LV l="Diagnóstico" v={B.b1.diagnostico} />
          <hr />
          <LV l="Situação atual" v={B.b1.situacaoAtual} />
          <hr />
          <LV l="Problema identificado" v={B.b1.problema} />
          <hr />
          <LV l="Ruptura de mercado" v={B.b1.ruptura} />
          <div className="nb" style={{ marginTop:"12pt" }}>
            <div className="box box-a">
              <div className="box-lbl">Oportunidade identificada</div>
              <div className="box-body">{B.b1.oportunidade}</div>
            </div>
          </div>
          <div className="nb" style={{ marginTop:"8pt" }}>
            <div className="box box-r">
              <div className="box-lbl">Risco de não agir</div>
              <div className="box-body">{B.b1.riscoNaoAgir}</div>
            </div>
          </div>
          <PF id={deal.id} n={2} />
        </div>

        {/* ══ B2: TESE ══════════════════════════════════════════════════════ */}
        <div className="page">
          <div className="sh"><div className="sh-num">02</div><div><div className="sh-title">Tese de Criação de Valor</div><div className="sh-sub">Alavancas · Assimetria · Papel AWQ · Horizonte</div></div></div>
          <div className="ss">Alavancas Principais de Valor</div>
          <Bl items={B.b2.alavancasPrincipais} />
          <div className="rule" />
          <LV l="Assimetria do deal" v={B.b2.assimetriaDeal} />
          <hr />
          <LV l="Papel da AWQ Venture" v={B.b2.papelAWQ} />
          <div className="nb" style={{ marginTop:"12pt" }}>
            <div className="box box-g">
              <div className="box-lbl">Resultado esperado</div>
              <div className="box-body">{B.b2.resultadoEsperado}</div>
            </div>
          </div>
          <div style={{ marginTop:"10pt" }}>
            <LV l="Horizonte de investimento" v={B.b2.horizonte} />
          </div>
          <PF id={deal.id} n={3} />
        </div>

        {/* ══ B3: ESCOPO ════════════════════════════════════════════════════ */}
        <div className="page">
          <div className="sh"><div className="sh-num">03</div><div><div className="sh-title">Escopo da Atuação</div><div className="sh-sub">Entrega · Coordenação · Limites</div></div></div>
          <div className="g3">
            <div className="gcol gcol-g">
              <div className="gcol-t">AWQ entrega</div>
              <Bl items={B.b3.oQueEntrega} variant="g" />
            </div>
            <div className="gcol gcol-b">
              <div className="gcol-t">AWQ coordena</div>
              <Bl items={B.b3.oQueCoordena} variant="b" />
            </div>
            <div className="gcol gcol-s">
              <div className="gcol-t">Fora do campo</div>
              <Bl items={B.b3.foraDoCampo} variant="gr" />
            </div>
          </div>
          <div className="rule" />
          <LV l="Dedicação operacional" v={B.b3.dedicacao} />

          {/* B4 on same page */}
          <div style={{ marginTop:"20pt" }}>
            <div className="sh"><div className="sh-num">04</div><div><div className="sh-title">Objeto Econômico da Proposta</div><div className="sh-sub">Ativo · Veículo · Direito · Conversão</div></div></div>
            <LV l="Ativo" v={B.b4.ativo} />
            <hr />
            <LV l="Veículo jurídico" v={B.b4.veiculo} />
            <hr />
            <LV l="Natureza do direito" v={B.b4.naturezaDireito} />
            <hr />
            <LV l="Conversão futura" v={B.b4.conversaoFutura} />
            <div className="nb" style={{ marginTop:"10pt" }}>
              <div className="box box-s">
                <div className="box-lbl">Referência de valor</div>
                <div className="box-body">{B.b4.valorReferencia}</div>
              </div>
            </div>
          </div>
          <PF id={deal.id} n={4} />
        </div>

        {/* ══ B5: ESTRUTURA ECONÔMICA ═══════════════════════════════════════ */}
        <div className="page">
          <div className="sh"><div className="sh-num">05</div><div><div className="sh-title">Estrutura Econômica</div><div className="sh-sub">Fee · Upside · Gates · Tranches · Earn-in</div></div></div>
          <div className="ss">Fee de Advisory</div>
          <LV l="Descrição" v={B.b5.feeDescricao} />
          <LV l="Valor" v={B.b5.feeValor} />
          <LV l="Prazo" v={B.b5.feePrazo} />
          <div className="rule" />
          <div className="ss">Upside Societário</div>
          <LV l="Descrição" v={B.b5.upsideDescricao} />
          <LV l="Participação alvo" v={B.b5.upsidePercentual} />
          <div className="rule" />
          <div className="ss">Gates e Condições de Liberação</div>
          <Bl items={B.b5.gates} />
          <div className="rule" />
          <div className="ss">Estrutura de Tranches</div>
          <TrancheTbl rows={B.b5.tranches} />
          <div className="rule" />
          <LV l="Baseline de receita" v={B.b5.baseline} />
          <hr />
          <LV l="Earn-in / Acelerador" v={B.b5.earnin} />
          <PF id={deal.id} n={5} />
        </div>

        {/* ══ B6: SCORECARD ═════════════════════════════════════════════════ */}
        <div className="page">
          <div className="sh"><div className="sh-num">06</div><div><div className="sh-title">Scorecard e Métricas</div><div className="sh-sub">Financeiras · Comerciais · Institucionais · Auditoria</div></div></div>
          <div className="ss">Métricas Financeiras</div>
          <MetricTbl rows={B.b6.financeiras} />
          <div className="ss">Métricas Comerciais</div>
          <MetricTbl rows={B.b6.comerciais} />
          <div className="ss">Métricas Institucionais</div>
          <MetricTbl rows={B.b6.institucionais} />
          <div className="rule" />
          <LV l="Periodicidade de revisão" v={B.b6.periodicidade} />
          <hr />
          <LV l="Auditor externo" v={B.b6.auditor} />
          <PF id={deal.id} n={6} />
        </div>

        {/* ══ B7: GOVERNANÇA ════════════════════════════════════════════════ */}
        <div className="page">
          <div className="sh"><div className="sh-num">07</div><div><div className="sh-title">Governança e Alçadas</div><div className="sh-sub">Direitos · Reporting · Representação · Conflito</div></div></div>
          <div className="ss">Direitos da AWQ Venture</div>
          <Bl items={B.b7.direitosAWQ} />
          <div className="rule" />
          <div className="ss">Rotinas de Reporting</div>
          <Bl items={B.b7.rotinasReporting} />
          <div className="rule" />
          <LV l="Alçadas de decisão" v={B.b7.alcadasDecisao} />
          <hr />
          <LV l="Representação" v={B.b7.representacao} />
          <hr />
          <LV l="Resolução de conflitos" v={B.b7.conflito} />

          {/* B8 on same page */}
          <div style={{ marginTop:"20pt" }}>
            <div className="sh"><div className="sh-num">08</div><div><div className="sh-title">Proteções Contratuais</div><div className="sh-sub">Good/Bad Leaver · Anti-diluição · Tag/Drag · Lock-up</div></div></div>
            <div className="g2" style={{ marginBottom:"10pt" }}>
              {([
                ["Good Leaver",  B.b8.goodLeaver],
                ["Bad Leaver",   B.b8.badLeaver],
                ["Anti-diluição",B.b8.antiDiluicao],
                ["Change of Control",B.b8.changeOfControl],
              ] as [string,string][]).map(([k,v]) => (
                <div key={k} className="box box-s nb">
                  <div className="box-lbl">{k}</div>
                  <div className="box-body">{v}</div>
                </div>
              ))}
            </div>
            <LV l="Tag-Along / Drag-Along" v={B.b8.tagDragAlong} />
            <hr />
            <LV l="Lock-up" v={B.b8.lockup} />
            <div className="ss">Cláusulas Penais</div>
            <Bl items={B.b8.clausulasPenais} />
          </div>
          <PF id={deal.id} n={7} />
        </div>

        {/* ══ B9: CRONOGRAMA ════════════════════════════════════════════════ */}
        <div className="page">
          <div className="sh"><div className="sh-num">09</div><div><div className="sh-title">Cronograma de Fechamento</div><div className="sh-sub">Marcos · Dependências · Condições</div></div></div>
          {B.b9.marcos.map((m) => (
            <div key={m.numero} className="trow nb">
              <div className="tnum">{m.numero}</div>
              <div style={{ flex:1 }}>
                <div className="tlbl">{m.label}</div>
                <div className="tdesc">{m.descricao}</div>
                <div className="tmeta">
                  {m.prazo && <span style={{ marginRight:"12pt" }}>📅 {m.prazo}</span>}
                  {m.dependencia && <span style={{ color:"#94a3b8" }}>Dep: {m.dependencia}</span>}
                </div>
              </div>
            </div>
          ))}
          <div className="rule" />
          <LV l="Prazo total" v={B.b9.prazoTotal} />
          <hr />
          <LV l="Janela de revisão" v={B.b9.janelaRevisao} />
          <div className="ss">Condições de Fechamento</div>
          <Bl items={B.b9.condicoesFechamento} variant="g" />
          <PF id={deal.id} n={8} />
        </div>

        {/* ══ B10: DECISÃO ══════════════════════════════════════════════════ */}
        <div className="page">
          <div className="sh"><div className="sh-num">10</div><div><div className="sh-title">Decisão Solicitada</div><div className="sh-sub">Perguntas · CTA · Caminhos de resposta</div></div></div>
          <div className="ss">Seis Perguntas Estruturadas</div>
          <Ol items={B.b10.perguntasEstruturadas} />
          <div style={{ marginTop:"14pt" }} className="nb">
            <div className="box box-a">
              <div className="box-lbl">Ação requerida — {B.b10.ctaLabel}</div>
              <div className="box-body">{B.b10.ctaDescricao}</div>
            </div>
          </div>
          <div className="ss">Caminhos de Resposta</div>
          <div className="dg nb">
            <div className="dc dc-ap">
              <div className="dc-t">{B.b10.caminhos[0]?.label}</div>
              <div className="dc-d">{B.b10.caminhos[0]?.descricao}</div>
            </div>
            <div className="dc dc-aj">
              <div className="dc-t">{B.b10.caminhos[1]?.label}</div>
              <div className="dc-d">{B.b10.caminhos[1]?.descricao}</div>
            </div>
            <div className="dc dc-co">
              <div className="dc-t">{B.b10.caminhos[2]?.label}</div>
              <div className="dc-d">{B.b10.caminhos[2]?.descricao}</div>
            </div>
          </div>
          <div className="rule" />
          <LV l="Prazo de resposta" v={B.b10.prazoResposta} />
          <hr />
          <LV l="Contato para negociação" v={B.b10.contatoNegociacao} />
          <div style={{ marginTop:"24pt", padding:"10pt 12pt", background:"#0f172a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:"7.5pt", color:"#94a3b8" }}>Documento confidencial · AWQ Venture · {deal.id} · {today}</div>
            <div style={{ fontWeight:900, fontSize:"11pt", color:"#d97706", letterSpacing:".05em" }}>AWQ VENTURE</div>
          </div>
        </div>

      </main>
    </>
  );
}
