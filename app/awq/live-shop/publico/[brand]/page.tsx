// ─── /awq/live-shop/publico/[brand] — Página PÚBLICA por marca ────────────────
//
// Acesso SEM login (fora do matcher NextAuth) e SEM chrome da plataforma
// (LayoutShell bare neste prefixo). Independente: nenhum link para /awq.
// Conteúdo estritamente público (lib/live-shop/public.ts — whitelist): alcance,
// grade de eventos, grade de CONTEÚDO (horário/roteiro/resultado esperado) e BI.
// NENHUM dado financeiro (GMV/MC/ROIC/fees/Net).

import { notFound } from "next/navigation";
import { Radio, Eye, Users, Sparkles, Calendar, Clock, BarChart3, ListChecks } from "lucide-react";
import { getPublicBrandPage } from "@/lib/live-shop/public";
import LiveShopPublicBI from "@/components/LiveShopPublicBI";
import LiveShopContentGrid from "@/components/LiveShopContentGrid";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

export async function generateMetadata({ params }: { params: { brand: string } }) {
  const data = await getPublicBrandPage(params.brand).catch(() => null);
  return {
    title: data ? `${data.brand.name} · AWQ Live Shop` : "AWQ Live Shop",
    description: "Live commerce do AWQ Group — agenda, conteúdo e alcance.",
  };
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 text-center">
      <div className="mb-1 flex justify-center text-pink-400">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40">
      {icon} {children}
    </h2>
  );
}

export default async function LiveShopPublicBrandPage({ params }: { params: { brand: string } }) {
  const data = await getPublicBrandPage(params.brand).catch(() => null);
  if (!data) notFound();

  const fmtInt = (n: number) => n.toLocaleString("pt-BR");
  const fmtDuration = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min}min`);
  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] via-[#0d1424] to-[#0a0e1a] text-white">
      <main className="mx-auto max-w-3xl px-6 py-16">
        {/* Branding — sem nav, sem links para a plataforma */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-pink-600/15 px-4 py-1.5 text-sm font-medium text-pink-300">
            <Radio size={14} /> AWQ Live Shop
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{data.brand.name}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/50">
            {data.brand.segment} · {data.brand.kind} — live commerce operado pelo AWQ Group
            sobre a infraestrutura de produção da Caza Vision.
          </p>
        </div>

        {/* Métricas públicas (vanity — sem dado financeiro) */}
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={<Sparkles size={18} />} value={String(data.sessionCount)} label="Lives" />
          <Stat icon={<Eye size={18} />} value={fmtInt(data.totalViews)} label="Views" />
          <Stat icon={<Users size={18} />} value={fmtInt(data.peakCcv)} label="Pico ao vivo" />
        </div>

        {/* Grade de conteúdo — horários, roteiros, resultados esperados */}
        <section className="mt-12">
          <SectionTitle icon={<ListChecks size={13} />}>Grade de conteúdo</SectionTitle>
          <LiveShopContentGrid blocks={data.contentGrid} dark />
        </section>

        {/* Grade de eventos (lives) */}
        <section className="mt-12">
          <SectionTitle icon={<Calendar size={13} />}>Grade de eventos</SectionTitle>
          {data.events.length === 0 ? (
            <p className="text-center text-sm text-white/40">Nenhuma live agendada no momento.</p>
          ) : (
            <div className="space-y-2">
              {data.events.map((e) => (
                <div key={e.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-600/20 text-pink-300">
                    <Radio size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{fmtDateTime(e.startedAt)}</p>
                    <p className="flex items-center gap-1.5 text-xs text-white/40"><Clock size={11} /> {fmtDuration(e.durationMin)}</p>
                  </div>
                  <div className="hidden gap-6 text-right sm:flex">
                    <div>
                      <p className="text-sm font-semibold text-white">{fmtInt(e.views)}</p>
                      <p className="text-[10px] uppercase tracking-wide text-white/30">views</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{fmtInt(e.peakCcv)}</p>
                      <p className="text-[10px] uppercase tracking-wide text-white/30">pico</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/50">Encerrada</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* BI — alcance & engajamento (público, sem dado financeiro) */}
        <section className="mt-12">
          <SectionTitle icon={<BarChart3 size={13} />}>BI — alcance &amp; engajamento</SectionTitle>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <LiveShopPublicBI events={data.events} />
          </div>
          <p className="mt-2 text-center text-[11px] text-white/30">
            Métricas de audiência por live. Indicadores comerciais são internos e não exibidos aqui.
          </p>
        </section>

        <footer className="mt-16 text-center text-xs text-white/30">
          © {new Date().getFullYear()} AWQ Group · Live Shop
        </footer>
      </main>
    </div>
  );
}
