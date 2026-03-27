// ─── Caza Vision — Proptech / Real Estate Intelligence ────────────────────────

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
  gci: number;       // Gross Commission Income
  expenses: number;
  profit: number;
  volume: number;    // total transaction volume
}

export interface PropertyListing {
  id: string;
  address: string;
  neighborhood: string;
  type: "Residencial" | "Comercial" | "Terreno";
  status: "Disponível" | "Em Negociação" | "Vendido" | "Alugado";
  price: number;
  area: number;      // m²
  agent: string;
  listedAt: string;
}

export interface CazaClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "Comprador" | "Vendedor" | "Investidor" | "Locatário";
  budget: number;
  status: "Ativo" | "Em Negociação" | "Convertido" | "Perdido";
  city: string;
  since: string;
}

export interface PropertyTypeRevenue {
  type: string;
  transactions: number;
  volume: number;
  gci: number;
  avgPrice: number;
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
  {
    id: "listings",
    label: "Imóveis Ativos",
    value: 87,
    previousValue: 71,
    unit: "number",
    icon: "Building2",
    color: "emerald",
  },
  {
    id: "gci",
    label: "GCI YTD",
    value: 2_418_000,
    previousValue: 1_950_000,
    unit: "currency",
    icon: "DollarSign",
    color: "brand",
  },
  {
    id: "transactions",
    label: "Transações Fechadas",
    value: 34,
    previousValue: 28,
    unit: "number",
    icon: "HandshakeIcon",
    color: "violet",
  },
  {
    id: "avg_price",
    label: "Preço Médio de Venda",
    value: 487_000,
    previousValue: 462_000,
    unit: "currency",
    icon: "TrendingUp",
    color: "amber",
  },
];

// ─── Monthly GCI (Jan–Mar 2026 YTD, 2025 full year) ──────────────────────────

export const cazaRevenueData: CazaRevenuePoint[] = [
  { month: "Jan/25", gci: 145_000, expenses: 62_000, profit: 83_000,  volume: 3_200_000 },
  { month: "Fev/25", gci: 158_000, expenses: 67_000, profit: 91_000,  volume: 3_480_000 },
  { month: "Mar/25", gci: 172_000, expenses: 71_000, profit: 101_000, volume: 3_810_000 },
  { month: "Abr/25", gci: 161_000, expenses: 68_000, profit: 93_000,  volume: 3_560_000 },
  { month: "Mai/25", gci: 189_000, expenses: 78_000, profit: 111_000, volume: 4_180_000 },
  { month: "Jun/25", gci: 203_000, expenses: 84_000, profit: 119_000, volume: 4_480_000 },
  { month: "Jul/25", gci: 217_000, expenses: 89_000, profit: 128_000, volume: 4_800_000 },
  { month: "Ago/25", gci: 224_000, expenses: 92_000, profit: 132_000, volume: 4_950_000 },
  { month: "Set/25", gci: 238_000, expenses: 97_000, profit: 141_000, volume: 5_260_000 },
  { month: "Out/25", gci: 245_000, expenses: 99_000, profit: 146_000, volume: 5_410_000 },
  { month: "Nov/25", gci: 251_000, expenses: 102_000, profit: 149_000, volume: 5_540_000 },
  { month: "Dez/25", gci: 268_000, expenses: 108_000, profit: 160_000, volume: 5_920_000 },
  { month: "Jan/26", gci: 712_000, expenses: 204_000, profit: 508_000, volume: 15_800_000 },
  { month: "Fev/26", gci: 798_000, expenses: 228_000, profit: 570_000, volume: 17_640_000 },
  { month: "Mar/26", gci: 908_000, expenses: 256_000, profit: 652_000, volume: 20_100_000 },
];

// ─── Property Type Revenue Breakdown ─────────────────────────────────────────

export const propertyTypeRevenue: PropertyTypeRevenue[] = [
  { type: "Residencial — Casa",       transactions: 14, volume: 8_420_000,  gci: 252_600, avgPrice: 601_429 },
  { type: "Residencial — Apartamento",transactions: 11, volume: 6_380_000,  gci: 191_400, avgPrice: 580_000 },
  { type: "Comercial — Loja/Sala",    transactions: 5,  volume: 4_950_000,  gci: 198_000, avgPrice: 990_000 },
  { type: "Terreno",                  transactions: 3,  volume: 2_700_000,  gci: 108_000, avgPrice: 900_000 },
  { type: "Locação",                  transactions: 1,  volume: 1_130_000,  gci: 113_000, avgPrice: 1_130_000 },
];

// ─── Property Listings ────────────────────────────────────────────────────────

export const propertyListings: PropertyListing[] = [
  {
    id: "CV001",
    address: "Rua das Palmeiras, 145 — Apto 82",
    neighborhood: "Moema",
    type: "Residencial",
    status: "Disponível",
    price: 1_280_000,
    area: 118,
    agent: "Ana Ferreira",
    listedAt: "2026-03-01",
  },
  {
    id: "CV002",
    address: "Av. Brigadeiro Faria Lima, 3900 — Sala 214",
    neighborhood: "Itaim Bibi",
    type: "Comercial",
    status: "Em Negociação",
    price: 2_450_000,
    area: 87,
    agent: "Rafael Souza",
    listedAt: "2026-02-14",
  },
  {
    id: "CV003",
    address: "Rua Haddock Lobo, 595 — Casa",
    neighborhood: "Cerqueira César",
    type: "Residencial",
    status: "Vendido",
    price: 3_100_000,
    area: 320,
    agent: "Ana Ferreira",
    listedAt: "2026-01-20",
  },
  {
    id: "CV004",
    address: "Alameda Santos, 811 — Apto 71",
    neighborhood: "Jardim Paulista",
    type: "Residencial",
    status: "Disponível",
    price: 890_000,
    area: 72,
    agent: "Carlos Lima",
    listedAt: "2026-03-10",
  },
  {
    id: "CV005",
    address: "Rua Funchal, 418 — Lote 7",
    neighborhood: "Vila Olímpia",
    type: "Terreno",
    status: "Em Negociação",
    price: 4_800_000,
    area: 600,
    agent: "Rafael Souza",
    listedAt: "2026-02-28",
  },
  {
    id: "CV006",
    address: "Al. Lorena, 1304 — Apto 31",
    neighborhood: "Jardins",
    type: "Residencial",
    status: "Alugado",
    price: 12_000,
    area: 95,
    agent: "Mariana Costa",
    listedAt: "2026-03-05",
  },
  {
    id: "CV007",
    address: "Rua Pedroso Alvarenga, 1201 — Casa",
    neighborhood: "Alto de Pinheiros",
    type: "Residencial",
    status: "Disponível",
    price: 5_200_000,
    area: 480,
    agent: "Carlos Lima",
    listedAt: "2026-03-18",
  },
  {
    id: "CV008",
    address: "Av. Paulista, 2064 — Sala 142",
    neighborhood: "Bela Vista",
    type: "Comercial",
    status: "Disponível",
    price: 1_650_000,
    area: 64,
    agent: "Mariana Costa",
    listedAt: "2026-03-22",
  },
];

// ─── Clients ─────────────────────────────────────────────────────────────────

export const cazaClients: CazaClient[] = [
  {
    id: "CL001",
    name: "Roberto Alves",
    email: "r.alves@email.com",
    phone: "+55 11 99201-4821",
    type: "Comprador",
    budget: 2_500_000,
    status: "Em Negociação",
    city: "São Paulo",
    since: "2026-01-15",
  },
  {
    id: "CL002",
    name: "Patricia Mendes",
    email: "patricia.m@corp.com.br",
    phone: "+55 11 98732-6610",
    type: "Investidor",
    budget: 8_000_000,
    status: "Ativo",
    city: "São Paulo",
    since: "2025-11-20",
  },
  {
    id: "CL003",
    name: "Fernando Costa",
    email: "fercosta@gmail.com",
    phone: "+55 11 97654-3210",
    type: "Vendedor",
    budget: 0,
    status: "Convertido",
    city: "São Paulo",
    since: "2026-01-20",
  },
  {
    id: "CL004",
    name: "Juliana Rocha",
    email: "juliana.rocha@startup.io",
    phone: "+55 11 94512-8830",
    type: "Locatário",
    budget: 15_000,
    status: "Em Negociação",
    city: "São Paulo",
    since: "2026-03-05",
  },
  {
    id: "CL005",
    name: "Marcos Tavares",
    email: "mtavares@holding.com",
    phone: "+55 11 93301-2245",
    type: "Investidor",
    budget: 15_000_000,
    status: "Ativo",
    city: "São Paulo",
    since: "2025-09-10",
  },
  {
    id: "CL006",
    name: "Camila Nogueira",
    email: "camila.n@email.com",
    phone: "+55 11 99820-5571",
    type: "Comprador",
    budget: 900_000,
    status: "Ativo",
    city: "São Paulo",
    since: "2026-02-28",
  },
  {
    id: "CL007",
    name: "Thiago Barbosa",
    email: "thiago.b@empresa.com",
    phone: "+55 11 98110-7734",
    type: "Vendedor",
    budget: 0,
    status: "Perdido",
    city: "Campinas",
    since: "2025-12-01",
  },
  {
    id: "CL008",
    name: "Larissa Nunes",
    email: "lnunes@fundo.com.br",
    phone: "+55 11 97223-4499",
    type: "Investidor",
    budget: 5_000_000,
    status: "Ativo",
    city: "São Paulo",
    since: "2026-03-12",
  },
];

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const cazaAlerts: CazaAlert[] = [
  {
    id: "CA1",
    type: "success",
    title: "Meta de GCI Atingida",
    message: "GCI de Marco/26 superou a meta em 12.3% — R$908K vs R$808K projetado.",
    timestamp: "2026-03-26T09:00:00Z",
  },
  {
    id: "CA2",
    type: "info",
    title: "5 Novos Leads — Faria Lima",
    message: "5 leads qualificados para salas comerciais na Faria Lima entraram no pipeline.",
    timestamp: "2026-03-25T14:30:00Z",
  },
  {
    id: "CA3",
    type: "warning",
    title: "Imóvel CV002 sem resposta",
    message: "Negociação do CV002 (Faria Lima) sem movimentação há 8 dias.",
    timestamp: "2026-03-24T10:00:00Z",
  },
  {
    id: "CA4",
    type: "success",
    title: "Transação Fechada — CV003",
    message: "Venda da casa na Rua Haddock Lobo concluída. GCI: R$93K.",
    timestamp: "2026-03-22T16:00:00Z",
  },
];
