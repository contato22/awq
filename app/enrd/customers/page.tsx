// ─── /enrd/customers — Clientes ENRD (espelho do portal gestão) ──────────────
// Lê os clientes do app de montagem (enrd_montagem_cliente) já espelhados no
// banco da AWQ, cruzando com installations (cliente_id) para # de instalações.
// SSR tolerante a falha — monta vazio com banner se o espelho não existe ainda.

import Header from "@/components/Header";
import Link from "next/link";
import { getMontagemClientes, getInstallations } from "@/lib/enrd-montagem-db";
import { getLiveMontagem } from "@/lib/enrd-montagem-live";
import { Users, Phone, MapPin, Wrench, ArrowUpRight, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const n = (v: number) => v.toLocaleString("pt-BR");

export default async function EnrdCustomersPage() {
  let clientes: Awaited<ReturnType<typeof getMontagemClientes>> = [];
  let installations: Awaited<ReturnType<typeof getInstallations>> = [];
  let loadError: string | null = null;
  try {
    const snap = await getLiveMontagem(); // tempo real
    if (snap) {
      clientes = snap.clientes;
      installations = snap.installations;
    } else {
      [clientes, installations] = await Promise.all([getMontagemClientes(), getInstallations()]);
    }
  } catch (e) {
    try {
      [clientes, installations] = await Promise.all([getMontagemClientes(), getInstallations()]);
    } catch {
      loadError = e instanceof Error ? e.message : String(e);
    }
  }

  // # instalações por cliente
  const instPorCliente = new Map<string, number>();
  for (const i of installations) {
    if (!i.cliente_id) continue;
    instPorCliente.set(i.cliente_id, (instPorCliente.get(i.cliente_id) ?? 0) + 1);
  }

  const comInstalacao = clientes.filter((c) => (instPorCliente.get(c.id) ?? 0) > 0).length;
  const comTelefone = clientes.filter((c) => c.telefone).length;
  const comEndereco = clientes.filter((c) => c.endereco).length;
  const empty = clientes.length === 0;

  const kpis = [
    { label: "Clientes", value: n(clientes.length), icon: Users },
    { label: "Com instalação", value: n(comInstalacao), icon: Wrench },
    { label: "Com telefone", value: n(comTelefone), icon: Phone },
    { label: "Com endereço", value: n(comEndereco), icon: MapPin },
  ];

  // ordena por # instalações desc, depois nome
  const ordenados = [...clientes].sort((a, b) => {
    const d = (instPorCliente.get(b.id) ?? 0) - (instPorCliente.get(a.id) ?? 0);
    return d !== 0 ? d : (a.nome ?? "").localeCompare(b.nome ?? "");
  });

  return (
    <>
      <Header title="Clientes — ENRD" subtitle="Agência Solar · AWQ Group" />
      <div className="page-container">

        {loadError && (
          <div className="card p-4 border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {loadError}
          </div>
        )}

        {empty && !loadError && (
          <div className="card p-4 border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            Nenhum cliente no espelho. Rode a migração 006 e sincronize em{" "}
            <Link href="/enrd/montagem" className="underline font-medium">Controle de Montagem</Link>.
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <kpi.icon size={16} className="text-orange-700" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users size={14} className="text-orange-600" />
              Clientes ENRD ({n(clientes.length)})
            </h2>
            <Link
              href="/enrd/montagem"
              className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1 font-medium"
            >
              Ver montagem <ArrowUpRight size={12} />
            </Link>
          </div>

          {empty ? (
            <div className="py-8 text-center text-sm text-gray-400">Nenhum cliente sincronizado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b">
                    <th className="py-2 pr-3 font-medium">Cliente</th>
                    <th className="py-2 px-3 font-medium">Telefone</th>
                    <th className="py-2 px-3 font-medium">Endereço</th>
                    <th className="py-2 pl-3 font-medium text-right">Instalações</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenados.slice(0, 200).map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-3 font-medium text-gray-900">{c.nome || "—"}</td>
                      <td className="py-2 px-3 text-gray-600">{c.telefone || "—"}</td>
                      <td className="py-2 px-3 text-gray-500 max-w-xs truncate">{c.endereco || "—"}</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-gray-700">
                        {instPorCliente.get(c.id) ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ordenados.length > 200 && (
                <div className="text-xs text-gray-400 mt-3 text-center">
                  Mostrando 200 de {n(ordenados.length)} clientes.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
