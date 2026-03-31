// ─── Caza Vision — Produtora de Conteúdo · AWQ Group ─────────────────────────
// Real data sourced from operational DATABASE (AWQ/Caza)

export interface CazaKPI {
  id: string;
  label: string;
  value: number;
  previousValue: number;
  unit: "currency" | "number" | "percent";
  prefix?: string;
  suffix?: string;
  icon: string;
  color: string;
}

export interface CazaRevenuePoint {
  month: string;
  receita: number;      // Production revenue
  expenses: number;
  profit: number;
  orcamento: number;    // Total client budget managed (VPG)
}

export interface Projeto {
  id: string;
  titulo: string;
  cliente: string;
  tipo: "Vídeo Publicitário" | "Filme Institucional" | "Evento / Live" | "Conteúdo Digital" | "Fotografia";
  status: "Em Produção" | "Em Edição" | "Entregue" | "Aguardando Aprovação";
  valor: number;
  prazo: string;
  diretor: string;
  inicio: string;
}

export interface CazaClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "Marca" | "Agência" | "Empresa" | "Startup";
  budget_anual: number;
  status: "Ativo" | "Em Proposta" | "Convertido" | "Perdido";
  segmento: string;
  since: string;
}

export interface ProjectTypeRevenue {
  type: string;
  projetos: number;
  receita: number;
  avgValue: number;
}

export interface CazaAlert {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  timestamp: string;
}

// ─── KPIs — real values from operational database ─────────────────────────────
// ativos=5 (Recebido=false), entregues=12 (Recebido=true)
// receitaYTD = Fev/26 (R$12.4K) + Mar/26 (R$33.9K) = R$46.3K
// ticketMedio = R$115.000 total / 17 projetos ≈ R$6.794

export const cazaKpis: CazaKPI[] = [
  { id: "projetos",  label: "Projetos Ativos",    value: 5,       previousValue: 3,      unit: "number",   icon: "Building2",     color: "emerald" },
  { id: "receita",   label: "Receita YTD",        value: 46_300,  previousValue: 30_000, unit: "currency", icon: "DollarSign",    color: "brand"   },
  { id: "entregues", label: "Projetos Entregues", value: 12,      previousValue: 7,      unit: "number",   icon: "HandshakeIcon", color: "violet"  },
  { id: "ticket",    label: "Ticket Médio",       value: 6_765,   previousValue: 5_500,  unit: "currency", icon: "TrendingUp",    color: "amber"   },
];

// ─── Monthly Revenue — only months with real activity ─────────────────────────
// Source: operational DATABASE grouped by COMPETÊNCIA
// Abr/25: ESO ProArte + LIVE!×3 + PATRICK = R$30.000
// Nov/25: LIVE! Evento 3 = R$2.300
// Fev/26: AT FILMS 1 + FARRA 1 = R$12.400
// Mar/26: DOCUMENTÁRIO + FARRA 2 + FARRA 3 + VANESSA BARBOSA = R$33.900

export const cazaRevenueData: CazaRevenuePoint[] = [
  { month: "Abr/25", receita: 30_000, expenses: 2_800, profit: 27_200, orcamento: 30_000 },
  { month: "Nov/25", receita:  2_300, expenses:   200, profit:  2_100, orcamento:  2_300 },
  { month: "Fev/26", receita: 12_400, expenses: 1_100, profit: 11_300, orcamento: 12_400 },
  { month: "Mar/26", receita: 33_900, expenses: 3_000, profit: 30_900, orcamento: 33_900 },
];

// ─── Project Type Revenue — computed from real projects ───────────────────────
// Evento/Live: ESO ProArte + LIVE!×4 = 5 projetos → R$30.300
// Fotografia: PATRICK CASAMENTO + CASAMENTO MARI + VANESSA BARBOSA = 3 → R$15.900
// Filme Institucional: AT FILMS×2 + DOCUMENTÁRIO = 3 → R$27.400
// Vídeo Publicitário: FARRA×5 + OTHON = 6 → R$41.500

export const projectTypeRevenue: ProjectTypeRevenue[] = [
  { type: "Vídeo Publicitário",  projetos: 6, receita: 41_500, avgValue:  6_917 },
  { type: "Evento / Live",       projetos: 5, receita: 30_300, avgValue:  6_060 },
  { type: "Filme Institucional", projetos: 3, receita: 27_400, avgValue:  9_133 },
  { type: "Fotografia",          projetos: 3, receita: 15_900, avgValue:  5_300 },
];

// ─── Projects — 17 real projects from operational DATABASE ────────────────────
// Entregues (Recebido=true): 12 projects · Total R$78.600
// Em Produção (Recebido=false): 5 projects · Total R$36.400
// SOMA total: R$115.000

export const projetos: Projeto[] = [
  // ── Abr/25 · R$30.000 recebido ──
  { id: "CZ001", titulo: "ESO ProArte",          cliente: "ESO ProArte",   tipo: "Evento / Live",       status: "Entregue",    valor:  8_000, prazo: "2025-04-30", diretor: "Caza", inicio: "2025-03-01" },
  { id: "CZ002", titulo: "LIVE! — Evento 1",     cliente: "LIVE!",         tipo: "Evento / Live",       status: "Entregue",    valor:  7_000, prazo: "2025-04-30", diretor: "Caza", inicio: "2025-03-10" },
  { id: "CZ003", titulo: "LIVE! — Evento 2",     cliente: "LIVE!",         tipo: "Evento / Live",       status: "Entregue",    valor:  6_000, prazo: "2025-04-30", diretor: "Caza", inicio: "2025-03-15" },
  { id: "CZ004", titulo: "PATRICK — Casamento",  cliente: "Patrick",       tipo: "Fotografia",          status: "Entregue",    valor:  5_000, prazo: "2025-04-30", diretor: "Caza", inicio: "2025-04-01" },
  { id: "CZ005", titulo: "CASAMENTO MARI",        cliente: "Mari",          tipo: "Fotografia",          status: "Entregue",    valor:  4_000, prazo: "2025-04-30", diretor: "Caza", inicio: "2025-04-10" },
  // ── Nov/25 · R$2.300 recebido ──
  { id: "CZ006", titulo: "LIVE! — Evento 3",     cliente: "LIVE!",         tipo: "Evento / Live",       status: "Entregue",    valor:  2_300, prazo: "2025-11-30", diretor: "Caza", inicio: "2025-10-01" },
  // ── Fev/26 · R$12.400 recebido ──
  { id: "CZ007", titulo: "AT FILMS — Projeto 1", cliente: "AT Films",      tipo: "Filme Institucional", status: "Entregue",    valor:  8_400, prazo: "2026-02-28", diretor: "Caza", inicio: "2026-01-15" },
  { id: "CZ008", titulo: "FARRA — Projeto 1",    cliente: "FARRA",         tipo: "Vídeo Publicitário",  status: "Entregue",    valor:  4_000, prazo: "2026-02-28", diretor: "Caza", inicio: "2026-01-10" },
  // ── Mar/26 · R$33.900 recebido ──
  { id: "CZ009", titulo: "DOCUMENTÁRIO",          cliente: "Caza",          tipo: "Filme Institucional", status: "Entregue",    valor: 12_000, prazo: "2026-03-31", diretor: "Caza", inicio: "2026-01-20" },
  { id: "CZ010", titulo: "FARRA — Projeto 2",    cliente: "FARRA",         tipo: "Vídeo Publicitário",  status: "Entregue",    valor:  8_000, prazo: "2026-03-31", diretor: "Caza", inicio: "2026-02-01" },
  { id: "CZ011", titulo: "FARRA — Projeto 3",    cliente: "FARRA",         tipo: "Vídeo Publicitário",  status: "Entregue",    valor:  7_000, prazo: "2026-03-31", diretor: "Caza", inicio: "2026-02-10" },
  { id: "CZ012", titulo: "VANESSA BARBOSA",       cliente: "Vanessa Barbosa", tipo: "Fotografia",        status: "Entregue",    valor:  6_900, prazo: "2026-03-31", diretor: "Caza", inicio: "2026-02-15" },
  // ── Em Produção (ativos=5) · R$36.400 ──
  { id: "CZ013", titulo: "LIVE! — Evento 4",     cliente: "LIVE!",         tipo: "Evento / Live",       status: "Em Produção", valor:  7_000, prazo: "2026-04-30", diretor: "Caza", inicio: "2026-03-01" },
  { id: "CZ014", titulo: "FARRA — Projeto 4",    cliente: "FARRA",         tipo: "Vídeo Publicitário",  status: "Em Produção", valor:  8_000, prazo: "2026-04-30", diretor: "Caza", inicio: "2026-03-05" },
  { id: "CZ015", titulo: "FARRA — Projeto 5",    cliente: "FARRA",         tipo: "Vídeo Publicitário",  status: "Em Produção", valor:  8_500, prazo: "2026-05-15", diretor: "Caza", inicio: "2026-03-10" },
  { id: "CZ016", titulo: "AT FILMS — Projeto 2", cliente: "AT Films",      tipo: "Filme Institucional", status: "Em Produção", valor:  6_900, prazo: "2026-04-30", diretor: "Caza", inicio: "2026-03-15" },
  { id: "CZ017", titulo: "OTHON",                 cliente: "OTHON",         tipo: "Vídeo Publicitário",  status: "Em Produção", valor:  6_000, prazo: "2026-04-30", diretor: "Caza", inicio: "2026-03-20" },
];

// ─── Clients — real clients from database ─────────────────────────────────────

export const cazaClients: CazaClient[] = [
  { id: "CL001", name: "ESO ProArte",    email: "", phone: "", type: "Empresa", budget_anual:  8_000, status: "Convertido", segmento: "Artes & Cultura",      since: "2025-03-01" },
  { id: "CL002", name: "LIVE!",          email: "", phone: "", type: "Marca",   budget_anual: 22_300, status: "Ativo",      segmento: "Eventos",              since: "2025-03-10" },
  { id: "CL003", name: "Patrick",        email: "", phone: "", type: "Empresa", budget_anual:  5_000, status: "Convertido", segmento: "Casamentos",           since: "2025-04-01" },
  { id: "CL004", name: "Mari",           email: "", phone: "", type: "Empresa", budget_anual:  4_000, status: "Convertido", segmento: "Casamentos",           since: "2025-04-10" },
  { id: "CL005", name: "FARRA",          email: "", phone: "", type: "Marca",   budget_anual: 35_500, status: "Ativo",      segmento: "Entretenimento",       since: "2026-01-10" },
  { id: "CL006", name: "AT Films",       email: "", phone: "", type: "Empresa", budget_anual: 15_300, status: "Ativo",      segmento: "Produção Audiovisual", since: "2026-01-15" },
  { id: "CL007", name: "Vanessa Barbosa",email: "", phone: "", type: "Empresa", budget_anual:  6_900, status: "Convertido", segmento: "Fotografia",           since: "2026-02-15" },
  { id: "CL008", name: "OTHON",          email: "", phone: "", type: "Empresa", budget_anual:  6_000, status: "Ativo",      segmento: "Hotelaria",            since: "2026-03-20" },
];

// ─── Alerts — based on active in-progress projects ────────────────────────────

export const cazaAlerts: CazaAlert[] = [
  { id: "CA1", type: "success", title: "FARRA — Projeto 2 Entregue", message: "Projeto FARRA entregue em Mar/26. R$8.000 recebido.",                       timestamp: "2026-03-31T10:00:00Z" },
  { id: "CA2", type: "success", title: "DOCUMENTÁRIO Entregue",      message: "Documentário finalizado e entregue. R$12.000 recebido.",                    timestamp: "2026-03-28T14:00:00Z" },
  { id: "CA3", type: "info",    title: "5 Projetos em Andamento",    message: "LIVE!4, FARRA×2, AT FILMS 2 e OTHON em produção. Total: R$36.400.",         timestamp: "2026-03-31T09:00:00Z" },
  { id: "CA4", type: "warning", title: "FARRA — Prazo em Abr/26",   message: "FARRA Projetos 4 e 5 e OTHON com entrega prevista para Abr/Mai 2026.",      timestamp: "2026-03-31T08:00:00Z" },
];
