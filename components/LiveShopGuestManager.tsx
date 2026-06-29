"use client";

// ─── Live Shop — Gerir usuários e permissões da marca ─────────────────────────
// Cria login individual (convidado) + libera acesso à marca; lista e revoga.
// Owner/operador. Chama /api/live-shop/guests. Senhas nunca voltam do servidor.

import { useState } from "react";
import { UserPlus, Trash2, Check, Loader2, KeyRound } from "lucide-react";

export interface GuestRow {
  id: string;
  email: string;
  name: string;
  brandIds: string[];
  status: string;
}

export default function LiveShopGuestManager({
  brandId,
  brandName,
  initialGuests,
}: {
  brandId: string;
  brandName: string;
  initialGuests: GuestRow[];
}) {
  const [guests, setGuests] = useState<GuestRow[]>(initialGuests);
  const [login, setLogin] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function genPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let p = "";
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setPassword(p);
  }

  async function refresh() {
    const r = await fetch("/api/live-shop/guests");
    if (r.ok) setGuests((await r.json()).guests ?? []);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/live-shop/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, name, password, brandIds: [brandId] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Falha");
      setMsg({ kind: "ok", text: `Login criado para "${login}". Anote a senha — ela não é exibida de novo.` });
      setLogin(""); setName(""); setPassword("");
      await refresh();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Falha" });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revogar o acesso deste usuário?")) return;
    const r = await fetch(`/api/live-shop/guests?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) await refresh();
  }

  const forBrand = guests.filter((g) => g.brandIds.includes(brandId));

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="grid gap-2 sm:grid-cols-2">
        <input value={login} onChange={(e) => setLogin(e.target.value)} type="text" placeholder="Usuário (login)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
        <input value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="Nome (opcional)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <div className="flex gap-2 sm:col-span-2">
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha (≥ 8)"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" minLength={8} required />
          <button type="button" onClick={genPassword}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <KeyRound size={14} /> Gerar
          </button>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-3 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Criar login + liberar acesso a {brandName}
          </button>
        </div>
      </form>

      {msg && (
        <div className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs ${msg.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg.kind === "ok" && <Check size={13} />} {msg.text}
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Acessos liberados ({forBrand.length})</p>
        {forBrand.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum usuário com acesso a esta marca ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200/80">
            {forBrand.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{g.name}</p>
                  <p className="truncate text-xs text-gray-400">{g.email}{g.status !== "active" && " · revogado"}</p>
                </div>
                {g.status === "active" && (
                  <button onClick={() => revoke(g.id)} title="Revogar acesso"
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                    <Trash2 size={13} /> Revogar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
