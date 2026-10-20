# AGENTS.md — Plataforma AWQ

Contrato para agentes de código e para quem abre pull requests neste repositório.
O detalhe operacional de finanças, Cora e SSR continua em [`CLAUDE.md`](./CLAUDE.md).
Os dois arquivos descrevem o mesmo sistema: se divergirem, o código e este guia vencem para o fluxo de PR; `CLAUDE.md` vence para o comportamento das páginas financeiras.

## O que é

ERP interno do Grupo AWQ (Next.js 14, App Router): finanças, DRE, DFC, balanço, conciliação bancária (Cora), budget, forecast, EPM, CRM e o simulador de agentes em `/agents/office`.

Produção: Vercel, `https://awq-brown.vercel.app`. Há também um export estático para GitHub Pages (`STATIC_EXPORT=1`).

## Stack

- Next.js **14.2.35** (App Router + algumas rotas em `pages/api`). `eslint-config-next` está na mesma versão.
- React 18, TypeScript estrito (`tsconfig.json`, `noEmit`)
- Tailwind CSS, Recharts, Lucide
- NextAuth 4 (Credentials + JWT + papéis)
- Supabase (`@supabase/supabase-js`) e `postgres` quando existe `DATABASE_URL`
- Playwright para o smoke em `e2e/`
- Package manager: **npm** (`package-lock.json` na raiz). Não usar pnpm nem yarn.
- Node no CI: **20** (o workflow de harness e os deploys existentes)

Não atualizar `next` nem `eslint-config-next` num PR de feature. Há trabalho de segurança separado para o upgrade.

## Instalar, rodar, testar, buildar

```bash
npm ci          # igual ao CI; npm install só se o lockfile precisar mudar
npm run dev     # http://localhost:3000
npm run lint    # next lint — erro falha, warning não falha
npx tsc --noEmit
npm run build   # next build (SSR). Não precisa de secret real.
npm run start   # depois do build
```

Testes que rodam **sem** banco e sem secret (`npm test` no harness):

```bash
npm test                 # test:recon + test:live-shop + lib/api-auth.test.ts + lib/rate-limit.test.ts
npm run test:recon       # scoring e motor de conciliação, puros
npm run test:live-shop   # critérios offline da Live Shop
```

`npm run test:epm` e `npm run test:recon:int` leem ou gravam banco se `DATABASE_URL` estiver definida. Sem essa variável o EPM cai no fallback estático. O workflow `epm-seed-and-test.yml` não usa esse fallback: sem `SUPABASE_DB_URL`, ou se o teste ao vivo falha, o job falha. Nunca apontar essas variáveis para produção a partir de um agente.

Smoke Playwright (`e2e/smoke.spec.ts`):

```bash
# O config aponta para http://127.0.0.1:3000 e recusa awq-brown.vercel.app.
# Suba o app antes (npm run build && npm run start).
npx playwright test
```

O `website/` é outro app Next, com o próprio `package-lock.json`. O harness da raiz não o builda. O deploy dele é `.github/workflows/deploy-website.yml` — não editar.

`.github/workflows/pages.yml` publica a vitrine com os JSON já commitados em `public/data/`. Não chama o Notion e não lê `NOTION_API_KEY` / `NOTION_TOKEN`. O cron diário que existia para refrescar o Notion foi removido. Nenhum workflow atual usa `GH_PERSONAL_TOKEN`. O único uso era `advisor-bi.yml`, que publicava noutro repositório (`contato22/advisor-bi`) e foi removido: `GITHUB_TOKEN` não tem permissão de push para um repositório externo, e o site deixou de ser publicado.

## Estrutura

```
app/            # App Router: BUs (awq, jacqes, caza-vision, awq-venture, advisor, enrd), crm, api
pages/api/      # Rotas legadas (NextAuth e alguns endpoints)
components/     # UI compartilhada, inclusive o office 3D
lib/            # Domínio: auth, supabase, finanças, Cora, EPM, office, guards
hooks/          # Hooks de cliente
types/          # Tipos compartilhados
e2e/            # Smoke Playwright
supabase/migrations/   # SQL aplicado à mão no SQL Editor
scripts/        # Seeds, probes e testes tsx — vários falam com produção
public/data/    # JSON de fallback / vitrine. Parte é gerada e está no gitignore
website/        # Site separado
.github/workflows/     # Deploy, seed, audit e o harness de PR
```

Rotas canônicas estão em `lib/platform-registry.ts`.

## Convenções

- Alias `@/*` aponta para a raiz do repositório.
- Páginas financeiras usam `getAllTransactions()` / `getAllDocuments()` de `lib/financial-db.ts`, com `try/catch`. Erro de banco mostra banner, não derruba o SSR.
- Essas páginas ficam com `export const dynamic = "force-dynamic"`. Não trocar para `"auto"` nem apagar.
- Clientes Supabase de servidor usam `noStoreFetch` (`cache: 'no-store'`) em `lib/supabase.ts`. Não remover.
- `initDB()` em `lib/db.ts` não pode lançar: só loga.
- `next.config.mjs` ignora erro de tipo e de lint **durante** `next build` (`ignoreBuildErrors` / `ignoreDuringBuilds`). O harness roda lint e `tsc` em passos próprios. Não “consertar” o build apagando esses passos.
- Classificação em `lib/financial-classifier.ts`. Categorias `transferencia_interna_*`, `aplicacao_financeira`, `resgate_financeiro` e `reserva_limite_cartao` têm `excludedFromConsolidated = true`.
- Datas da API Cora são só `YYYY-MM-DD`, sem timestamp.
- Comentários e copy de produto misturam português e inglês. Texto novo de UI segue o português já usado na tela.
- Um PR por assunto, a partir de uma branch nova. Não fazer push na `main`.

## Supabase e migrações

Dois projetos aparecem no código:

- Financeiro: `gqkgsoglgubmaborixfb` (`SUPABASE_URL` / anon / service role)
- ERP: `kkhxxsrgsewjfvnnssyf` (`NEXT_PUBLIC_ERP_SUPABASE_*` e `ERP_SUPABASE_SERVICE_ROLE_KEY`)

Cadeia de leitura em `lib/financial-db.ts`: service role financeiro → service role ERP → anon → JSON em `public/data/financial/` (só dev).

Migrações ficam em `supabase/migrations/`. O controle de versão é o ledger próprio em `public.erp_schema_migrations` (nome relativo + SHA-256) e o marcador `public.erp_schema_migration_state`. Não é o `schema_migrations` do Supabase CLI e não há `supabase db push`. O runner é [`scripts/erp-migrate.mjs`](./scripts/erp-migrate.mjs). O workflow é [`.github/workflows/migrate-erp-schema.yml`](./.github/workflows/migrate-erp-schema.yml).

O job usa `environment: production` (o environment Production exige reviewer) e `github.ref == refs/heads/main`. Baseline e migrate são `workflow_dispatch`: ficam parados até essa aprovação e exigem a frase de confirmação. Push na `main` que altere `awq_erp_full_schema.sql` ou `supabase/migrations/**` só faz dry-run, também depois da aprovação do environment. `secrets` não pode aparecer em `steps.if` (o GitHub rejeita o arquivo na leitura e falha todo push). O gate do banco é o output booleano `steps.dburl.outputs.present`. Sem baseline, o migrate recusa e não executa SQL.

Conjunto padrão, nesta ordem: `awq_erp_full_schema.sql` e depois `supabase/migrations/*.sql` em ordem lexical. Arquivos `_*.sql` ficam de fora. A chave é o nome do arquivo, então `006_enrd_montagem.sql` e `006_live_shop.sql` (e o par `007`) são entradas distintas. Não renumerar arquivo já registrado. Não editar migração já registrada: o checksum muda e o job falha. Crie outro arquivo.

Cada arquivo pendente roda no máximo uma vez, na mesma transação que o `INSERT` do ledger. Falha desfaz esse arquivo e não grava a linha. Arquivos anteriores da mesma corrida permanecem. Fora da transação só entra arquivo com a linha `-- erp-migrate: no-transaction`, ou com `CREATE/DROP/REINDEX INDEX CONCURRENTLY` ou `VACUUM`. `BEGIN`/`COMMIT`/`ROLLBACK` no topo do arquivo (fora de função) bloqueia o migrate até essa marcação.

Destrutivo, e por isso bloqueado: `DROP TABLE`, `DROP SCHEMA`, `DROP DATABASE`, `TRUNCATE`, `DELETE FROM`, `DROP COLUMN`. Para rodar, as duas coisas ao mesmo tempo: a linha `-- erp-migrate: allow-destructive` no arquivo e `--allow-destructive` / input `allow_destructive`. `001_initial_schema.sql` faz `DROP TABLE` em `bank_transactions` e `financial_documents` e também `DELETE FROM`. Não tem marcação. Não volta a rodar.

`dry-run` só lista. Não cria tabela e não executa migração.

**Baseline, obrigatório antes de qualquer migrate.** Produção já recebeu o histórico pelo SQL Editor. O baseline grava nome e checksum de cada arquivo atual e não executa nenhum deles. Sem a linha em `erp_schema_migration_state`, `migrate` sai com código 3 e não aplica nada. Um segundo baseline é recusado, para um arquivo novo não ser marcado como aplicado sem rodar. O workflow não aceita baseline parcial (`--files`).

`SUPABASE_DB_URL` precisa ser a conexão direta ou o pooler de sessão (porta 5432). O pooler de transação (porta 6543) não serve: o lock fica preso à transação de cada arquivo.

Passo a passo para o dono, na branch `main`, em Actions → **Apply ERP Schema (Supabase)**. O job usa o environment Production e fica parado até o reviewer aprovar. Não disparar a partir de um agente. Não apontar `MIGRATE_DATABASE_URL` para produção fora desse workflow: host que não seja localhost exige `MIGRATE_ALLOW_REMOTE=1`, e só o workflow define isso.

1. Rode com `mode=dry-run`. O log tem de mostrar `baseline=ausente`. `001_initial_schema.sql` aparece bloqueado. `_bootstrap_conciliacao_full.sql` não aparece.
2. Confira, fora do workflow, que `public.bank_transactions` existe e tem os dados reais. O baseline só testa a existência dessa tabela. Não conta linhas e não prova que cada arquivo histórico já foi aplicado. Se algum arquivo do diretório nunca rodou em produção, o baseline vai impedir que ele rode depois.
3. Rode de novo com `mode=baseline` e `confirm` exatamente `REGISTRAR_BASELINE_SEM_EXECUTAR`. `allow_destructive` fica desligado. O job só faz `INSERT` no ledger. Se `bank_transactions` não existir, o job falha e não escreve.
4. Rode `dry-run` outra vez. Os arquivos atuais ficam `aplicado` com `source=baseline` e `pending=0`.
5. Só então um arquivo **novo** entra com `mode=migrate` e `confirm` exatamente `APLICAR_PENDENTES`. Push na `main` que altere `awq_erp_full_schema.sql` ou `supabase/migrations/**` faz apenas dry-run.

`live-shop-bootstrap.yml` usa o mesmo runner para a lista 006 (live shop) até 012, no `environment: production` e só na `main`. Sem baseline, o bootstrap recusa. O push de `.github/live-shop-bootstrap.trigger` agora só faz dry-run. Bootstrap manual pede `APLICAR_PENDENTES` e a aprovação do environment.

`_bootstrap_conciliacao_full.sql` continua sendo atalho de 003+004+005 e fica fora do ledger. `conciliacao-bootstrap.yml` ainda aplica esse arquivo direto, sem checksum, mas o job do #1163 segue no `environment: production` e só em `refs/heads/main`. Não disparar. Não executar contra produção a partir de um agente.

O teste que prova idempotência, rollback e o bloqueio de destrutivo é `npm run test:migrate-ledger`, no workflow [`.github/workflows/migrate-ledger-ci.yml`](./.github/workflows/migrate-ledger-ci.yml), contra um Postgres de serviço. Não usa secret e não fala com o Supabase remoto.

RLS das tabelas `financial_documents` e `bank_transactions` está desligada (a anon key lê e escreve). As tabelas `recon_*` são fail-closed (`supabase/migrations/004_recon_rls_hardening.sql`). Não desligar RLS, não conceder `anon` de novo e não aplicar SQL de endurecimento ou de seed no projeto remoto sem pedido explícito do dono. O ledger nasce com RLS ligada, sem policy, e com `REVOKE` de `PUBLIC` / `anon` / `authenticated`. O papel que roda o workflow continua dono da tabela.

## Auth e segurança

- Sessão: NextAuth Credentials, JWT, papéis em `lib/auth-users.ts` (`owner`, `admin`, `analyst`, `cs-ops`, `caza`, `enrd`, `jacqes`, `live-shop`, `live-guest`, `jacqes-guest`).
- `middleware.ts` exige token, aplica `canAccess` e a allow-list de API por papel de BU. Convidado sem grant volta para o próprio portal.
- Rotas públicas estão na lista negativa do `matcher`. Não alargar essa lista.
- Handlers novos que mexem em dado sensível passam por `apiGuard` (`lib/api-guard.ts`). Não logar senha, JWT nem body completo.
- `apiGuard` retorna `null` (libera) quando `NEXTAUTH_SECRET` está ausente, para o export estático. Não copiar esse atalho para um handler que rode em produção.
- Segredos existem só nas Environment Variables da Vercel (e, quando o workflow antigo precisar, em GitHub Secrets). Nunca no código, nunca num `.env*` commitado. Nomes que não podem vazar: `ERP_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `CORA_CLIENT_ID`, `CORA_CERT`, `CORA_KEY` (e os sufixos `_JACQES` / Enerdy), `NEXTAUTH_SECRET`, `ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `TIKTOK_APP_SECRET`, `OFFICE_TICK_SECRET`, `ENERDY_PASS`.
- O repositório já contém anon keys públicas como fallback. Não adicionar outra, e não tratar anon key como autorização para escrever em produção.
- Office: só `head`, `missions`, `events` e `policies` vão para `office_state`. Conversa, relatório da manhã e entrega de cliente ficam no browser. Não versionar `public/data/office/reports/` nem `public/data/enerdy-portal/` (PII).
- Head de CS no servidor só gasta crédito com `OFFICE_HEAD_TICK=1`, secret, `ANTHROPIC_API_KEY` e o modo autônomo ligado. Não ligar isso num PR.

## CI

O checklist seguro para PRs paralelos é [`.github/workflows/ci-harness.yml`](./.github/workflows/ci-harness.yml):

| Passo | Bloqueia o PR? | Notas |
| --- | --- | --- |
| `npm ci` com cache do `package-lock.json` | sim | Node 20 |
| `npm run lint` | sim | No `main` (commit `1adcda49`, 2026-10-15) passa com warnings de `react-hooks/exhaustive-deps` em `app/crm/analytics/page.tsx`, `components/office/OfficeGame3D.tsx` e `components/patricia-canto/PatriciaCantoBoard.tsx`. Não transformar warning em erro sem limpar esse baseline. |
| `npx tsc --noEmit` | sim | Limpo nesse mesmo commit. |
| `npm test` | sim | `test:recon`, `test:live-shop`, `lib/api-auth.test.ts`, `lib/rate-limit.test.ts`. Sem banco. |
| `npm audit --audit-level=high` | não | O lockfile já tem high/critical (`next`, `next-auth`, `pdfjs-dist`, `postcss` e transitivas). O passo fica visível e não bloqueia. Não usar este PR para atualizar o Next. |
| `npm run build` | sim | Env só com placeholders (`ci-placeholder.invalid`, `NEXTAUTH_SECRET` fictício). Não definir `NEXTAUTH_URL`. |
| Playwright (`e2e/smoke.spec.ts`) | sim | Sobe o build local. O default do config é `http://127.0.0.1:3000` e recusa `awq-brown.vercel.app`. |

`.github/workflows/vercel-deploy.yml` também roda lint, tsc e build, com os mesmos placeholders. Não injeta secret de produção: o build de CI não precisa, e um `pull_request` receberia o workflow do branch. Continua sendo um workflow separado; o gate deste harness é o `ci-harness.yml`. Não voltar a passar `NEXTAUTH_SECRET` nem anon key real.

O smoke cobre o contrato atual:

- `/login` responde 200 e mostra o formulário. O identificador fica `type=text` porque o campo aceita e-mail **ou** usuário; `type=email` bloquearia usuário sem formato de e-mail na validação do browser.
- `/api/erp/health` e outras rotas sensíveis atrás do middleware (`/api/setup/migrate`, `/api/cora/sync`, `/api/cora/debug`, `/api/conciliacao/data`, `/api/epm/dre`, `/api/office/state`, `/api/crm/accounts`, `/api/ingest/upload`, `/api/internal/test-supabase`, `/api/security/audit`) respondem 302/307 para o login e não devolvem JSON.
- Rotas fora do matcher que gravam ou sincronizam (`/api/setup/seed-*`, `/api/setup/backfill-snapshots`, `/api/cora/cron-sync`, `/api/cora/audit-probe`, `/api/cora/sync-probe`, `/api/office/head/tick`, `/api/enrd/debug-saldo`, `/api/enrd/montagem/cron-sync`, `/api/live-shop/cron`) negam anônimo com 401/403/503.
- `/api/auth/csrf` e `/api/health` seguem públicos.

## Não mexer

- **Dados de produção.** Não rodar seed, backfill, sync Cora, bootstrap ou SQL no Supabase remoto. Em especial: `scripts/bootstrap-prod.ts`, `scripts/setup-secrets.sh`, `scripts/seed-epm-planning.ts`, `scripts/seed-enrd-*.mjs`, `scripts/seed-jacqes-clients-as-danilo.sh`, `scripts/fetch-enerdy-portal.mjs`.
- **Segredos.** Não imprimir, não copiar para o workflow, não commitar `.env`, `.env.local`, `*.pem` ou token. O exemplo versionado é só `.env.example`, com valores falsos.
- **Workflows de deploy, seed, audit e probe.** Não editar para “unificar” com o harness:
  - `.github/workflows/backfill-snapshots.yml`
  - `.github/workflows/conciliacao-bootstrap.yml`
  - `.github/workflows/cora-audit.yml`
  - `.github/workflows/deploy-website.yml`
  - `.github/workflows/epm-seed-and-test.yml`
  - `.github/workflows/live-shop-bootstrap.yml`
  - `.github/workflows/office-head-tick.yml`
  - `.github/workflows/pages.yml`
  - `.github/workflows/post-deploy-seeds.yml`
  - `.github/workflows/probe-vercel.yml`
  - `.github/workflows/santander-seed.yml`
  - `.github/workflows/vercel-deploy.yml`
- **`.github/workflows/migrate-erp-schema.yml`.** Não disparar (`workflow_dispatch`) e não aplicar o SQL em produção a partir de um agente. O job usa `environment: production` e `github.ref == refs/heads/main`. Baseline e migrate esperam a aprovação desse environment. Push na `main` que altere `awq_erp_full_schema.sql` ou `supabase/migrations/**` só faz dry-run, com o mesmo environment. `secrets` não pode aparecer em `steps.if` — isso invalida o workflow em todo push. O gate do banco é o output booleano `steps.dburl.outputs.present`. Não remover o `environment`. Não voltar ao loop que reaplica `supabase/migrations/*.sql`.
- **`.github/workflows/live-shop-bootstrap.yml`.** O bootstrap chama o mesmo ledger, no `environment: production` e só na `main`. Não substituir por `psql -f` em loop. Não disparar a partir de um agente. Não remover o `environment`.
- **Upgrade de Next.js** e reescrita ampla de `middleware.ts`, `lib/api-guard.ts` ou das rotas de API só para “passar segurança”. Isso é outro conjunto de PRs.
- **`noStoreFetch`**, `dynamic = "force-dynamic"` nas páginas financeiras, e o `try/catch` de `getAllTransactions()` / `getAllDocuments()`.
- **Extratos, PDFs e relatórios de cliente** em `public/data/` que o `.gitignore` já exclui.
