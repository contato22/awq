# PPM User Guide — AWQ Control Tower

## Para Miguel (CEO / Gestor de Portfolio)

---

## 1. Acessando o PPM

Navegue para **AWQ → PPM** na sidebar lateral, ou acesse diretamente `/awq/ppm`.

---

## 2. Portfolio Dashboard (`/awq/ppm`)

A tela principal mostra todos os projetos da holding em um grid com:

- **KPIs do topo:** Projetos ativos, Revenue total, Margem média, Time alocado
- **Portfolio Health:** Barra visual com proporção Verde/Amarelo/Vermelho
- **Módulos PPM:** Atalhos rápidos para Gantt, Tarefas, Timesheets, etc.
- **Tabela de projetos:** Todos os projetos com código, BU, PM, progresso, revenue, margem, prazo e health

### Filtros disponíveis:
- Busca por nome/código
- Filtro por BU (JACQES, CAZA, ADVISOR, VENTURE)
- Filtro por Status (Ativo, Em Pausa, Concluído, Cancelado)
- Filtro por Health (🟢 On Track, 🟡 At Risk, 🔴 Off Track)
- Filtro por Tipo (One-off, Retainer, Interno)

---

## 3. Criar Projeto

### Opção A: A partir de uma Oportunidade CRM (Recomendado)
1. Vá para **CRM → Pipeline**
2. Encontre a oportunidade que foi fechada (Ganho/Won)
3. Clique em **🚀 Criar Projeto PPM**
4. Os campos de cliente, BU e revenue são pré-preenchidos
5. Defina datas e confirme

### Opção B: Projeto Manual
1. Clique em **+ Novo Projeto** no canto superior direito do Portfolio
2. Preencha: nome, BU, tipo, datas, budget e revenue
3. Clique em **Salvar**

---

## 4. Detalhe do Projeto (`/awq/ppm/[id]`)

Ao clicar em um projeto, você vê:

- **Barra de fase:** Iniciação → Planejamento → Execução → Monitoramento → Encerramento
- **Financeiro:** Budget vs Real, Revenue, Margem, Custo acumulado
- **Progresso:** % de conclusão baseado nas tarefas
- **Gantt:** Visualização de timeline das tarefas com barras coloridas
- **Milestones:** Marcos do projeto com status (pending/achieved/missed)
- **Tarefas:** Lista com status e responsável
- **Time alocado:** Quem está trabalhando e qual % de capacidade
- **Riscos:** Registro de riscos com score e plano de mitigação
- **Issues:** Problemas abertos que impactam o projeto

---

## 5. Gestão de Tarefas — Kanban (`/awq/ppm/tasks`)

Visualização Kanban com 4 colunas:
- **A Fazer** → **Em Andamento** → **Bloqueado** → **Concluído**

Cada card mostra: nome da tarefa, projeto, responsável, data limite, horas estimadas/reais.

Mover tarefas: clique nos botões "→ [status]" no rodapé do card.

---

## 6. Gantt Timeline (`/awq/ppm/gantt`)

Visualização de linha do tempo de todas as tarefas de todos os projetos ativos.

- **Verde:** Tarefas concluídas
- **Azul:** Em andamento
- **Vermelho:** Bloqueadas
- **Cinza:** Não iniciadas

---

## 7. Timesheets — Apontamento de Horas (`/awq/ppm/timesheets`)

### Como lançar horas (Danilo / freelancers):
1. Clique em **+ Apontamento**
2. Selecione: Projeto, Tarefa (opcional), Data, Horas
3. Marque se é **Billable** (cliente paga) ou não
4. Adicione descrição do trabalho
5. Clique em **Salvar**

### Como aprovar horas (Miguel):
1. Timesheets com status **Enviado** aparecem com botão **Aprovar**
2. Ao aprovar, o custo real do projeto é automaticamente atualizado
3. Filtros disponíveis: por projeto, status, período

### Status dos timesheets:
- 🔵 **Rascunho** — salvo mas não enviado
- 🟡 **Enviado** — aguardando aprovação
- 🟢 **Aprovado** — custo contabilizado no projeto
- 🔴 **Rejeitado** — devolvido para correção

---

## 8. Recursos e Alocação (`/awq/ppm/resources`)

Mostra todos os recursos (funcionários + freelancers) e suas alocações.

Para cada recurso:
- Nome, função principal, BU
- Projetos em que está alocado
- % de capacidade total utilizada
- Datas de início/fim de cada alocação

### Adicionar alocação:
1. Clique em **+ Alocar Recurso**
2. Selecione: Recurso, Projeto, % de alocação, Período
3. Confirme

---

## 9. Dashboard de Utilização (`/awq/ppm/utilization`)

Visão rápida de capacidade da equipe:

- **🔴 Sobrecarregado** — mais de 100% alocado
- **🟡 Totalmente alocado** — 90–100%
- **🟢 Bem utilizado** — 70–90%
- **⚪ Subutilizado** — abaixo de 70%

Use para decidir se pode aceitar novos projetos ou se precisa contratar freelancer.

---

## 10. Rentabilidade — EVM (`/awq/ppm/profitability`)

Tabela com todos os projetos e métricas de performance:

| Métrica | Interpretação |
|---------|--------------|
| **CPI > 1.0** | Projeto abaixo do orçamento ✓ |
| **CPI < 1.0** | Projeto acima do orçamento ✗ |
| **SPI > 1.0** | Projeto adiantado no cronograma ✓ |
| **SPI < 1.0** | Projeto atrasado ✗ |
| **EAC** | Previsão de custo total ao final |
| **Margem %** | (Revenue − Custo) / Revenue × 100 |

---

## 11. Portfolio Health Report (`/awq/ppm/health`)

Visão consolidada de saúde dos projetos ativos com:
- Cards individuais por projeto com CPI, SPI, margem, dias de atraso
- Filtro por status: Saudável / Em Risco / Crítico
- Barra de proporção visual do portfolio

**Critérios:**
- 🟢 **Saudável:** CPI/SPI ≥ 0.95, sem atraso, dentro do orçamento
- 🟡 **Em Risco:** CPI/SPI entre 0.85–0.95, leve atraso ou -5% budget
- 🔴 **Crítico:** CPI/SPI < 0.85, > 14 dias atraso ou > 15% acima do orçamento

---

## 12. Registro de Riscos (`/awq/ppm/risks`)

Registre riscos identificados com:
- **Score:** Probabilidade × Impacto (1–9)
- **Plano de mitigação:** O que fazer para evitar
- **Plano de contingência:** O que fazer se ocorrer
- **Status:** Identificado → Monitorando → Mitigado → Ocorreu

---

## 13. Fluxo Completo de um Projeto

```
1. OPORTUNIDADE WON (CRM)
   ↓
2. CRIAR PROJETO (PPM) → status: planning
   ↓
3. DEFINIR TASKS E MILESTONES
   ↓
4. ALOCAR RECURSOS (% de capacidade)
   ↓
5. EXECUÇÃO: Equipe lança timesheets → PM aprova
   ↓
6. MILESTONE ALCANÇADO → Emitir invoice (EPM/AR)
   ↓
7. PROJETO CONCLUÍDO → status: completed
   ↓
8. ANÁLISE: EVM, margem final, lições aprendidas
```

---

## 14. Atalhos Úteis

| Ação | Caminho |
|------|---------|
| Ver todos os projetos | `/awq/ppm` |
| Criar projeto | `/awq/ppm/add` |
| Ver kanban de tarefas | `/awq/ppm/tasks` |
| Lançar horas | `/awq/ppm/timesheets` |
| Ver equipe e capacidade | `/awq/ppm/utilization` |
| Verificar saúde do portfolio | `/awq/ppm/health` |
| Analisar rentabilidade EVM | `/awq/ppm/profitability` |
