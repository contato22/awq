# Supabase Migrations

Run each migration in the **Supabase SQL Editor** (Dashboard → SQL Editor →
paste the file contents → **Run**), in order. All are idempotent / safe to re-run.

| # | Arquivo | O que faz |
|---|---------|-----------|
| 001 | `migrations/001_initial_schema.sql` | Schema completo (financial, EPM, CRM, BPM, M&A, PPM) |
| 002 | `migrations/002_add_enrd_bu.sql` | Adiciona a BU `ENRD` |
| 003 | `migrations/003_conciliacao_inteligente.sql` | Conciliação Inteligente: 7 tabelas (`accounting_period`, `bank_transaction`, `ledger_entry`, `recon_group`, `recon_match`, `recon_rule`, `recon_payee_memory`) + 2 views (`v_saldo_conciliado`, `v_consolidado_grupo`) + índices + lock de período + RLS por BU |
| 004 | `migrations/004_recon_rls_hardening.sql` | Endurece a RLS: REVOKE `anon` nas tabelas `recon_*`, RLS **fail-closed** (sem `app.current_bu` → 0 linhas), e `bank_transaction.source` aceita `'legacy'` (backfill). Rode após a 003. |

## RLS por BU (migration 003)

As tabelas `recon_*` isolam linhas por BU via o GUC de sessão `app.current_bu`.
O backend deve setá-lo após autenticar o usuário, por conexão:

```sql
SET app.current_bu = 'ENRD';   -- ou 'AWQ'
```

Com o GUC vazio/ausente a policy é permissiva (o backend com service role lê
tudo; o `service_role` do Supabase também faz BYPASS RLS por padrão).
