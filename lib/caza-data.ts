// ─── Caza Vision — Produtora de Conteúdo · AWQ Group ─────────────────────────

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

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export const cazaKpis: CazaKPI[] = [];

// ─── Monthly Revenue (Jan/25 – Mar/26) ────────────────────────────────────────

export const cazaRevenueData: CazaRevenuePoint[] = [];

// ─── Project Type Revenue (34 projetos · R$2.418M total) ─────────────────────

export const projectTypeRevenue: ProjectTypeRevenue[] = [];

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projetos: Projeto[] = [];

// ─── Clients ──────────────────────────────────────────────────────────────────

export const cazaClients: CazaClient[] = [];

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const cazaAlerts: CazaAlert[] = [];
