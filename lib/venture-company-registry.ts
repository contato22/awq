// ─── Venture Company Registry ─────────────────────────────────────────────────
// SOURCE OF TRUTH: AWQ Venture
// ISOLAMENTO: exclusivo da AWQ Venture. Não importar em outras BUs.
// PAPEL: registro individual de empresas com relacionamento ativo com a AWQ Venture.
//
// DISCIPLINA:
//   - Cada empresa é uma entidade própria, não um dado agregado.
//   - Campos financeiros obrigatoriamente têm *Quality correspondente.
//   - "real" → confirmado com evidência documental.
//   - "sem_dado" → não exibir como fato.
//   - Não misturar empresas entre si.
//   - Não confundir contrato ativo com pipeline ou investimento patrimonial.

import { ventureContracts } from "./awq-derived-metrics";

export type CompanyRelationshipType =
  | "advisory"            // AWQ presta advisory
  | "investimento"        // AWQ como investidor
  | "m4e"                 // Management for Equity
  | "fee_upside"          // fee + participação contingente
  | "parceria"            // parceria estratégica
  | "prospecto"           // em prospecção, sem contrato
  | "descartado";         // descartado do pipeline

export type CompanyStatus =
  | "ativo"               // relacionamento ativo e em execução
  | "prospectando"        // em prospecção
  | "em_negociacao"       // negociando termos
  | "encerrado"           // encerrado
  | "em_diligencia";      // under due diligence

export interface VentureCompanyContact {
  name:  string;
  role:  string;
  email: string | null;
  phone: string | null;
}

export interface VentureCompanyFinancials {
  monthlyFee:        number | null;
  monthlyFeeSource:  "real" | "estimado" | "sem_dado";
  arr:               number | null;
  arrSource:         "real" | "estimado" | "sem_dado";
  contractValue:     number | null;
  contractSource:    "real" | "estimado" | "sem_dado";
  equityPct:         number | null;
  equitySource:      "real" | "estimado" | "sem_dado";
}

export interface VentureCompany {
  id:               string;
  name:             string;
  sector:           string;
  location:         string;
  status:           CompanyStatus;
  relationshipType: CompanyRelationshipType;
  financials:       VentureCompanyFinancials;
  contacts:         VentureCompanyContact[];
  contractRef:      string | null;   // ref a VentureContract.counterparty
  commercialRef:    string | null;   // ref a CommercialOpportunity.id
  dealRef:          string | null;   // ref a DealWorkspace.id
  notes:            string;
  since:            string | null;   // data de início do relacionamento
  lastActivity:     string;
}

// ─── Registro de Empresas ─────────────────────────────────────────────────────
// Apenas empresas com relacionamento real, confirmado ou em andamento.
// Não criar entradas para empresas sem base factual.

const enerdy = ventureContracts[0]; // único contrato confirmado

export const ventureCompanies: VentureCompany[] = [
  // ── ENERDY ────────────────────────────────────────────────────────────────
  // Único relacionamento comercial ativo e confirmado da AWQ Venture.
  // Fonte dos dados financeiros: contrato fornecido pelo usuário.
  {
    id:               "VC001",
    name:             "ENERDY",
    sector:           "Energia",
    location:         "Brasil",
    status:           "ativo",
    relationshipType: "advisory",
    financials: {
      monthlyFee:       enerdy.monthlyFee,
      monthlyFeeSource: "real",
      arr:              enerdy.arr,
      arrSource:        "real",
      contractValue:    enerdy.totalContractValue,
      contractSource:   "real",
      equityPct:        null,
      equitySource:     "sem_dado",
    },
    contacts: [
      // Contato a ser preenchido quando fornecido pelo usuário
      { name: "— a confirmar —", role: "— a confirmar —", email: null, phone: null },
    ],
    contractRef:   "ENERDY",   // ventureContracts[0].counterparty
    commercialRef: "C001",     // commercialOpportunities[0].id
    dealRef:       null,
    notes:
      "Contrato de advisory/incubação. Fee mensal R$2.000, prazo 36 meses, valor total R$72.000. " +
      enerdy.note,
    since:        null, // data de início não confirmada
    lastActivity: "2026-04-08",
  },
];

// ─── Query helpers ────────────────────────────────────────────────────────────

export function getActiveVentureCompanies(): VentureCompany[] {
  return ventureCompanies.filter((c) => c.status === "ativo");
}

export function getVentureCompanyById(id: string): VentureCompany | null {
  return ventureCompanies.find((c) => c.id === id) ?? null;
}

export function getVentureCompanyByName(name: string): VentureCompany | null {
  return ventureCompanies.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  ) ?? null;
}
