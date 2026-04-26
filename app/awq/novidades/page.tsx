"use client";

import Header from "@/components/Header";
import { Sparkles, Wrench, Zap, CheckCircle2, CalendarDays, ArrowUpRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoNovidade = "feature" | "fix" | "melhoria";

interface Novidade {
  id: string;
  data: string;
  modulo: string;
  titulo: string;
  descricao: string;
  tipo: TipoNovidade;
  itens?: string[];
}

// ─── Changelog data ───────────────────────────────────────────────────────────

const NOVIDADES: Novidade[] = [
  {
    id: "ap-ar-filtros-custom",
    data: "2026-04-26",
    modulo: "AP & AR",
    titulo: "Filtro de período personalizado com calendário",
    descricao: "Substitui o botão fixo 'Próx. 30d' por um seletor de intervalo de datas livre. Clique em Personalizado para abrir dois date pickers De → Até diretamente na barra de filtros.",
    tipo: "melhoria",
    itens: [
      "Intervalo livre: selecione qualquer período de vencimento",
      "Mínimo do campo 'Até' travado pela data 'De' para evitar intervalos inválidos",
      "Rótulo do botão exibe o período ativo (ex: 01/05 → 31/05)",
      "Limpar filtros e troca de aba/BU limpam as datas automaticamente",
    ],
  },
  {
    id: "ap-ar-filtros-selecao",
    data: "2026-04-26",
    modulo: "AP & AR",
    titulo: "Filtros de seleção para busca e categorias",
    descricao: "Nova barra de filtros abaixo das abas AP/AR com busca por texto, filtro de categoria e filtro de período de vencimento.",
    tipo: "feature",
    itens: [
      "Busca por descrição ou contraparte em tempo real",
      "Filtro de categoria específico para AP (Fornecedor, Imposto...) e AR (Cliente, Reembolso...)",
      "Filtros rápidos: Todos · Vencidos · Este mês · Personalizado",
      "Badge da aba ativa espelha exatamente o que a tabela exibe",
      "Filtros resetam automaticamente ao trocar aba ou BU",
    ],
  },
  {
    id: "ap-ar-filtros-bugs",
    data: "2026-04-26",
    modulo: "AP & AR",
    titulo: "Correções pós-análise dos filtros",
    descricao: "Análise criteriosa identificou e corrigiu bugs nos filtros de seleção antes do deploy em produção.",
    tipo: "fix",
    itens: [
      "Badge da aba ativa inconsistente com contagem da tabela quando filtro de período ativo",
      "Filtros não resetavam ao trocar Business Unit",
      "Race condition no useEffect de reset: substituído por handlers atômicos com React 18 batching",
      "Adicionados aria-label, aria-pressed e role=group nos controles de filtro",
    ],
  },
  {
    id: "ap-ar-edit-modal",
    data: "2026-04-26",
    modulo: "AP & AR",
    titulo: "Modal de edição por linha",
    descricao: "Botão de lápis em cada linha (em aberto e liquidados) abre modal preenchido com todos os campos para edição inline.",
    tipo: "feature",
    itens: [
      "Edição de descrição, contraparte, valor, vencimento, categoria e BU",
      "Status recomputado automaticamente a partir da nova data de vencimento",
      "Persistência imediata em localStorage",
    ],
  },
  {
    id: "tarefas-kanban",
    data: "2026-04-26",
    modulo: "JACQES CRM",
    titulo: "Visualização Kanban no módulo Tarefas",
    descricao: "Alterna entre Lista e Kanban via botão segmentado. Drag-and-drop atualiza o status da tarefa.",
    tipo: "feature",
    itens: [
      "5 colunas: Aberta · Em Andamento · Bloqueada · Vencida · Concluída",
      "Filtro de prioridade funciona em ambas as visualizações",
      "Drag-and-drop persiste em localStorage (GitHub Pages) ou via PATCH API (SSR)",
      "10 tarefas de seed para GitHub Pages",
    ],
  },
  {
    id: "ap-ar-bu-segmentation",
    data: "2026-04-26",
    modulo: "AP & AR",
    titulo: "Segmentação por Business Unit",
    descricao: "Barra de filtro BU e breakdown consolidado para visualizar AP/AR por holding, JACQES, Caza Vision, Venture ou Advisor.",
    tipo: "feature",
    itens: [
      "Barra de filtro: Consolidado + botões por BU com cores distintas",
      "Strip de breakdown mostra AP e AR totais por BU",
      "Badge BU em cada linha da tabela",
      "Seletor de BU no formulário de cadastro",
    ],
  },
  {
    id: "conciliacao-hub",
    data: "2026-04-25",
    modulo: "Tesouraria",
    titulo: "Hub de Conciliação bancária unificado",
    descricao: "Importação de CSV/PDF diretamente na tela de Conciliação, com tabela de revisão manual e mapeamento de categorias gerenciais.",
    tipo: "feature",
    itens: [
      "Import de extratos CSV e PDF (Bradesco, Cora, Inter)",
      "Tabela de reconciliação com edição inline de categoria",
      "Persistência de overrides em localStorage",
    ],
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoNovidade, { label: string; color: string; bg: string; icon: typeof Sparkles }> = {
  feature: { label: "Novo recurso", color: "text-blue-700",    bg: "bg-blue-50",    icon: Sparkles    },
  melhoria:{ label: "Melhoria",     color: "text-purple-700",  bg: "bg-purple-50",  icon: Zap         },
  fix:     { label: "Correção",     color: "text-emerald-700", bg: "bg-emerald-50", icon: Wrench      },
};

function fmtData(s: string) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NovidadesPage() {
  // Group by date
  const byDate = NOVIDADES.reduce<Record<string, Novidade[]>>((acc, n) => {
    (acc[n.data] ??= []).push(n);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <Header
        title="Novidades"
        subtitle="Histórico de atualizações, melhorias e correções da plataforma"
      />
      <div className="px-8 py-6 max-w-3xl">

        {/* ── Stat strip ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 mb-8">
          {(["feature", "melhoria", "fix"] as TipoNovidade[]).map((tipo) => {
            const cfg = TIPO_CONFIG[tipo];
            const Icon = cfg.icon;
            const count = NOVIDADES.filter((n) => n.tipo === tipo).length;
            return (
              <div key={tipo} className={`flex items-center gap-2 px-4 py-2 rounded-xl ${cfg.bg}`}>
                <Icon size={14} className={cfg.color} />
                <span className={`text-xs font-bold ${cfg.color}`}>{count} {cfg.label}{count !== 1 ? "s" : ""}</span>
              </div>
            );
          })}
        </div>

        {/* ── Timeline ─────────────────────────────────────────────────────── */}
        <div className="space-y-8">
          {dates.map((date) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  {fmtData(date)}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Cards */}
              <div className="space-y-3 pl-5 border-l-2 border-gray-100">
                {byDate[date].map((n) => {
                  const cfg = TIPO_CONFIG[n.tipo];
                  const Icon = cfg.icon;
                  return (
                    <div key={n.id} className="card p-5 relative">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[25px] top-5 w-3 h-3 rounded-full border-2 border-white ${
                        n.tipo === "feature" ? "bg-blue-400" :
                        n.tipo === "melhoria" ? "bg-purple-400" : "bg-emerald-400"
                      }`} />

                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon size={14} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              {n.modulo}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-gray-900 mb-1">{n.titulo}</div>
                          <div className="text-xs text-gray-500 leading-relaxed">{n.descricao}</div>
                          {n.itens && n.itens.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {n.itens.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-500">
                                  <CheckCircle2 size={11} className="text-gray-300 shrink-0 mt-0.5" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="mt-10 pt-6 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
          <ArrowUpRight size={12} />
          Sugestões de melhoria? Registre em <span className="font-semibold text-gray-500">Controladoria → Dados & Infra</span>
        </div>

      </div>
    </>
  );
}
