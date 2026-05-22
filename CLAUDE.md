# AWQ — Plataforma Central (ERP + Finanças)

## O que é este projeto

Next.js 14 App Router — ERP interno do Grupo AWQ com módulos de finanças, DRE, DFC, Balanço Patrimonial, Conciliação Bancária (Cora), Budget, Forecast, EPM e CRM.

Deploy: Vercel (produção em `awq-brown.vercel.app`).

---

## CRÍTICO — Segredos nunca vão para o git

Os seguintes segredos ficam **apenas** nas Vercel Environment Variables. Nunca no código, nunca em `.env.local` commitado:

- `ERP_SUPABASE_SERVICE_ROLE_KEY` — chave de serviço do Supabase ERP (`kkhxxsrgsewjfvnnssyf`)
- `CORA_CLIENT_ID`, `CORA_CERT`, `CORA_KEY` — credenciais mTLS + OAuth2 da Cora
- `NEXTAUTH_SECRET`, `ANTHROPIC_API_KEY`

---

## Banco de dados — onde os dados vivem

### Supabase ERP (`kkhxxsrgsewjfvnnssyf` — projeto `awq-tower-crm`)

Tabelas financeiras principais (migração executada uma vez no SQL Editor):
- `financial_documents` — extratos importados (PDFs, CSVs)
- `bank_transactions` — transações bancárias classificadas e conciliadas

**RLS desabilitado** nessas tabelas. Anon key tem permissão de leitura/escrita.

### Adaptadores DB (priority chain em `lib/financial-db.ts`)

```
supabase (financial DB svc role)
  ?? erpAdmin (ERP DB svc role — mais usado em produção)
  ?? erpAnon  (ERP DB anon — fallback hardcoded)
  ?? anonClient (financial DB anon — último recurso)
  ?? JSON files (public/data/financial/ — dev local apenas)
```

`ERP_SUPABASE_SERVICE_ROLE_KEY` configurado no Vercel → `erpAdmin` é o cliente ativo.

### Next.js Data Cache — IMPORTANTE

Os clientes Supabase são criados com `cache: 'no-store'` (em `lib/supabase.ts`) para evitar
que Server Components retornem dados cacheados/vazios. **Não remova o `noStoreFetch`.**

---

## Integração Cora Bank

- Arquivo: `lib/cora-api.ts`
- OAuth2 + mTLS (certificados em env vars como strings PEM com `\n` escapados)
- Endpoint produção: `https://matls-clients.api.cora.com.br`
- Endpoint stage: `https://api.stage.cora.com.br` (ativar com `CORA_ENV=stage`)
- Datas devem ser **apenas** `YYYY-MM-DD` (sem timestamps)
- Rota de sync: `POST /api/cora/sync`
- Rota de debug: `GET /api/cora/debug` (retorna estado cru da API + contagem de tabelas)

### Accounts configuradas
- `Conta PJ AWQ Holding` → entity `AWQ_Holding`
- `Conta PJ JACQES` → entity `JACQES` (requer `CORA_JACQES_CLIENT_ID`, `CORA_JACQES_CERT`, `CORA_JACQES_KEY`)

---

## Páginas financeiras e suas fontes de dados

Todas usam `getAllTransactions()` / `getAllDocuments()` de `lib/financial-db.ts`.
SSR com `force-dynamic`. Erros de DB são capturados em try/catch — página monta vazia
com banner âmbar em vez de crashar.

| Página | Rota | Fonte principal |
|--------|------|-----------------|
| Conciliação | `/awq/conciliacao` | `bank_transactions` + Cora sync |
| DRE (Financial) | `/awq/financial` | `bank_transactions` via `lib/dre-query.ts` |
| DFC (Cash Flow) | `/awq/cashflow` | `bank_transactions` via `lib/financial-query.ts` |
| Balanço Patrimonial | `/awq/contabilidade` | `bank_transactions` |
| P&L (DRE) | `/awq/epm/*/pl` | `bank_transactions` via `lib/epm-gl.ts` |
| KPIs | `/awq/kpis` | métricas derivadas de `bank_transactions` |

**Todas essas páginas dependem dos mesmos dados em `bank_transactions`.
Alterações no schema ou na lógica de leitura afetam TODOS esses relatórios.**

---

## Classificação de transações

`lib/financial-classifier.ts` — classifica automaticamente cada transação em:
- `managerialCategory` (ex: `receita_servicos`, `despesa_pessoal`, `transferencia_interna_enviada`)
- `classificationConfidence` (`certain`, `probable`, `possible`, `manual`)

Transações `transferencia_interna_*`, `aplicacao_financeira`, `resgate_financeiro` e
`reserva_limite_cartao` têm `excludedFromConsolidated = true` para não distorcer DRE/DFC.

---

## Arquitetura SSR — regras de ouro

1. **Nunca** deixar `getAllTransactions()` ou `getAllDocuments()` sem try/catch em páginas SSR
2. **Nunca** remover `noStoreFetch` dos clientes Supabase em `lib/supabase.ts`
3. **Nunca** mudar o `dynamic = "force-dynamic"` nas páginas financeiras para `"auto"` ou remover
4. `initDB()` em `lib/db.ts` nunca deve lançar exceção — erros são apenas logados

---

## Comandos úteis

```bash
npx tsc --noEmit          # verifica TypeScript sem compilar
npm run build             # build completo (confirma que não quebrou SSR)
```

---

## Endpoints de diagnóstico (requerem login)

- `GET /api/cora/debug` — estado da API Cora + contagem de tabelas no Supabase
- `GET /api/health` — presença de env vars, ping do Supabase, status dos adaptadores DB
- `GET /api/setup/migrate` — SQL de migração das tabelas financeiras (rodar uma vez no SQL Editor)

---

## Histórico de correções críticas (Mai 2026)

- **SSR crash global**: `postgres()` constructor lançava exceção no módulo — corrigido com IIFE try/catch em `lib/db.ts`
- **Cora BST-0000**: datas estavam sendo enviadas com timestamp ISO — corrigido para `YYYY-MM-DD` somente
- **Sync falhava**: `initDB()` lançava exceção antes de chegar no Supabase — corrigido com `.catch()` interno
- **Page SSR vazia**: Next.js cacheava fetch do Supabase em Server Components — corrigido com `cache: 'no-store'` em todos os clientes server-side
- **Board não atualizava**: `useState(initialTransactions)` não re-inicializa em prop changes — corrigido com `useEffect([initialTransactions])`
