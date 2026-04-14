import Header from "@/components/Header";
import Link from "next/link";
import { Building2, ChevronLeft, Info, FileText, DollarSign, Calendar } from "lucide-react";
import { getAdvisorClient } from "@/lib/advisor-clients";
import { notFound } from "next/navigation";

// ─── /advisor/customers/avva — Ficha do Cliente AVVA ─────────────────────────
//
// SOURCE: lib/advisor-clients.ts → getAdvisorClient("avva")

export default function AvvaClientPage() {
  const client = getAdvisorClient("avva");
  if (!client) notFound();

  const statusLabel: Record<string, string> = {
    onboarding: "Onboarding",
    active:     "Ativo",
    inactive:   "Inativo",
    prospect:   "Prospect",
  };

  const statusColor: Record<string, string> = {
    onboarding: "bg-violet-100 text-violet-700 border-violet-200",
    active:     "bg-emerald-100 text-emerald-700 border-emerald-200",
    inactive:   "bg-gray-100 text-gray-500 border-gray-200",
    prospect:   "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <>
      <Header
        title={client.name}
        subtitle="Cliente Advisor · AWQ Group"
      />
      <div className="page-container">

        {/* ── Back ──────────────────────────────────────────────────────────── */}
        <div>
          <Link
            href="/advisor/customers"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-600 transition-colors"
          >
            <ChevronLeft size={13} />
            Voltar para Carteira
          </Link>
        </div>

        {/* ── Client header card ────────────────────────────────────────────── */}
        <div className="card p-6 flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
            <Building2 size={26} className="text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor[client.status]}`}>
                {statusLabel[client.status]}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                {client.type}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {client.sector !== "—" ? client.sector : "Setor a confirmar"}
              {" · "}
              Cliente Advisor / AWQ Group
            </p>
            {client.note && (
              <p className="text-xs text-gray-400 mt-1">{client.note}</p>
            )}
          </div>
        </div>

        {/* ── KPI cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            {
              icon:  DollarSign,
              label: "AUM",
              value: client.aum > 0
                ? "R$" + (client.aum / 1_000_000).toFixed(1) + "M"
                : "—",
              sub:   "Assets Under Management",
            },
            {
              icon:  FileText,
              label: "Fee Mensal",
              value: client.monthlyFee > 0
                ? "R$" + client.monthlyFee.toLocaleString("pt-BR")
                : "—",
              sub:   "Fee de consultoria / mês",
            },
            {
              icon:  Calendar,
              label: "Início do Contrato",
              value: client.contractStart
                ? new Date(client.contractStart).toLocaleDateString("pt-BR")
                : "—",
              sub:   "Data de início",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
                <kpi.icon size={16} className="text-violet-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
                <div className="text-[10px] text-gray-400">{kpi.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Info notice ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 flex items-start gap-3">
          <Info size={15} className="text-violet-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-violet-800">
              Ficha em construção
            </p>
            <p className="text-[11px] text-violet-700 mt-1 leading-relaxed">
              Os dados contratuais de AVVA (AUM, fee mensal, data de início) serão
              preenchidos após formalização do contrato de consultoria. O status
              "Onboarding" indica que o cliente foi cadastrado e está em processo de entrada.
            </p>
            <p className="text-[11px] text-violet-600 mt-2">
              Fonte:{" "}
              <code className="bg-violet-100 px-1 rounded text-[10px]">lib/advisor-clients.ts</code>
              {" "}→ getAdvisorClient(&quot;avva&quot;)
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
