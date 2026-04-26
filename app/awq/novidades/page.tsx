"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { Sparkles, Wrench, Zap, CalendarDays, Tag } from "lucide-react";

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
      "Campo 'Até' travado pela data 'De' para evitar intervalos inválidos",
      "Rótulo do botão exibe o período ativo (ex: 01/05 → 31/05)",
      "Limpar filtros e troca de aba/BU limpam as datas automaticamente",
    ],
  },
  {
    id: "ap-ar-filtros-selecao",
    data: "2026-04-26",
    modulo: "AP & AR",
    titulo: "Filtros de seleção — busca e categorias",
    descricao: "Nova barra de filtros com busca em tempo real, filtro de categoria e filtro de período de vencimento.",
    tipo: "feature",
    itens: [
      "Busca por descrição ou contraparte em tempo real",
      "Filtro de categoria contextual para AP e AR",
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
    descricao: "Análise criteriosa identificou e corrigiu bugs antes do deploy.",
    tipo: "fix",
    itens: [
      "Badge da aba inconsistente com contagem da tabela quando filtro de período ativo",
      "Filtros não resetavam ao trocar Business Unit",
      "Race condition no useEffect de reset — substituído por handlers atômicos",
      "aria-label, aria-pressed e role=group adicionados para acessibilidade",
    ],
  },
  {
    id: "ap-ar-edit-modal",
    data: "2026-04-26",
    modulo: "AP & AR",
    titulo: "Modal de edição por linha",
    descricao: "Botão de lápis em cada linha abre modal preenchido com todos os campos para edição inline.",
    tipo: "feature",
    itens: [
      "Edição de descrição, contraparte, valor, vencimento, categoria e BU",
      "Status recomputado automaticamente a partir da nova data",
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
      "Drag-and-drop persiste em localStorage ou via PATCH API (SSR)",
    ],
  },
  {
    id: "ap-ar-bu-segmentation",
    data: "2026-04-26",
    modulo: "AP & AR",
    titulo: "Segmentação por Business Unit",
    descricao: "Barra de filtro BU e breakdown consolidado para visualizar AP/AR por empresa.",
    tipo: "feature",
    itens: [
      "Consolidado + botões por BU com cores distintas",
      "Strip de breakdown com AP e AR totais por BU",
      "Badge BU em cada linha da tabela",
    ],
  },
  {
    id: "conciliacao-hub",
    data: "2026-04-25",
    modulo: "Tesouraria",
    titulo: "Hub de Conciliação bancária unificado",
    descricao: "Importação de CSV/PDF diretamente na tela de Conciliação, com tabela de revisão e mapeamento de categorias.",
    tipo: "feature",
    itens: [
      "Import de extratos CSV e PDF (Bradesco, Cora, Inter)",
      "Tabela de reconciliação com edição inline de categoria",
      "Persistência de overrides em localStorage",
    ],
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoNovidade, {
  label: string; color: string; bg: string; border: string; dot: string; icon: typeof Sparkles;
}> = {
  feature:  { label: "Novo recurso", color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-400",    dot: "bg-blue-400",    icon: Sparkles },
  melhoria: { label: "Melhoria",     color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-400",  dot: "bg-violet-400",  icon: Zap      },
  fix:      { label: "Correção",     color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-400", dot: "bg-emerald-400", icon: Wrench   },
};

const MODULO_COLOR: Record<string, { color: string; bg: string }> = {
  "AP & AR":    { color: "text-red-700",    bg: "bg-red-50"    },
  "JACQES CRM": { color: "text-blue-700",   bg: "bg-blue-50"   },
  "Tesouraria": { color: "text-cyan-700",   bg: "bg-cyan-50"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_CURTOS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

function fmtDataLonga(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return `${d} de ${MESES_CURTOS[m - 1]} ${y}`;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NovidadesPage() {
  const [tipoFilter, setTipoFilter] = useState<TipoNovidade | "all">("all");

  const filtered = tipoFilter === "all"
    ? NOVIDADES
    : NOVIDADES.filter((n) => n.tipo === tipoFilter);

  const byDate = filtered.reduce<Record<string, Novidade[]>>((acc, n) => {
    (acc[n.data] ??= []).push(n);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  const hoje  = todayISO();

  return (
    <>
      <Header
        title="Novidades"
        subtitle={`${NOVIDADES.length} atualizações · melhorias e correções da plataforma`}
      />
      <div className="px-8 py-6 max-w-2xl">

        {/* ── Filtros de tipo ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap mb-7">
          <Tag size={12} className="text-gray-400 shrink-0" />
          <button
            onClick={() => setTipoFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              tipoFilter === "all"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tudo <span className="opacity-60 ml-0.5">({NOVIDADES.length})</span>
          </button>
          {(["feature", "melhoria", "fix"] as TipoNovidade[]).map((tipo) => {
            const cfg   = TIPO_CONFIG[tipo];
            const Icon  = cfg.icon;
            const count = NOVIDADES.filter((n) => n.tipo === tipo).length;
            const ativo = tipoFilter === tipo;
            return (
              <button
                key={tipo}
                onClick={() => setTipoFilter(tipo)}
                aria-pressed={ativo}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  ativo ? `${cfg.bg} ${cfg.color} ring-1 ring-current/30` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Icon size={11} />
                {cfg.label}
                <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* ── Timeline ─────────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">
            Nenhuma atualização para este filtro.
          </div>
        ) : (
          <div className="space-y-7">
            {dates.map((date) => (
              <div key={date}>

                {/* Date header */}
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays size={12} className="text-gray-400 shrink-0" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {fmtDataLonga(date)}
                  </span>
                  {date === hoje && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-600">
                      HOJE
                    </span>
                  )}
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Cards */}
                <div className="space-y-2 ml-1">
                  {byDate[date].map((n) => {
                    const cfg    = TIPO_CONFIG[n.tipo];
                    const Icon   = cfg.icon;
                    const modCfg = MODULO_COLOR[n.modulo] ?? { color: "text-gray-600", bg: "bg-gray-100" };
                    return (
                      <div
                        key={n.id}
                        className={`card p-4 border-l-4 ${cfg.border} hover:shadow-md transition-shadow duration-150`}
                      >
                        <div className="flex items-start gap-3">

                          {/* Tipo icon */}
                          <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                            <Icon size={13} className={cfg.color} />
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${modCfg.bg} ${modCfg.color}`}>
                                {n.modulo}
                              </span>
                            </div>

                            {/* Title */}
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{n.titulo}</p>

                            {/* Description */}
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.descricao}</p>

                            {/* Detail items */}
                            {n.itens && n.itens.length > 0 && (
                              <ul className="mt-2.5 space-y-1">
                                {n.itens.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-xs text-gray-500">
                                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} opacity-60`} />
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
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <p className="mt-10 pt-5 border-t border-gray-100 text-xs text-gray-400">
          Sugestões? Registre em{" "}
          <span className="font-semibold text-gray-500">Controladoria → Dados & Infra</span>.
        </p>

      </div>
    </>
  );
}
