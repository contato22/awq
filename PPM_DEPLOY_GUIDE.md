# PPM Deploy Guide — AWQ Control Tower

## Visão Geral

O módulo PPM (Project & Portfolio Management) do AWQ Control Tower é implementado como parte do Next.js app existente. Não requer serviços adicionais — usa o mesmo banco de dados Neon PostgreSQL já configurado no projeto.

---

## Pré-requisitos

| Requisito | Versão mínima |
|-----------|--------------|
| Node.js   | 18.x         |
| Next.js   | 14.x (App Router) |
| Neon PostgreSQL | qualquer |
| Vercel    | Free tier    |

---

## 1. Banco de Dados

### 1.1 Executar Schema PPM

Conecte ao seu banco Neon e execute o arquivo `awq_ppm_full_schema.sql`:

```bash
# Via psql
psql $DATABASE_URL < awq_ppm_full_schema.sql

# Via Neon Console
# Cole o conteúdo de awq_ppm_full_schema.sql no SQL Editor
```

O schema cria as seguintes tabelas:
- `projects` — projetos com budget, revenue, datas, status
- `tasks` — tarefas com hierarquia, dependências, assignees
- `timesheets` — apontamentos de horas por projeto/task
- `resources` — recursos (funcionários e freelancers)
- `resource_allocations` — alocação por projeto/período
- `project_milestones` — marcos com trigger de faturamento
- `project_issues` — registro de issues e bugs
- `project_risks` — registro de riscos
- `project_comments` — comentários e discussões
- `project_files` — anexos e deliverables

Views criadas:
- `v_portfolio_dashboard` — visão consolidada do portfolio
- `v_resource_utilization` — utilização de recursos
- `v_project_profitability` — rentabilidade por projeto

### 1.2 Variáveis de Ambiente

O módulo PPM usa as mesmas variáveis já existentes:

```env
DATABASE_URL=postgresql://...  # Neon connection string
```

Sem DATABASE_URL, o módulo opera com dados seed em memória (útil para GitHub Pages / demo).

---

## 2. Arquivos do Módulo

### Backend (API Routes)

```
app/api/ppm/
├── projects/
│   ├── route.ts          # GET (list+metrics), POST (create)
│   └── [id]/route.ts     # GET (detail+tasks+etc), PATCH (update)
├── tasks/route.ts        # GET, POST, PATCH
├── time-entries/route.ts # GET, POST (create + approve action)
├── resources/route.ts    # GET (list + utilization mode), POST
├── milestones/route.ts   # GET, POST
├── issues/route.ts       # GET, POST
├── risks/route.ts        # GET, POST
├── comments/route.ts     # GET, POST (create + delete action)
└── metrics/route.ts      # GET (portfolio metrics + EVM)
```

### Frontend (Pages)

```
app/awq/ppm/
├── page.tsx              # Portfolio Dashboard
├── add/page.tsx          # Criar novo projeto
├── [id]/                 # Detalhe do projeto
│   ├── page.tsx
│   └── ProjectDetailClient.tsx
├── gantt/page.tsx        # Gantt timeline
├── tasks/page.tsx        # Kanban de tarefas
├── timesheets/page.tsx   # Apontamentos de horas + aprovação
├── resources/page.tsx    # Gestão de recursos
├── utilization/page.tsx  # Dashboard de utilização
├── profitability/page.tsx# Rentabilidade + EVM
├── risks/page.tsx        # Registro de riscos
└── health/page.tsx       # Portfolio Health Report
```

### Libraries

```
lib/
├── ppm-types.ts   # Todos os tipos TypeScript
├── ppm-db.ts      # Data access layer (in-memory + Neon)
└── ppm-utils.ts   # EVM, Gantt helpers, utilitários
```

---

## 3. Deploy no Vercel

O PPM é incluído automaticamente no deploy do projeto existente.

```bash
# Deploy manual
vercel --prod

# Ou via CI/CD (GitHub Actions já configurado)
git push origin main
```

### Static Export (GitHub Pages)

O módulo PPM suporta `output: 'export'` do Next.js via dados seed em memória. As páginas que chamam APIs em runtime não funcionam no modo export — use o modo Vercel para funcionalidade completa.

---

## 4. Integração com Sistemas Existentes

### CRM → PPM (Opportunity Won → Project)
Na página `/crm/opportunities`, ao clicar em "🚀 Criar Projeto PPM", o usuário é redirecionado para `/awq/ppm/add` com os parâmetros `opportunity_id`, `customer`, `revenue`, `bu` pré-preenchidos.

### EPM → PPM (Budget tracking)
Os timesheets aprovados atualizam `actual_cost` nos projetos. Isso pode ser sincronizado com o GL do EPM via:

```sql
-- Exemplo de sync EPM ← PPM
INSERT INTO general_ledger (account_code, amount, description, reference)
SELECT 
  '6100' as account_code,
  SUM(hours * billing_rate) as amount,
  'Timesheet ' || work_date as description,
  entry_id as reference
FROM timesheets
WHERE status = 'approved'
  AND invoiced = false;
```

### M&A → PPM (Media Deliverables)
Projetos do tipo `m4e_deliverable` podem ser vinculados a portcos via `portco_id` no schema. Implementar na UI conforme necessidade.

---

## 5. Seed Data

O módulo inclui dados de exemplo para demonstração imediata:

- **5 projetos** seed (JACQES, CAZA, ADVISOR)
- **Tasks** atribuídas por projeto
- **Milestones** com datas planejadas
- **Timesheets** de exemplo
- **Riscos e issues** de demonstração

Para limpar seed data e usar apenas dados reais:
1. Configure `DATABASE_URL` apontando para Neon
2. O `ppm-db.ts` automaticamente usa o banco real quando `DATABASE_URL` está disponível

---

## 6. Permissões / Auth

O módulo usa o sistema de autenticação NextAuth já configurado no projeto. Não há permissões granulares por módulo — todos os usuários autenticados têm acesso completo ao PPM.

Para adicionar RBAC (Role-Based Access Control), edite `lib/security-guard.ts` e os middleware routes.

---

## 7. Troubleshooting

| Problema | Solução |
|----------|---------|
| "Project not found" ao acessar `/awq/ppm/[id]` | Verifique `generateStaticParams()` em `page.tsx` |
| Métricas zeradas | Confirmar que `DATABASE_URL` está configurado |
| Gantt não renderiza | Verificar que `start_date` e `planned_end_date` são válidos |
| Timesheet approve não atualiza custo | Status deve ir de `submitted` → `approved` |
