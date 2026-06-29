// ─── /awq/live-shop/marcas — Marcas (clientes-marca da BU Live Shop) ──────────
// Lista as marcas que a BU opera. Bless Rio é o piloto (§2). É aqui que o
// "cliente #2" do gate §9 é cadastrado. SSR com try/catch (regra CLAUDE.md).

import Link from "next/link";
import Header from "@/components/Header";
import { ShoppingCart, ArrowLeft, AlertTriangle, Star, Tag, Calendar } from "lucide-react";
import {
  getBrands, BRAND_KIND_LABEL, BRAND_STATUS_LABEL, type Brand,
} from "@/lib/live-shop/brands";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  piloto: "bg-amber-100 text-amber-700",
  ativo: "bg-emerald-100 text-emerald-700",
  prospect: "bg-blue-100 text-blue-700",
  pausado: "bg-gray-100 text-gray-600",
  arquivado: "bg-gray-100 text-gray-400",
};

function BrandCard({ b }: { b: Brand }) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-600 text-white">
            <ShoppingCart size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-semibold text-gray-900">{b.name}</p>
              {b.isPilot && <Star size={12} className="shrink-0 text-amber-500" fill="currentColor" />}
            </div>
            <p className="truncate text-xs text-gray-400">{b.segment} · {BRAND_KIND_LABEL[b.kind]}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[b.status] ?? STATUS_STYLE.prospect}`}>
          {BRAND_STATUS_LABEL[b.status]}
        </span>
      </div>
      <dl className="mt-3 space-y-1 text-xs text-gray-600">
        <div className="flex items-center gap-1.5"><Tag size={12} className="text-gray-400" /> {b.dealModel}</div>
        {b.firstLiveAt && (
          <div className="flex items-center gap-1.5"><Calendar size={12} className="text-gray-400" /> 1ª live: {new Date(b.firstLiveAt + "T00:00:00").toLocaleDateString("pt-BR")}</div>
        )}
      </dl>
      {b.notes && <p className="mt-2 text-[11px] text-gray-400">{b.notes}</p>}
    </div>
  );
}

export default async function LiveShopBrandsPage() {
  let brands: Brand[] = [];
  let loadError: string | null = null;
  try {
    brands = await getBrands();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const hasClient2 = brands.filter((b) => b.status === "ativo" || b.status === "piloto").length >= 2;

  return (
    <>
      <Header title="Live Shop · Marcas" subtitle="Clientes-marca operados pela BU" />
      <main className="px-6 lg:px-8 py-6 space-y-5">
        <Link href="/awq/live-shop" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
          <ArrowLeft size={13} /> Voltar ao cockpit
        </Link>

        {/* Sinal do gate §9 — cliente #2 */}
        <div className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${hasClient2 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
          {hasClient2 ? <Star size={13} className="shrink-0" /> : <AlertTriangle size={13} className="shrink-0" />}
          <span>
            {hasClient2
              ? "Cliente #2 presente — critério do gate §9 atendido nesta dimensão."
              : "Gate §9: falta o cliente #2 (assinar em ≤ 90 dias da 1ª live). Cadastre a próxima marca aqui."}
          </span>
        </div>

        {loadError && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            <AlertTriangle size={13} className="shrink-0" />
            <span>Erro ao ler marcas — exibindo vazio. <span className="font-mono">{loadError}</span></span>
          </div>
        )}

        {brands.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Nenhuma marca cadastrada ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {brands.map((b) => <BrandCard key={b.id} b={b} />)}
          </div>
        )}
      </main>
    </>
  );
}
