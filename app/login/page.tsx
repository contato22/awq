"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role;

    const homeByRole: Record<string, string> = {
      owner: "/awq",
      admin: "/awq",
      analyst: "/jacqes",
      "cs-ops": "/csops",
    };

    router.push(homeByRole[role] ?? "/awq");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center shadow-elevated mb-4">
            <Zap size={24} className="text-awq-gold" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">AWQ Group</h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">Plataforma Central · Acesso Restrito</p>
        </div>

        {/* Card */}
        <div className="card-elevated p-8">
          <h2 className="text-base font-bold text-slate-800 mb-6">Entrar na plataforma</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-slate-800 placeholder:text-gray-500 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm text-slate-800 placeholder:text-gray-500 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                <AlertCircle size={13} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" />Entrando...</>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-gray-500 mt-6 font-medium">
          AWQ Group · Plataforma de Business Intelligence · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
