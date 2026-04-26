// ─── Contraparte — tipos canônicos ────────────────────────────────────────────
// Cadastro mestre de clientes e fornecedores.
// Usado por AP/AR (FK), conciliação e KPIs de tesouraria.

import type { BU } from "./bu-config";

export type ContraprteTipo    = "pj" | "pf" | "mei" | "estrangeiro";
export type ContraprtePapel   = "cliente" | "fornecedor" | "ambos";
export type ContraparteRegime = "simples" | "presumido" | "real" | "mei" | "isento" | "estrangeiro";
export type ContraparteStatus = "ativo" | "inativo" | "bloqueado";

export interface Contraparte {
  id:             string;
  tipo:           ContraprteTipo;
  papel:          ContraprtePapel;
  razaoSocial:    string;
  nomeFantasia?:  string;
  cnpjCpf:        string;          // digits only
  ie?:            string;          // Inscrição Estadual
  im?:            string;          // Inscrição Municipal
  regime:         ContraparteRegime;
  emailFinanceiro?: string;
  telefone?:      string;
  cep?:           string;
  logradouro?:    string;
  numero?:        string;
  complemento?:   string;
  bairro?:        string;
  cidade?:        string;
  uf?:            string;
  banco?:         string;
  agencia?:       string;
  conta?:         string;
  pix?:           string;
  bu:             BU;
  status:         ContraparteStatus;
  observacoes?:   string;
  createdAt:      string;          // ISO-8601
  updatedAt:      string;
  deletedAt?:     string;          // soft delete
}

// ─── Labels and configs ───────────────────────────────────────────────────────

export const TIPO_CONFIG: Record<ContraprteTipo, { label: string; color: string; bg: string }> = {
  pj:          { label: "PJ",          color: "text-blue-700",    bg: "bg-blue-50"    },
  pf:          { label: "PF",          color: "text-violet-700",  bg: "bg-violet-50"  },
  mei:         { label: "MEI",         color: "text-amber-700",   bg: "bg-amber-50"   },
  estrangeiro: { label: "Estrangeiro", color: "text-gray-700",    bg: "bg-gray-100"   },
};

export const PAPEL_CONFIG: Record<ContraprtePapel, { label: string; color: string; bg: string }> = {
  cliente:     { label: "Cliente",     color: "text-emerald-700", bg: "bg-emerald-50" },
  fornecedor:  { label: "Fornecedor",  color: "text-red-700",     bg: "bg-red-50"     },
  ambos:       { label: "Ambos",       color: "text-brand-700",   bg: "bg-brand-50"   },
};

export const REGIME_LABELS: Record<ContraparteRegime, string> = {
  simples:     "Simples Nacional",
  presumido:   "Lucro Presumido",
  real:        "Lucro Real",
  mei:         "MEI",
  isento:      "Isento / Imune",
  estrangeiro: "Estrangeiro",
};

export const STATUS_CONFIG: Record<ContraparteStatus, { label: string; color: string; bg: string }> = {
  ativo:     { label: "Ativo",     color: "text-emerald-700", bg: "bg-emerald-50" },
  inativo:   { label: "Inativo",   color: "text-gray-600",    bg: "bg-gray-100"   },
  bloqueado: { label: "Bloqueado", color: "text-red-700",     bg: "bg-red-50"     },
};

export const UF_LIST = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];
