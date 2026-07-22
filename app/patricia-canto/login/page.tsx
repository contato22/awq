"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PatriciaCantoLogo from "@/components/patricia-canto/PatriciaCantoLogo";

export default function PatriciaCantoLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/patricia-canto/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Falha no login");
        return;
      }
      router.replace("/patricia-canto");
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canto-900 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <PatriciaCantoLogo className="h-14 w-14" shieldColor="#847455" markColor="#FFFFFF" />
          <h1 className="font-canto-serif mt-3 text-xl font-semibold text-canto-900">Patrícia Canto</h1>
          <p className="text-[11px] font-medium tracking-[0.25em] text-canto-500">ADVOGADA</p>
          <p className="mt-3 text-xs text-canto-500">CRM — acesso restrito</p>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block text-xs text-canto-500">
            Usuário
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-3 py-2 text-sm outline-none focus:border-canto-500"
            />
          </label>
          <label className="block text-xs text-canto-500">
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-3 py-2 text-sm outline-none focus:border-canto-500"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !username || !password}
          className="mt-5 w-full rounded-lg bg-canto-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-canto-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
