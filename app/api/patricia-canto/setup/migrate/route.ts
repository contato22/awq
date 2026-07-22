// GET /api/patricia-canto/setup/migrate
// Retorna o SQL que cria as tabelas do CRM da Patrícia Canto no Supabase ERP
// (kkhxxsrgsewjfvnnssyf) — mesmo projeto do resto do AWQ, tabelas novas e
// isoladas. Rodar uma vez no SQL Editor. Requer sessão válida (admin/master).
import { NextRequest, NextResponse } from "next/server";
import { PC_SESSION_COOKIE, verifySessionToken } from "@/lib/patricia-canto/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_SQL = `-- CRM Patricia Canto — tabelas novas e isoladas (projeto ERP kkhxxsrgsewjfvnnssyf)
-- Rodar uma vez no Supabase SQL Editor. Seguro rodar de novo (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS patricia_canto_leads (
  id                      TEXT PRIMARY KEY,
  tipo_processo           TEXT NOT NULL,
  nome_cliente            TEXT NOT NULL,
  telefone                TEXT NOT NULL DEFAULT '',
  escritorio              TEXT,
  stage                   TEXT NOT NULL DEFAULT 'novo',
  valor_acao              NUMERIC,
  honorarios              NUMERIC,
  data_fechamento         TEXT,
  perc_chances            NUMERIC,
  status                  TEXT,
  motivo_perda            TEXT,
  prioridade              TEXT,
  origem                  TEXT,
  indicado_por            TEXT,
  descricao               TEXT,
  data_entrada            TEXT NOT NULL,
  data_primeiro_contato   TEXT,
  stage_history           JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS patricia_canto_cases (
  id                          TEXT PRIMARY KEY,
  lead_id                     TEXT,
  nome_cliente                TEXT NOT NULL,
  telefone                    TEXT NOT NULL DEFAULT '',
  tipo_processo                TEXT NOT NULL,
  stage                       TEXT NOT NULL DEFAULT 'onboarding',
  documentos_pendentes        TEXT,
  data_abertura_processo      TEXT,
  numero_protocolo            TEXT,
  status_inss                 TEXT,
  numero_processo_judicial    TEXT,
  vara                        TEXT,
  status_judicial             TEXT,
  resultado                   TEXT,
  recurso_necessario          BOOLEAN,
  data_decisao                TEXT,
  honorario_exito_recebido    BOOLEAN NOT NULL DEFAULT false,
  pedido_indicacao_enviado    BOOLEAN NOT NULL DEFAULT false,
  depoimento_coletado         BOOLEAN NOT NULL DEFAULT false,
  data_ultima_atualizacao     TEXT NOT NULL,
  data_criacao                TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patricia_canto_settings (
  key    TEXT PRIMARY KEY,
  value  JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pc_leads_stage   ON patricia_canto_leads(stage);
CREATE INDEX IF NOT EXISTS idx_pc_cases_stage   ON patricia_canto_cases(stage);
CREATE INDEX IF NOT EXISTS idx_pc_cases_lead_id ON patricia_canto_cases(lead_id);

-- Dado pessoal de cliente (nome/telefone/caso) — RLS ativado e sem nenhuma
-- policy, ou seja, fechado por padrão. A service role key (única que o app
-- usa para essas tabelas) ignora RLS, então continua funcionando; a anon
-- key (pública, hardcoded no código) não enxerga nada aqui.
ALTER TABLE patricia_canto_leads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE patricia_canto_cases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE patricia_canto_settings  ENABLE ROW LEVEL SECURITY;
`;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const role = verifySessionToken(req.cookies.get(PC_SESSION_COOKIE)?.value);
  if (!role) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/plain")) {
    return new NextResponse(MIGRATION_SQL, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  return NextResponse.json({
    instructions: [
      "1. Abra o Supabase SQL Editor no projeto ERP (kkhxxsrgsewjfvnnssyf)",
      "2. Cole o SQL abaixo e execute",
      "3. Após executar, o board da Patrícia Canto passa a ler/gravar no banco",
    ],
    sql: MIGRATION_SQL,
  });
}
