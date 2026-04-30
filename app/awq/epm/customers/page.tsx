"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { Plus, X, Search, Users } from "lucide-react";

interface EpmCustomer {
  id:         string;
  name:       string;
  doc?:       string;
  email?:     string;
  phone?:     string;
  address?:   string;
  notes?:     string;
  is_active:  boolean;
  created_at: string;
}

export default function CustomersPage() {
  const [items,      setItems]      = useState<EpmCustomer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [search,     setSearch]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name:    "",
    doc:     "",
    email:   "",
    phone:   "",
    address: "",
    notes:   "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/epm/customers");
      const json = await res.json() as { success: boolean; data: EpmCustomer[] };
      if (json.success) setItems(json.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/epm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:    form.name,
          doc:     form.doc     || undefined,
          email:   form.email   || undefined,
          phone:   form.phone   || undefined,
          address: form.address || undefined,
          notes:   form.notes   || undefined,
        }),
      });
      const json = await res.json() as { success: boolean };
      if (json.success) {
        setShowForm(false);
        setForm({ name: "", doc: "", email: "", phone: "", address: "", notes: "" });
        await loadData();
      }
    } finally { setSubmitting(false); }
  }

  const filtered = items.filter((i) =>
    search === "" ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.doc ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header
        title="Cadastro de Clientes"
        subtitle={`EPM · AWQ Group · ${items.length} clientes cadastrados`}
      />
      <div className="page-container">

        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nome ou CNPJ/CPF…"
              className="flex-1 text-xs py-2 border-b border-gray-200 focus:outline-none focus:border-brand-500 bg-transparent"
            />
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancelar" : "Novo Cliente"}
          </button>
        </div>

        {/* ── Add form ────────────────────────────────────────────────── */}
        {showForm && (
          <form onSubmit={handleAdd} className="card p-5 border-2 border-brand-200 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Novo Cliente</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Nome / Razão Social *</label>
                <input required type="text" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nome do cliente"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">CNPJ / CPF</label>
                <input type="text" value={form.doc}
                  onChange={(e) => setForm((f) => ({ ...f, doc: e.target.value }))}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">E-mail</label>
                <input type="email" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="contato@cliente.com"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Telefone</label>
                <input type="text" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-gray-600 mb-1">Endereço</label>
                <input type="text" value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Rua, número, cidade — estado"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-gray-600 mb-1">Observações</label>
                <input type="text" value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notas internas…"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors">
              {submitting ? "Salvando…" : "Cadastrar Cliente"}
            </button>
          </form>
        )}

        {/* ── List ────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="card p-12 text-center text-sm text-gray-400">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 flex flex-col items-center gap-3 text-center">
            <Users size={32} className="text-gray-200" />
            <div className="text-sm text-gray-400">
              {items.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum resultado"}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">Nome</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">CNPJ / CPF</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">E-mail</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">Telefone</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">Endereço</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-gray-800">{item.name}</div>
                        {item.notes && <div className="text-[10px] text-gray-400 truncate max-w-[160px]">{item.notes}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 tabular-nums">{item.doc ?? "—"}</td>
                      <td className="py-2.5 px-3 text-gray-500">{item.email ?? "—"}</td>
                      <td className="py-2.5 px-3 text-gray-500">{item.phone ?? "—"}</td>
                      <td className="py-2.5 px-3 text-gray-500 max-w-[200px] truncate">{item.address ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm/ar" className="text-brand-600 hover:underline">← Contas a Receber</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/suppliers" className="text-brand-600 hover:underline">Fornecedores →</Link>
        </div>

      </div>
    </>
  );
}
