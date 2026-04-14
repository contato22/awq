// ─── Advisor — Seed de clientes (fonte estática) ──────────────────────────────
//
// Este arquivo é a fonte autoritativa para o export estático (GitHub Pages).
// Para adicionar ou editar clientes no static build, edite este array.
// O arquivo public/data/advisor-clients.json é mantido em sincronia (SSR fallback).

export interface AdvisorClientSeed {
  id:            string;
  name:          string;
  segmento:      string;
  tipo_servico:  string;
  aum:           number;
  fee_mensal:    number;
  status:        string;
  since:         string;
  responsavel:   string;
  contato_email: string;
  contato_phone: string;
  nps:           number | null;
}

export const advisorClients: AdvisorClientSeed[] = [
  {
    id:            "ADV-AVVA-001",
    name:          "AVVA",
    segmento:      "",
    tipo_servico:  "Consultoria Estratégica",
    aum:           0,
    fee_mensal:    0,
    status:        "Ativo",
    since:         "2026-04-14",
    responsavel:   "",
    contato_email: "",
    contato_phone: "",
    nps:           null,
  },
];
