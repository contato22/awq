// Shared RFM types — used by both API route and client page

export type RfmSegment =
  | "Campeões"
  | "Clientes Fiéis"
  | "Fiéis em Potencial"
  | "Novos Clientes"
  | "Clientes Promissores"
  | "Precisam de Atenção"
  | "Quase Dormentes"
  | "Não Pode Perder"
  | "Em Risco"
  | "Hibernando"
  | "Perdidos";

export type RfmCustomer = {
  account_id: string;
  account_name: string;
  industry: string | null;
  owner: string;
  bu: string;
  recency_days: number;
  frequency: number;
  monetary: number;
  r_score: number;
  f_score: number;
  m_score: number;
  rfm_score: number;
  segment: RfmSegment;
  segment_color: string;
  segment_bg: string;
};

export type RfmResponse = {
  customers: RfmCustomer[];
  segments: Record<RfmSegment, { count: number; color: string; bg: string }>;
  totals: { customers: number; monetary: number; avgMonetary: number };
};
