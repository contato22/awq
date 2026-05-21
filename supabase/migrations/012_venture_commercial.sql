-- ─── Venture Commercial Opportunities — Supabase table ───────────────────────
-- Persiste o pipeline comercial da AWQ Venture (advisory, M4E, fee recorrente).
-- A coluna `data` guarda o CommercialOpportunity completo como JSONB,
-- evitando dezenas de colunas para campos opcionais aninhados.
-- Idempotente — seguro rodar múltiplas vezes.

CREATE TABLE IF NOT EXISTS venture_commercial_opportunities (
  id          TEXT        PRIMARY KEY,
  company     TEXT        NOT NULL,
  stage       TEXT        NOT NULL,
  deal_type   TEXT        NOT NULL,
  priority    TEXT        NOT NULL DEFAULT 'Média',
  probability INTEGER     NOT NULL DEFAULT 50,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vco_stage    ON venture_commercial_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_vco_priority ON venture_commercial_opportunities(priority);

-- ─── Seed ────────────────────────────────────────────────────────────────────

INSERT INTO venture_commercial_opportunities (id, company, stage, deal_type, priority, probability, data)
VALUES
  (
    'C001', 'ENERDY', 'Fee Recorrente', 'Operação Recorrente', 'Alta', 100,
    '{
      "id": "C001",
      "company": "ENERDY",
      "sector": "Energia / Advisory",
      "origin": "Contrato direto",
      "dealType": "Operação Recorrente",
      "stage": "Fee Recorrente",
      "economics": {
        "monthlyFee": 2000,
        "monthlyFeeQuality": "real",
        "arr": 24000,
        "arrQuality": "real",
        "contractValue": 72000,
        "contractValueQuality": "real",
        "upsidePct": null,
        "upsideType": null,
        "upsideQuality": "sem_dado",
        "estimatedPatrimonialValue": null,
        "estimatedPatrimonialValueQuality": "sem_dado"
      },
      "probability": 100,
      "priority": "Alta",
      "responsible": "AWQ Venture",
      "nextAction": "Confirmar data de início do contrato e agendar reunião de alinhamento estratégico",
      "lastUpdated": "2026-04-08",
      "internalNotes": "Fee recorrente de advisory/incubação. Confirmed by user. Único contrato operacional confirmado da Venture.",
      "dealRef": null,
      "confirmation": {
        "opportunityId": "C001",
        "proposalId": "PROP-C001-v1",
        "status": "confirmado",
        "clientName": "ENERDY",
        "confirmedAt": "2026-04-08",
        "interactions": [],
        "pipelineEntryDate": "2026-04-08",
        "baseEntryDate": "2026-04-08"
      },
      "proposal": {
        "proposalId": "PROP-C001-v1",
        "version": 1,
        "status": "Aprovado",
        "clientVisible": true,
        "title": "Proposta de Advisory — AWQ Venture × ENERDY",
        "executiveSummary": "Contratação da AWQ Venture como advisor estratégico e parceiro de incubação operacional do Grupo ENERDY, com fee mensal de R$2.000 pelo período de 36 meses, totalizando R$72.000 em valor contratual bruto.",
        "context": "O Grupo ENERDY identificou a necessidade de estruturação de sua governança operacional, desenvolvimento da frente comercial e acesso qualificado à rede de parceiros estratégicos da AWQ Venture para acelerar sua curva de crescimento e posicionamento no mercado.",
        "diagnosis": "Empresa com potencial operacional relevante no setor de energia, necessitando de suporte estruturado em: (i) organização de processos internos, (ii) desenvolvimento e qualificação do pipeline comercial, (iii) acesso a rede de parceiros e clientes estratégicos, e (iv) acompanhamento executivo contínuo com foco em geração de resultado.",
        "operationStructure": "Fee mensal fixo de advisory e incubação operacional. A AWQ Venture presta suporte estratégico contínuo, incluindo acompanhamento executivo mensal, acesso à rede de parceiros, suporte em estruturação de processos e desenvolvimento comercial.",
        "economicProposal": "Fee mensal: R$2.000,00. Prazo contratual: 36 meses. Valor total do contrato: R$72.000,00 (bruto). Forma de pagamento: mensalidade recorrente.",
        "monthlyFee": 2000,
        "feeQuality": "real",
        "contractDuration": "36 meses",
        "upsideDescription": "Não há participação patrimonial, equity ou revenue share previsto nesta estrutura contratual. O fee mensal é a única remuneração da AWQ Venture neste contrato.",
        "premises": [
          "Fee mensal pago pontualmente, conforme calendário contratual",
          "Acesso a informações operacionais para adequado suporte ao negócio",
          "Reuniões mensais de acompanhamento executivo com time do ENERDY",
          "Engajamento ativo da liderança do ENERDY nas sessões de advisory"
        ],
        "risks": [
          "Risco de não renovação ao término do prazo de 36 meses",
          "Data de início do contrato ainda não confirmada — impacta projeção de receita",
          "Dependência da qualidade do engajamento do cliente para geração de resultado"
        ],
        "advanceCriteria": [
          "Confirmação formal da data de início do contrato",
          "Recebimento do primeiro pagamento mensal",
          "Realização da reunião de kick-off estratégico"
        ],
        "governance": "Contrato bilateral AWQ Venture — ENERDY. Revisão de escopo e entregáveis recomendada anualmente. Qualquer alteração de estrutura ou fee requer aditivo contratual formal.",
        "schedule": [
          {"phase": "Formalização",        "description": "Confirmação de data de início e primeiro pagamento",           "targetDate": "a confirmar"},
          {"phase": "Kick-off Estratégico","description": "Reunião de alinhamento de objetivos, KPIs e plano de 90 dias","targetDate": "após confirmação de início"},
          {"phase": "Ciclo Mensal",        "description": "Reuniões mensais de acompanhamento executivo",                 "targetDate": "recorrente — 36 meses"},
          {"phase": "Revisão Anual",       "description": "Revisão de escopo, entregáveis e metas",                      "targetDate": "anual"}
        ],
        "nextSteps": [
          "Confirmar data de início do contrato com o ENERDY",
          "Agendar reunião de kick-off estratégico",
          "Estruturar plano de 90 dias de advisory com entregáveis claros",
          "Definir KPIs de acompanhamento para o período"
        ],
        "observations": "Este é o único contrato operacional ativo e confirmado da AWQ Venture. O dado de receita mensal (R$2.000) é considerado REAL com base em evidência de contrato fornecida.",
        "createdAt": "2026-04-08",
        "updatedAt": "2026-04-08",
        "sentAt": null
      }
    }'::jsonb
  ),
  (
    'C002', '— A definir —', 'Oportunidade', 'Participação/M4E', 'Média', 0,
    '{"id":"C002","company":"— A definir —","sector":"— A definir —","origin":"— A definir —","dealType":"Participação/M4E","stage":"Oportunidade","economics":{"monthlyFee":null,"monthlyFeeQuality":"sem_dado","arr":null,"arrQuality":"sem_dado","contractValue":null,"contractValueQuality":"sem_dado","upsidePct":null,"upsideType":null,"upsideQuality":"sem_dado","estimatedPatrimonialValue":null,"estimatedPatrimonialValueQuality":"sem_dado"},"probability":0,"priority":"Média","responsible":"AWQ Venture","nextAction":"Identificar empresa-alvo para proposta de Management for Equity","lastUpdated":"2026-04-08","internalNotes":"Slot reservado para próxima oportunidade M4E.","dealRef":null,"confirmation":null,"proposal":null}'::jsonb
  ),
  (
    'C003', '— A definir —', 'Oportunidade', 'Fee + Upside', 'Média', 0,
    '{"id":"C003","company":"— A definir —","sector":"— A definir —","origin":"— A definir —","dealType":"Fee + Upside","stage":"Oportunidade","economics":{"monthlyFee":null,"monthlyFeeQuality":"sem_dado","arr":null,"arrQuality":"sem_dado","contractValue":null,"contractValueQuality":"sem_dado","upsidePct":null,"upsideType":null,"upsideQuality":"sem_dado","estimatedPatrimonialValue":null,"estimatedPatrimonialValueQuality":"sem_dado"},"probability":0,"priority":"Média","responsible":"AWQ Venture","nextAction":"Identificar empresa-alvo para proposta de Fee + Upside","lastUpdated":"2026-04-08","internalNotes":"Slot reservado para próxima oportunidade Fee+Upside.","dealRef":null,"confirmation":null,"proposal":null}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
