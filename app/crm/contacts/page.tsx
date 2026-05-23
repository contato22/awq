"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { Users, Plus, Search, Mail, Phone, Linkedin, Trash2, Check, X as XIcon } from "lucide-react";
import type { CrmContact } from "@/lib/crm-types";

const SENIORITY_LABELS: Record<string, string> = {
  c_level: "C-Level", director: "Diretor", manager: "Gerente", ic: "Analista/IC",
};
const SENIORITY_COLORS: Record<string, string> = {
  c_level: "bg-brand-50 text-brand-700", director: "bg-blue-50 text-blue-700",
  manager: "bg-amber-50 text-amber-700", ic: "bg-gray-100 text-gray-600",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const url = search ? `/api/crm/contacts?search=${encodeURIComponent(search)}` : "/api/crm/contacts";
    fetch(url)
      .then(r => r.json())
      .then(json => { setContacts((json.data ?? []) as CrmContact[]); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [search]);

  async function handleDelete(contact: CrmContact) {
    setContacts(prev => prev.filter(c => c.contact_id !== contact.contact_id));
    setDeletingId(null);
    await fetch("/api/crm/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", contact_id: contact.contact_id }),
    });
    showToast("Contato apagado", true);
  }

  return (
    <>
      <Header title="Contatos — CRM AWQ" subtitle="Pessoas e decisores" />
      <div className="page-container">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Contatos", value: contacts.length },
            { label: "C-Level",        value: contacts.filter(c=>c.seniority==="c_level").length },
            { label: "Diretores",      value: contacts.filter(c=>c.seniority==="director").length },
            { label: "Primários",      value: contacts.filter(c=>c.is_primary_contact).length },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <div className="text-2xl font-bold text-gray-900">{k.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>

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

        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {toast.msg}
          </div>
        )}

        <div className="card">
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Contato","Empresa","Cargo","Senioridade","Canais","Principal",""].map(h=>(
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length:4}).map((_,i)=>(
                    <tr key={i} className="border-b border-gray-100">
                      {Array.from({length:7}).map((_,j)=>(
                        <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse w-20"/></td>
                      ))}
                    </tr>
                  ))
                ) : contacts.length === 0 ? (
                  <tr><td colSpan={7} className="py-0">
                    <EmptyState compact icon={<Users size={16} className="text-gray-400"/>} title="Nenhum contato encontrado"/>
                  </td></tr>
                ) : contacts.map(c=>(
                  <tr key={c.contact_id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                          {c.full_name.split(" ").slice(0,2).map(n=>n[0]).join("")}
                        </div>
                        <p className="text-[13px] font-medium text-gray-900">{c.full_name}</p>
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
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SENIORITY_COLORS[c.seniority] ?? "bg-gray-100 text-gray-600"}`}>
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
                        <span className="text-xs font-bold bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full">Principal</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {deletingId === c.contact_id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-600 font-medium whitespace-nowrap">Confirmar?</span>
                          <button onClick={() => handleDelete(c)}
                            className="p-1 rounded-md bg-red-100 hover:bg-red-200 text-red-600 transition-colors">
                            <Check size={12} />
                          </button>
                          <button onClick={() => setDeletingId(null)}
                            className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                            <XIcon size={12} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingId(c.contact_id)}
                          className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
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
