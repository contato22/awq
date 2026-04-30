"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { Users, Plus, Search, Mail, Phone, Linkedin } from "lucide-react";
import type { CrmContact } from "@/lib/crm-types";
import { SEED_CONTACTS } from "@/lib/crm-db";

const SENIORITY_LABELS: Record<string, string> = {
  c_level: "C-Level", director: "Director", manager: "Manager", ic: "Individual Contributor",
};
const SENIORITY_COLORS: Record<string, string> = {
  c_level: "bg-violet-50 text-violet-700", director: "bg-blue-50 text-blue-700",
  manager: "bg-amber-50 text-amber-700", ic: "bg-gray-100 text-gray-600",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    fetch(`/api/crm/contacts?${p}`)
      .then(r => r.json())
      .then(res => setContacts(res.success ? res.data : SEED_CONTACTS))
      .catch(() => setContacts(SEED_CONTACTS))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <>
      <Header title="Contatos — CRM AWQ" subtitle="Pessoas e decisores" />
      <div className="page-container">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Contatos", value: contacts.length },
            { label: "C-Level",        value: contacts.filter(c=>c.seniority==="c_level").length },
            { label: "Directors",      value: contacts.filter(c=>c.seniority==="director").length },
            { label: "Primários",      value: contacts.filter(c=>c.is_primary_contact).length },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <div className="text-2xl font-bold text-gray-900">{k.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Add */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contato..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400" />
          </div>
          <Link href="/crm/contacts/add"
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors">
            <Plus size={13} /> Novo Contato
          </Link>
        </div>

        {/* Table */}
        <div className="card">
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Contato","Empresa","Cargo","Senioridade","Canais","Principal"].map(h=>(
                    <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length:4}).map((_,i)=>(
                    <tr key={i} className="border-b border-gray-100">
                      {Array.from({length:6}).map((_,j)=>(
                        <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse w-20"/></td>
                      ))}
                    </tr>
                  ))
                ) : contacts.length === 0 ? (
                  <tr><td colSpan={6} className="py-0">
                    <EmptyState compact icon={<Users size={16} className="text-gray-400"/>} title="Nenhum contato encontrado"/>
                  </td></tr>
                ) : contacts.map(c=>(
                  <tr key={c.contact_id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-700 shrink-0">
                          {c.full_name.split(" ").slice(0,2).map(n=>n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">{c.full_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {c.account_id ? (
                        <Link href={`/crm/accounts/${c.account_id}`} className="text-[12px] text-brand-600 hover:underline">
                          {c.account_name ?? "—"}
                        </Link>
                      ) : <span className="text-[12px] text-gray-500">—</span>}
                    </td>
                    <td className="py-3 px-4 text-[12px] text-gray-600">{c.job_title ?? "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SENIORITY_COLORS[c.seniority] ?? "bg-gray-100 text-gray-600"}`}>
                        {SENIORITY_LABELS[c.seniority] ?? c.seniority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {c.email && <a href={`mailto:${c.email}`} title={c.email} className="text-gray-400 hover:text-blue-500 transition-colors"><Mail size={14}/></a>}
                        {c.phone && <a href={`tel:${c.phone}`} title={c.phone} className="text-gray-400 hover:text-emerald-500 transition-colors"><Phone size={14}/></a>}
                        {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-700 transition-colors"><Linkedin size={14}/></a>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {c.is_primary_contact && (
                        <span className="text-[10px] font-bold bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full">Principal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
