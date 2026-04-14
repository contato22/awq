import Header from "@/components/Header";
import Link from "next/link";
import { Users, ChevronRight, Building2, Info } from "lucide-react";
import { advisorClients } from "@/lib/advisor-clients";

// ─── /advisor/customers — Carteira de Clientes Advisor ───────────────────────
//
// SOURCE: lib/advisor-clients.ts
//
// Exibe a carteira de clientes contratados pelo Advisor / AWQ Group.
// Cada cliente com status "active" ou "onboarding" conta como cliente ativo.

const STATUS_LABEL: Record<string, string> = {
  onboarding: "Onboarding",
  active:     "Ativo",
  inactive:   "Inativo",
  prospect:   "Prospect",
};

const STATUS_COLOR: Record<string, string> = {
  onboarding: "bg-violet-100 text-violet-700 border-violet-200",
  active:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive:   "bg-gray-100 text-gray-500 border-gray-200",
  prospect:   "bg-amber-100 text-amber-700 border-amber-200",
};

export default function AdvisorCustomersPage() {
  const activeClients = advisorClients.filter(
    (c) => c.status === "active" || c.status === "onboarding"
  );

  return (
    <>
      <Header
        title="Customers — Advisor"
        subtitle="Consultoria · AWQ Group"
      />
      <div className="page-container">

        {/* ── Counters ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Clientes Ativos",  value: String(activeClients.length),  sub: "Ativos e em onboarding" },
            { label: "Total Carteira",   value: String(advisorClients.length),  sub: "Todos os clientes"       },
            { label: "AUM Total",        value: "R$ 0",                         sub: "Sem capital sob gestão"  },
            { label: "Fee MRR",          value: "R$ 0",                         sub: "Sem fee mensal ativo"    },
          ].map((m) => (
            <div key={m.label} className="card p-5">
              <div className="text-2xl font-bold text-gray-900">{m.value}</div>
              <div className="text-xs font-medium text-gray-500 mt-0.5">{m.label}</div>
              <div className="text-[10px] text-gray-400 mt-1">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Client list ───────────────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-violet-600" />
              <span className="text-sm font-semibold text-gray-900">Carteira de Clientes</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
              {activeClients.length} {activeClients.length === 1 ? "CLIENTE" : "CLIENTES"}
            </span>
          </div>

          {advisorClients.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              Nenhum cliente cadastrado.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {advisorClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/advisor/customers/${client.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-violet-50 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-violet-600" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 group-hover:text-violet-700 truncate">
                        {client.name}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_COLOR[client.status]}`}>
                        {STATUS_LABEL[client.status]}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                        {client.type}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {client.sector !== "—" ? client.sector : "Setor a confirmar"}
                      {client.note ? ` · ${client.note}` : ""}
                    </div>
                  </div>

                  {/* AUM */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-sm font-semibold text-gray-700">
                      {client.aum > 0
                        ? "R$" + (client.aum / 1_000_000).toFixed(1) + "M"
                        : "—"}
                    </div>
                    <div className="text-[10px] text-gray-400">AUM</div>
                  </div>

                  <ChevronRight size={14} className="text-gray-300 group-hover:text-violet-500 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Info notice ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 flex items-start gap-3">
          <Info size={15} className="text-violet-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-violet-800">
              BU em construção · Dados em cadastramento
            </p>
            <p className="text-[11px] text-violet-700 mt-1 leading-relaxed">
              A carteira Advisor está sendo estruturada. Valores de AUM, fee e contrato
              serão preenchidos após formalização dos acordos. Clientes com status
              "Onboarding" já estão em processo de entrada.
            </p>
            <p className="text-[11px] text-violet-600 mt-2">
              Fonte:{" "}
              <code className="bg-violet-100 px-1 rounded text-[10px]">lib/advisor-clients.ts</code>
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
