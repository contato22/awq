"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { Building2, Plus, Search, AlertTriangle, CheckCircle2, Trash2, HardDrive } from "lucide-react";
import type { CrmAccount } from "@/lib/crm-types";
import { SEED_ACCOUNTS } from "@/lib/crm-db";

const LS_KEY = "crm_accounts";

const TYPE_LABELS: Record<string, string> = {
  prospect:        "Prospect",
  customer:        "Cliente",
  partner:         "Parceiro",
  former_customer: "Ex-cliente",
};

const TYPE_COLORS: Record<string, string> = {
  prospect:        "bg-blue-50 text-blue-700",
  customer:        "bg-emerald-50 text-emerald-700",
  partner:         "bg-violet-50 text-violet-700",
  former_customer: "bg-gray-100 text-gray-600",
};

function HealthBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  const icon = score >= 80 ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />;
  return (
    <span className={`flex items-center gap-1 text-[11px] font-semibold ${color}`}>
      {icon} {score}
    </span>
  );
}

function loadFromStorage(): CrmAccount[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as CrmAccount[];
  } catch { /* ignore */ }
  return null;
}

function saveToStorage(data: CrmAccount[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filterType, setFilterType] = useState("Todos");
  const [filterOwner, setFilterOwner] = useState("Todos");
  const [isManual, setIsManual] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setAccounts(stored);
      setIsManual(true);
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    if (filterType !== "Todos") params.set("account_type", filterType);
    if (filterOwner !== "Todos") params.set("owner", filterOwner);
    if (search) params.set("search", search);
    fetch(`/api/crm/accounts?${params}`)
      .then(r => r.json())
      .then(res => {
        const data = res.success ? res.data : SEED_ACCOUNTS;
        setAccounts(data);
        saveToStorage(data);
        setIsManual(true);
      })
      .catch(() => {
        setAccounts(SEED_ACCOUNTS);
        saveToStorage(SEED_ACCOUNTS);
        setIsManual(true);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-filter from localStorage when filters change (after initial load)
  useEffect(() => {
    if (loading) return;
    const stored = loadFromStorage();
    const base = stored ?? SEED_ACCOUNTS;
    let filtered = base;
    if (filterType !== "Todos") filtered = filtered.filter(a => a.account_type === filterType);
    if (filterOwner !== "Todos") filtered = filtered.filter(a => a.owner === filterOwner);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(a =>
        a.account_name.toLowerCase().includes(q) ||
        (a.trade_name ?? "").toLowerCase().includes(q) ||
        (a.document_number ?? "").includes(q)
      );
    }
    setAccounts(filtered);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterOwner, search]);

  function handleDelete(id: string) {
    const stored = loadFromStorage() ?? SEED_ACCOUNTS;
    const next = stored.filter(a => a.account_id !== id);
    saveToStorage(next);

    // Re-apply current filters to the updated list
    let filtered = next;
    if (filterType !== "Todos") filtered = filtered.filter(a => a.account_type === filterType);
    if (filterOwner !== "Todos") filtered = filtered.filter(a => a.owner === filterOwner);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(a =>
        a.account_name.toLowerCase().includes(q) ||
        (a.trade_name ?? "").toLowerCase().includes(q) ||
        (a.document_number ?? "").includes(q)
      );
    }
    setAccounts(filtered);
    setConfirmDelete(null);
  }

  const customers  = accounts.filter(a => a.account_type === "customer").length;
  const prospects  = accounts.filter(a => a.account_type === "prospect").length;
  const atRisk     = accounts.filter(a => a.churn_risk === "high").length;

  return (
    <>
      <Header title="Contas — CRM AWQ" subtitle="Empresas e organizações" />
      <div className="page-container">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Contas",  value: accounts.length, color: "text-blue-600",    bg: "bg-blue-50",    icon: Building2 },
            { label: "Clientes",      value: customers,        color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
            { label: "Prospects",     value: prospects,        color: "text-violet-600",  bg: "bg-violet-50",  icon: Building2 },
            { label: "Em Risco",      value: atRisk,           color: atRisk > 0 ? "text-red-600" : "text-gray-500", bg: atRisk > 0 ? "bg-red-50" : "bg-gray-50", icon: AlertTriangle },
          ].map(k => (
            <div key={k.label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                <k.icon size={16} className={k.color} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{k.value}</div>
                <div className="text-[10px] text-gray-500">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conta..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400" />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {["Todos","prospect","customer","partner"].map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                {t === "Todos" ? "Todos" : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {["Todos","Miguel","Danilo"].map(o => (
              <button key={o} onClick={() => setFilterOwner(o)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterOwner === o ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                {o}
              </button>
            ))}
          </div>
          <Link href="/crm/accounts/add"
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors">
            <Plus size={13} /> Nova Conta
          </Link>
          {isManual && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
              <HardDrive size={11} /> Local
            </span>
          )}
        </div>

        {/* Table */}
        <div className="card">
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Empresa","Tipo","Cidade","Owner","Opps","Health","Risco",""].map((h, i) => (
                    <th key={i} className="text-left py-3 px-4 text-[11px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length:4}).map((_,i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {Array.from({length:8}).map((_,j) => (
                        <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : accounts.length === 0 ? (
                  <tr><td colSpan={8} className="py-0">
                    <EmptyState compact icon={<Building2 size={16} className="text-gray-400" />} title="Nenhuma conta encontrada" />
                  </td></tr>
                ) : (
                  accounts.map(a => (
                    <tr key={a.account_id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/crm/accounts/${a.account_id}`} className="hover:text-brand-600 transition-colors">
                          <div className="font-medium text-gray-900 text-[13px]">{a.trade_name ?? a.account_name}</div>
                          {a.document_number && <div className="text-[10px] text-gray-400">{a.document_number}</div>}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[a.account_type] ?? "bg-gray-100 text-gray-600"}`}>
                          {TYPE_LABELS[a.account_type] ?? a.account_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[12px] text-gray-600">{a.address_city ? `${a.address_city}/${a.address_state}` : "—"}</td>
                      <td className="py-3 px-4 text-[12px] text-gray-600">{a.owner}</td>
                      <td className="py-3 px-4 text-[12px] text-gray-700 font-medium">{a.open_opportunities ?? 0}</td>
                      <td className="py-3 px-4"><HealthBadge score={a.health_score} /></td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${a.churn_risk === "high" ? "bg-red-50 text-red-700" : a.churn_risk === "medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {a.churn_risk === "high" ? "Alto" : a.churn_risk === "medium" ? "Médio" : "Baixo"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {confirmDelete === a.account_id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(a.account_id)}
                              className="text-[11px] font-semibold text-red-600 hover:text-red-700 px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 transition-colors">
                              Confirmar
                            </button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="text-[11px] text-gray-500 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(a.account_id)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
