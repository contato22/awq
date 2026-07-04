// ─── /jacqes/settings — Configurações da área JACQES ──────────────────────────
// Espelha /settings (Plataforma), mas escopado SOMENTE à BU JACQES. Confinado:
// não expõe nem linka para configurações de outras BUs. SSR com try/catch.

import Link from "next/link";
import { getServerSession } from "next-auth";
import Header from "@/components/Header";
import { authOptions } from "@/lib/auth-options";
import { listJacqesGuests } from "@/lib/jacqes/guests";
import { isCoraJacqesConfigured } from "@/lib/cora-api";
import JacqesSettingsForm from "@/components/JacqesSettingsForm";
import JacqesGuestManager, { type JacqesGuestRow } from "@/components/JacqesGuestManager";
import { Shield, Database, ArrowLeft, Users } from "lucide-react";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

const CAN_MANAGE_ACCESS = new Set(["owner", "admin", "jacqes"]);

export default async function JacqesSettingsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const canManageAccess = CAN_MANAGE_ACCESS.has(role);

  let guests: JacqesGuestRow[] = [];
  let loadError: string | null = null;
  if (canManageAccess) {
    try {
      guests = (await listJacqesGuests()).map((g) => ({ id: g.id, email: g.email, name: g.name, status: g.status }));
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  const coraConfigured = isCoraJacqesConfigured();

  return (
    <>
      <Header title="Configurações · JACQES" subtitle="Agência · AWQ Group" />
      <div className="page-container max-w-4xl">
        <Link href="/jacqes" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800">
          <ArrowLeft size={13} /> Voltar ao JACQES
        </Link>

        <JacqesSettingsForm />

        {/* Segurança & Acesso — real, escopado a JACQES */}
        <div className="card p-5 lg:p-6">
          <div className="flex items-start gap-3.5 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
              <Shield size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Segurança &amp; Acesso</div>
              <div className="text-xs text-gray-500 mt-0.5 font-medium">Logins confinados à área JACQES — sem acesso aos demais dados da Plataforma</div>
            </div>
          </div>

          {canManageAccess ? (
            <>
              {loadError && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700">
                  Erro ao ler acessos. <span className="font-mono">{loadError}</span>
                </div>
              )}
              <JacqesGuestManager initialGuests={guests} />
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-gray-400">
              <Users size={14} /> Apenas owner/admin/JACQES podem gerir acessos.
            </p>
          )}
        </div>

        {/* Integrações — status real */}
        <div className="card p-5 lg:p-6">
          <div className="flex items-start gap-3.5 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
              <Database size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Integrações</div>
              <div className="text-xs text-gray-500 mt-0.5 font-medium">Fontes de dados conectadas à BU JACQES</div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium text-gray-900">Cora — Conta PJ JACQES</div>
                <div className="text-xs text-gray-400 font-medium">Extrato bancário via API (mTLS)</div>
              </div>
              <span className={coraConfigured ? "badge-green" : "badge-red"}>
                {coraConfigured ? "Conectado" : "Não configurado"}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium text-gray-900">CRM (JACQES)</div>
                <div className="text-xs text-gray-400 font-medium">Leads, pipeline, contas — Neon Postgres</div>
              </div>
              <span className="badge-green">Conectado</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium text-gray-900">PPM (JACQES)</div>
                <div className="text-xs text-gray-400 font-medium">Portfolio, tarefas, cronogramas</div>
              </div>
              <span className="badge-green">Conectado</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
