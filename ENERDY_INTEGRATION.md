# Integração Enerdy → AWQ Plataforma (BU ENRD)

Puxar dados da **plataforma de gestão da Enerdy** (`gestao.enerdy.com.br`, tela
`/app/montagem` e correlatas) para alimentar a **BU ENRD** na AWQ Plataforma.

## Status atual

| Componente | Estado |
|---|---|
| BU ENRD (páginas `app/enrd/*`, role-lock `enrd`) | ✅ já existe |
| Harness de descoberta (`scripts/fetch-enerdy.mjs`) | ✅ pronto |
| Cliente API (`lib/enerdy-api.ts`) | ⚠️ estruturado, endpoints **a descobrir** |
| Liberação de rede para `enerdy.com.br` | ❌ **bloqueado** (ação do usuário/admin) |
| Endpoints reais + parser do payload | ⏳ depende da descoberta |

## Por que está bloqueado hoje

Todo tráfego de saída deste ambiente passa por um proxy que aplica a política
de rede. `enerdy.com.br` **não** está na allowlist *Trusted*, então qualquer
acesso (browser, curl, fetch) recebe `403` na etapa de conexão — antes de chegar
ao servidor da Enerdy. Não é problema de login.

## Passo 1 — Liberar a rede (você/admin, fora da sessão)

No Claude Code on the web, edite o ambiente desta sessão:

1. Ícone de nuvem (nome do ambiente) → editar ambiente.
2. **Network access**: trocar *Trusted* → **Custom**.
3. **Allowed domains**, adicionar:
   ```
   gestao.enerdy.com.br
   *.enerdy.com.br
   ```
4. Marcar **"Also include default list of common package managers"**.
5. Salvar e **abrir uma nova sessão** (mudança de rede só vale em sessão nova).

> Alternativa: Network access = **Full** (qualquer domínio).

## Passo 2 — Credenciais (env vars, nunca commitadas)

Adicionar nas environment variables do ambiente (e na Vercel, para produção):

```
ENERDY_USER=miguel_enerdy
ENERDY_PASS=********
ENERDY_BASE_URL=https://gestao.enerdy.com.br
```

> A senha foi compartilhada em texto no chat — recomendo trocá-la e usar a nova
> apenas como env var.

## Passo 3 — Descobrir a API por trás da SPA

A tela `/app/montagem` é uma SPA: os dados vêm de uma API JSON. Em vez de raspar
o DOM (frágil), descobrimos o endpoint capturando o tráfego no login + navegação:

```bash
ENERDY_USER=... ENERDY_PASS=... node scripts/fetch-enerdy.mjs
```

Saída em `scripts/.enerdy-out/`:
- `discovery-report.json` — endpoints JSON capturados (método, status, amostra)
- `cookies.json` — sessão (para reuso via HTTP puro)
- `api-*.json` — payloads crus
- `page-*.html`, `screenshot-*.png`, `tables-*.txt` — fallback se não houver API

Variáveis opcionais do script: `ENERDY_HEADFUL=1`, `ENERDY_ROUTES="/app/montagem,/app/outra"`,
`ENERDY_LOGIN_URL=...`.

## Passo 4 — Conectar o cliente

Com o `discovery-report.json`, preencher em `lib/enerdy-api.ts` (ou via env):
- `ENDPOINTS.login` / `ENERDY_LOGIN_PATH` — rota de autenticação
- `ENDPOINTS.montagem` / `ENERDY_MONTAGEM_PATH` — rota de dados da montagem
- ajustar nomes dos campos de login e o shape de `EnerdyMontagemItem`.

## Passo 5 — Ingestão na BU ENRD

Padrão já usado no repo (ex.: `app/api/enrd/seed-*`, `lib/recon-ingest.ts`):
criar `POST /api/enrd/sync` que chama `fetchMontagem()`, normaliza e persiste
(Supabase ERP ou `public/data/`), restrito ao owner da BU
(`kazadem2@gmail.com`) ou ao owner global (`contato@awq.com.br`).
Definir o destino/normalização depois de ver o payload real.

## Decisões pendentes (precisam do payload real)

- Onde gravar: tabela nova no Supabase ERP vs. JSON em `public/data/`.
- Quais campos da montagem viram o quê na BU (receita? pipeline? produção?).
- Cadência: sync manual, cron (`/routines`), ou webhook.
