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

export const cazaKpis: CazaKPI[] = [
  { id: "projetos", label: "Projetos Ativos",    value: 23,        previousValue: 18,        unit: "number",   icon: "Building2",     color: "emerald" },
  { id: "receita",  label: "Receita YTD",        value: 2_418_000, previousValue: 1_950_000, unit: "currency", icon: "DollarSign",    color: "brand"   },
  { id: "entregues",label: "Projetos Entregues", value: 34,        previousValue: 28,        unit: "number",   icon: "HandshakeIcon", color: "violet"  },
  { id: "ticket",   label: "Ticket Médio",       value: 71_118,    previousValue: 69_643,    unit: "currency", icon: "TrendingUp",    color: "amber"   },
];

// ─── Monthly Revenue (Jan/25 – Mar/26) ────────────────────────────────────────

export const cazaRevenueData: CazaRevenuePoint[] = [
  { month: "Jan/25", receita: 145_000, expenses:  62_000, profit:  83_000, orcamento:  3_200_000 },
  { month: "Fev/25", receita: 158_000, expenses:  67_000, profit:  91_000, orcamento:  3_480_000 },
  { month: "Mar/25", receita: 172_000, expenses:  71_000, profit: 101_000, orcamento:  3_810_000 },
  { month: "Abr/25", receita: 161_000, expenses:  68_000, profit:  93_000, orcamento:  3_560_000 },
  { month: "Mai/25", receita: 189_000, expenses:  78_000, profit: 111_000, orcamento:  4_180_000 },
  { month: "Jun/25", receita: 203_000, expenses:  84_000, profit: 119_000, orcamento:  4_480_000 },
  { month: "Jul/25", receita: 217_000, expenses:  89_000, profit: 128_000, orcamento:  4_800_000 },
  { month: "Ago/25", receita: 224_000, expenses:  92_000, profit: 132_000, orcamento:  4_950_000 },
  { month: "Set/25", receita: 238_000, expenses:  97_000, profit: 141_000, orcamento:  5_260_000 },
  { month: "Out/25", receita: 245_000, expenses:  99_000, profit: 146_000, orcamento:  5_410_000 },
  { month: "Nov/25", receita: 251_000, expenses: 102_000, profit: 149_000, orcamento:  5_540_000 },
  { month: "Dez/25", receita: 268_000, expenses: 108_000, profit: 160_000, orcamento:  5_920_000 },
  { month: "Jan/26", receita: 712_000, expenses: 204_000, profit: 508_000, orcamento: 15_800_000 },
  { month: "Fev/26", receita: 798_000, expenses: 228_000, profit: 570_000, orcamento: 17_640_000 },
  { month: "Mar/26", receita: 908_000, expenses: 256_000, profit: 652_000, orcamento: 20_100_000 },
];

// ─── Project Type Revenue (34 projetos · R$2.418M total) ─────────────────────

export const projectTypeRevenue: ProjectTypeRevenue[] = [
  { type: "Vídeo Publicitário",  projetos: 14, receita: 980_000, avgValue:  70_000 },
  { type: "Filme Institucional", projetos:  8, receita: 720_000, avgValue:  90_000 },
  { type: "Evento / Live",       projetos:  5, receita: 350_000, avgValue:  70_000 },
  { type: "Conteúdo Digital",    projetos:  5, receita: 240_000, avgValue:  48_000 },
  { type: "Fotografia",          projetos:  2, receita: 128_000, avgValue:  64_000 },
];

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projetos: Projeto[] = [
  { id: "CV001", titulo: "Campanha Verão 2026",          cliente: "Nike Brasil",   tipo: "Vídeo Publicitário",  status: "Entregue",             valor: 180_000, prazo: "2026-03-01", diretor: "Ana Ferreira",  inicio: "2026-01-15" },
  { id: "CV002", titulo: "Filme Institucional 2026",     cliente: "Banco XP",      tipo: "Filme Institucional", status: "Aguardando Aprovação",  valor: 320_000, prazo: "2026-04-10", diretor: "Rafael Souza",  inicio: "2026-02-14" },
  { id: "CV003", titulo: "Lançamento Produto Q1",        cliente: "Samsung Brasil", tipo: "Vídeo Publicitário",  status: "Entregue",             valor: 210_000, prazo: "2026-03-20", diretor: "Ana Ferreira",  inicio: "2026-01-20" },
  { id: "CV004", titulo: "Série de Conteúdo — Redes",   cliente: "iFood",          tipo: "Conteúdo Digital",    status: "Em Produção",          valor:  95_000, prazo: "2026-04-30", diretor: "Carlos Lima",   inicio: "2026-03-10" },
  { id: "CV005", titulo: "Evento de Lançamento",         cliente: "Ambev",          tipo: "Evento / Live",       status: "Em Produção",          valor: 480_000, prazo: "2026-04-25", diretor: "Rafael Souza",  inicio: "2026-02-28" },
  { id: "CV006", titulo: "Campanha Ensaio Editorial",    cliente: "Arezzo",         tipo: "Fotografia",          status: "Em Edição",            valor:  64_000, prazo: "2026-04-05", diretor: "Mariana Costa", inicio: "2026-03-05" },
  { id: "CV007", titulo: "Brand Film Sustentabilidade",  cliente: "Natura",         tipo: "Filme Institucional", status: "Em Produção",          valor: 390_000, prazo: "2026-05-15", diretor: "Carlos Lima",   inicio: "2026-03-18" },
  { id: "CV008", titulo: "Campanha Digital Awareness",   cliente: "Nubank",         tipo: "Conteúdo Digital",    status: "Em Edição",            valor: 145_000, prazo: "2026-04-08", diretor: "Mariana Costa", inicio: "2026-03-22" },
];

// ─── Clients ──────────────────────────────────────────────────────────────────

export const cazaClients: CazaClient[] = [
  { id: "CL001", name: "Roberto Alves",    email: "r.alves@nikebrasil.com",    phone: "+55 11 99201-4821", type: "Marca",   budget_anual: 2_500_000, status: "Ativo",      segmento: "Esporte & Lifestyle",       since: "2026-01-15" },
  { id: "CL002", name: "Patricia Mendes",  email: "patricia.m@bancoxp.com.br", phone: "+55 11 98732-6610", type: "Empresa", budget_anual: 4_000_000, status: "Em Proposta",segmento: "Finanças",                  since: "2025-11-20" },
  { id: "CL003", name: "Fernando Costa",   email: "fcosta@agenciaray.com",     phone: "+55 11 97654-3210", type: "Agência", budget_anual: 1_200_000, status: "Convertido", segmento: "Publicidade",               since: "2026-01-20" },
  { id: "CL004", name: "Juliana Rocha",    email: "juliana@ifood.com.br",      phone: "+55 11 94512-8830", type: "Marca",   budget_anual:   800_000, status: "Ativo",      segmento: "Food & Tech",               since: "2026-03-05" },
  { id: "CL005", name: "Marcos Tavares",   email: "mtavares@ambev.com",        phone: "+55 11 93301-2245", type: "Empresa", budget_anual: 6_000_000, status: "Ativo",      segmento: "Bebidas & FMCG",            since: "2025-09-10" },
  { id: "CL006", name: "Camila Nogueira",  email: "camila.n@arezzo.com.br",    phone: "+55 11 99820-5571", type: "Marca",   budget_anual:   600_000, status: "Ativo",      segmento: "Moda & Varejo",             since: "2026-02-28" },
  { id: "CL007", name: "Thiago Barbosa",   email: "thiago.b@startupxyz.com",   phone: "+55 11 98110-7734", type: "Startup", budget_anual:   150_000, status: "Perdido",    segmento: "Tecnologia",                since: "2025-12-01" },
  { id: "CL008", name: "Larissa Nunes",    email: "lnunes@natura.net",         phone: "+55 11 97223-4499", type: "Marca",   budget_anual: 3_500_000, status: "Ativo",      segmento: "Beleza & Sustentabilidade", since: "2026-03-12" },
  { id: "CL009", name: "AVVA", email: "contato@avva.com.br", phone: "+55 11 99000-4488", type: "Marca", budget_anual: 1_500_000, status: "Ativo", segmento: "Marketing Digital", since: "2026-03-31" },
];

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const cazaAlerts: CazaAlert[] = [
  { id: "CA1", type: "success", title: "Meta de Receita Atingida",  message: "Receita de Mar/26 superou a meta em 12.3% — R$908K vs R$808K projetado.",              timestamp: "2026-03-26T09:00:00Z" },
  { id: "CA2", type: "info",    title: "5 Novos Briefings",         message: "5 briefings de marcas nacionais entraram no pipeline de propostas.",                  timestamp: "2026-03-25T14:30:00Z" },
  { id: "CA3", type: "warning", title: "CV002 aguardando aprovação",message: "Filme institucional Banco XP sem feedback há 8 dias — prazo em risco.",               timestamp: "2026-03-24T10:00:00Z" },
  { id: "CA4", type: "success", title: "Entrega — CV003 Samsung",   message: "Campanha de lançamento Samsung entregue com aprovação imediata. R$210K.",             timestamp: "2026-03-22T16:00:00Z" },
];
