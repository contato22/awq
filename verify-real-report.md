# verify-real-report — Conciliação Inteligente (PR #469)

**Branch:** `claude/relaxed-cerf-i1mdbi` · **Data:** 2026-06-12 · **Modo:** ambiente real (Vercel + Supabase `kkhxxsrgsewjfvnnssyf`)

## Veredito: 🛑 BLOQUEADO — faltam credenciais de ambiente real

O runbook `/verify-real` exige credenciais/secrets fornecidos pelo operador no ambiente do
agente. **Nenhuma está presente** neste ambiente, portanto nenhum check A–I pode rodar contra
o sistema real. Conforme a regra de ouro do runbook ("nunca simule, infira ou invente; se faltar
acesso, PARE e reporte BLOQUEADO"), nada foi executado nem fabricado.

### Evidência — presence check (valores nunca lidos/impressos)

```
MISSING SUPABASE_URL
MISSING SUPABASE_ANON_KEY
MISSING SUPABASE_SERVICE_ROLE_KEY
MISSING SUPABASE_DB_URL
MISSING PREVIEW_URL
MISSING SESSION_COOKIE
MISSING CORA_ACCOUNTS
MISSING ERP_SUPABASE_SERVICE_ROLE_KEY
MISSING NEXT_PUBLIC_ERP_SUPABASE_URL
MISSING NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY
MISSING CORA_CLIENT_ID / CORA_CERT / CORA_KEY
MISSING NEXTAUTH_SECRET / DATABASE_URL
.env.local: absent
```

Egress NÃO é o bloqueio (a rede alcança o host):

```
kkhxxsrgsewjfvnnssyf.supabase.co -> HTTP 403 (connect 0.02s)   # 403 = sem apikey, esperado
```

## Tabela de veredito

| Check | Sev. | Resultado | Motivo do bloqueio |
|---|---|---|---|
| A · Migration aplicada | 🟡 | BLOQUEADO | falta `SUPABASE_DB_URL` ou `SUPABASE_SERVICE_ROLE_KEY` |
| B · RLS fechado (sonda PostgREST) | 🔴 | BLOQUEADO | falta `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` |
| C · Mapeamento BU↔Cora | 🟠 | BLOQUEADO | falta acesso ao DB; mapeamento é por request, não tabela `bu_bank_account` (ver nota) |
| D · Ingestão real + dedupe | 🟠 | BLOQUEADO | falta `PREVIEW_URL` + `SESSION_COOKIE` + `CORA_ACCOUNTS` |
| E · Motor end-to-end | 🔴 | BLOQUEADO (lógica validada em PG local — ver nota) | falta acesso ao DB real |
| F · Backfill dos 1.400 | 🔴 | BLOQUEADO (rota implementada — ver nota) | falta acesso ao DB real |
| G · Cobertura real + gate | 🔴 | BLOQUEADO | falta acesso ao DB + `PREVIEW_URL` |
| H · Intercompany / consolidado | 🟠 | BLOQUEADO | falta acesso ao DB |
| I · Painel de métricas (cross-check) | 🟠 | BLOQUEADO | falta `PREVIEW_URL` + acesso ao DB |

## O que é necessário para destravar

Configurar como **env/secret no ambiente do agente** (nunca no chat/repo): `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `PREVIEW_URL` (deploy Ready),
`SESSION_COOKIE` (sessão autenticada) e `CORA_ACCOUNT_AWQ` (id real da conta). Pré-aplicar as
**migrations 003/004/005** no Supabase SQL Editor (e cadastrar as contas reais em `bu_bank_account`).

**Runner:** com os secrets presentes, rode `bash scripts/verify-real.sh` — ele executa os checks
A–I contra o ambiente real, regenera este `verify-real-report.md` com as evidências (mascarando
credenciais) e sai com código ≠ 0 se algum 🔴 (B/E/F/G) reprovar.

## Notas de escopo (importantes)

1. **Pré-requisitos do §1 — AGORA implementados nesta branch e validados localmente** (commit `ab617d0`):
   - **PR-RLS** (migration `004`): `REVOKE anon` nas tabelas `recon_*` + RLS **fail-closed**
     (sem `app.current_bu` → 0 linhas). Validado em Postgres local: anon=`permission denied`,
     authenticated sem contexto=0, com contexto=só a BU, superuser(proxy service_role)=tudo.
     → Com credenciais, espera-se que o **Check B PASSE**.
   - **PR-backfill**: `POST /api/conciliacao/backfill` migra `bank_transactions`→`bank_transaction`,
     idempotente por `(bu,e2e_id)`. → destrava o **Check F**.
   - **PR-hardening**: teto/janela/tolerância por env; DIFF classificado por `recon_rule`;
     **teste de integração contra Postgres REAL** (`npm run test:recon:int`, 5/5) validando a
     invariante `Σ applied = abs(amount)`, unicidade e idempotência **no banco**. → reforça o **Check E**.
   - **Ressalva Check C:** o mapeamento BU↔conta Cora continua sendo **parâmetro de request** em
     `/api/conciliacao/sync` (não a tabela `bu_bank_account` que o runbook assume). Follow-up à parte
     se o gate exigir a tabela.

2. **Verificação possível no sandbox (não substitui o real):** a lógica de schema da migration 003
   foi exercida contra um Postgres local — idempotente; Teste 7 (intercompany excluído de
   `v_consolidado_grupo` → 0 linhas), Teste 8 (trigger de lock de período levanta erro; BU sem
   período fechado atualiza), Teste 11 (RLS por `app.current_bu` isola ENRD de AWQ). O motor/scoring
   passam em `npm run test:recon` (53 checks). Isso valida **lógica**, não o **estado real** do
   Supabase de produção — que é exatamente o que A–I cobririam.

## Decisão

Cockpit **NÃO** pode ser considerado "definitivo": os bloqueadores 🔴 (B, E, F, G) não foram
verificáveis. Forneça os secrets acima e re-execute o runbook.
