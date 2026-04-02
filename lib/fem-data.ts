// ─── FEM — Fronteira de Eficiência de Markowitz · AWQ Group ─────────────────
// Mock data e cálculos simplificados para alocação estratégica risco-retorno
// Adaptado ao contexto de holding/control tower da AWQ

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface FemAsset {
  id: string;
  name: string;
  category: string;
  color: string;           // Tailwind bg
  accentColor: string;     // Tailwind text
  expectedReturn: number;  // % anualizado
  volatility: number;      // % desvio-padrão anualizado
  currentWeight: number;   // % alocação atual
  optimalWeight: number;   // % alocação ótima sugerida
}

export interface PortfolioPoint {
  risk: number;
  return: number;
  label?: string;
  type: "frontier" | "current" | "optimal" | "minVar" | "asset";
}

export interface CorrelationEntry {
  asset1: string;
  asset2: string;
  value: number;
}

export interface FemInsight {
  id: string;
  type: "warning" | "opportunity" | "info";
  title: string;
  description: string;
  metric?: string;
}

// ─── Ativos estratégicos da AWQ ──────────────────────────────────────────────

export const femAssets: FemAsset[] = [
  {
    id: "jacqes",
    name: "JACQES",
    category: "Agência · Receita Recorrente",
    color: "bg-brand-600",
    accentColor: "text-brand-600",
    expectedReturn: 21.6,
    volatility: 14.2,
    currentWeight: 28.5,
    optimalWeight: 24.0,
  },
  {
    id: "caza",
    name: "Caza Vision",
    category: "Produtora · Projetos",
    color: "bg-emerald-600",
    accentColor: "text-emerald-600",
    expectedReturn: 35.0,
    volatility: 22.8,
    currentWeight: 14.2,
    optimalWeight: 18.5,
  },
  {
    id: "advisor",
    name: "Advisor",
    category: "Consultoria · Fee-based",
    color: "bg-violet-600",
    accentColor: "text-violet-600",
    expectedReturn: 59.9,
    volatility: 18.5,
    currentWeight: 9.5,
    optimalWeight: 15.0,
  },
  {
    id: "venture",
    name: "AWQ Venture",
    category: "Investimentos · Equity",
    color: "bg-amber-600",
    accentColor: "text-amber-600",
    expectedReturn: 42.0,
    volatility: 48.2,
    currentWeight: 38.0,
    optimalWeight: 28.0,
  },
  {
    id: "enerdy",
    name: "Enerdy",
    category: "Energia · Novo Deal",
    color: "bg-cyan-600",
    accentColor: "text-cyan-600",
    expectedReturn: 28.5,
    volatility: 32.0,
    currentWeight: 4.8,
    optimalWeight: 6.5,
  },
  {
    id: "founder-time",
    name: "Founder Allocation",
    category: "Tempo do Fundador",
    color: "bg-rose-600",
    accentColor: "text-rose-600",
    expectedReturn: 15.0,
    volatility: 8.5,
    currentWeight: 5.0,
    optimalWeight: 8.0,
  },
];

// ─── Matriz de correlação ────────────────────────────────────────────────────
// Simétrica; valores plausíveis para BUs de uma holding

export const correlationMatrix: number[][] = [
  // JACQES  Caza  Advisor  Venture  Enerdy  Founder
  [  1.00,  0.42,   0.35,    0.18,   0.12,   0.55 ], // JACQES
  [  0.42,  1.00,   0.28,    0.22,   0.08,   0.48 ], // Caza
  [  0.35,  0.28,   1.00,    0.15,   0.10,   0.62 ], // Advisor
  [  0.18,  0.22,   0.15,    1.00,   0.45,   0.20 ], // Venture
  [  0.12,  0.08,   0.10,    0.45,   1.00,   0.15 ], // Enerdy
  [  0.55,  0.48,   0.62,    0.20,   0.15,   1.00 ], // Founder
];

// ─── Cálculos de portfólio ───────────────────────────────────────────────────

function portfolioReturn(weights: number[], assets: FemAsset[]): number {
  return weights.reduce((sum, w, i) => sum + w * assets[i].expectedReturn, 0);
}

function portfolioVolatility(weights: number[], assets: FemAsset[]): number {
  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance +=
        weights[i] *
        weights[j] *
        (assets[i].volatility / 100) *
        (assets[j].volatility / 100) *
        correlationMatrix[i][j];
    }
  }
  return Math.sqrt(variance) * 100;
}

// ─── Portfólio atual ─────────────────────────────────────────────────────────

const currentWeights = femAssets.map((a) => a.currentWeight / 100);
const optimalWeights = femAssets.map((a) => a.optimalWeight / 100);

export const currentPortfolio = {
  return: portfolioReturn(currentWeights, femAssets),
  risk: portfolioVolatility(currentWeights, femAssets),
};

export const optimalPortfolio = {
  return: portfolioReturn(optimalWeights, femAssets),
  risk: portfolioVolatility(optimalWeights, femAssets),
};

// ─── Mínima variância (simplificada via grid search) ─────────────────────────

function generateMinVariancePortfolio(): { return: number; risk: number; weights: number[] } {
  // Simplified: bias weights toward low-volatility assets
  const invVol = femAssets.map((a) => 1 / a.volatility);
  const sumInvVol = invVol.reduce((s, v) => s + v, 0);
  const weights = invVol.map((v) => v / sumInvVol);
  return {
    return: portfolioReturn(weights, femAssets),
    risk: portfolioVolatility(weights, femAssets),
    weights,
  };
}

export const minVariancePortfolio = generateMinVariancePortfolio();

// ─── Fronteira eficiente (Monte Carlo simplificado) ──────────────────────────

function generateFrontierPoints(): PortfolioPoint[] {
  const points: PortfolioPoint[] = [];
  const n = femAssets.length;

  // Generate random portfolios
  for (let i = 0; i < 800; i++) {
    const raw = Array.from({ length: n }, () => Math.random());
    const sum = raw.reduce((s, v) => s + v, 0);
    const weights = raw.map((v) => v / sum);

    const ret = portfolioReturn(weights, femAssets);
    const risk = portfolioVolatility(weights, femAssets);

    points.push({ risk, return: ret, type: "frontier" });
  }

  // Filter to approximate efficient frontier (upper envelope)
  points.sort((a, b) => a.risk - b.risk);

  // Bucket by risk and keep max return per bucket
  const bucketSize = 1.0;
  const frontier: PortfolioPoint[] = [];
  const buckets = new Map<number, PortfolioPoint>();

  for (const p of points) {
    const bucket = Math.round(p.risk / bucketSize) * bucketSize;
    const existing = buckets.get(bucket);
    if (!existing || p.return > existing.return) {
      buckets.set(bucket, p);
    }
  }

  const sortedBuckets = Array.from(buckets.entries())
    .sort(([a], [b]) => a - b);

  for (const [, p] of sortedBuckets) {
    frontier.push(p);
  }

  return frontier;
}

export const frontierPoints = generateFrontierPoints();

// ─── Pontos especiais para o gráfico ─────────────────────────────────────────

export const specialPoints: PortfolioPoint[] = [
  {
    risk: currentPortfolio.risk,
    return: currentPortfolio.return,
    label: "Portfolio Atual",
    type: "current",
  },
  {
    risk: optimalPortfolio.risk,
    return: optimalPortfolio.return,
    label: "Portfolio Otimo",
    type: "optimal",
  },
  {
    risk: minVariancePortfolio.risk,
    return: minVariancePortfolio.return,
    label: "Min. Variancia",
    type: "minVar",
  },
  // Individual assets
  ...femAssets.map((a) => ({
    risk: a.volatility,
    return: a.expectedReturn,
    label: a.name,
    type: "asset" as const,
  })),
];

// ─── KPIs calculados ─────────────────────────────────────────────────────────

const riskFreeRate = 10.5; // Selic proxy

export const femKpis = {
  currentReturn: currentPortfolio.return,
  currentRisk: currentPortfolio.risk,
  optimalReturn: optimalPortfolio.return,
  optimalRisk: optimalPortfolio.risk,
  currentSharpe: (currentPortfolio.return - riskFreeRate) / currentPortfolio.risk,
  optimalSharpe: (optimalPortfolio.return - riskFreeRate) / optimalPortfolio.risk,
  efficiencyIndex: (optimalPortfolio.return / optimalPortfolio.risk) / (currentPortfolio.return / currentPortfolio.risk),
  bestRiskReturn: (() => {
    let best = femAssets[0];
    let bestRatio = best.expectedReturn / best.volatility;
    for (const a of femAssets) {
      const ratio = a.expectedReturn / a.volatility;
      if (ratio > bestRatio) {
        best = a;
        bestRatio = ratio;
      }
    }
    return best;
  })(),
  riskFreeRate,
};

// ─── Insights executivos ─────────────────────────────────────────────────────

export const femInsights: FemInsight[] = [
  {
    id: "I1",
    type: "warning",
    title: "Concentração excessiva em AWQ Venture",
    description:
      "38% do capital alocado em Venture, com volatilidade de 48.2%. O portfólio ótimo sugere reduzir para 28%, realocando para ativos com melhor relação risco-retorno ajustado.",
    metric: "38% → 28% sugerido",
  },
  {
    id: "I2",
    type: "opportunity",
    title: "Advisor subponderado vs. eficiência",
    description:
      "Advisor apresenta o melhor Sharpe isolado (2.67x) com apenas 9.5% de alocação. Aumentar para 15% melhora significativamente a eficiência do portfólio consolidado.",
    metric: "Sharpe: 2.67x",
  },
  {
    id: "I3",
    type: "info",
    title: "Correlação alta entre Founder e Advisor",
    description:
      "Correlação de 0.62 entre tempo do fundador e Advisor reduz benefício de diversificação. Considerar delegar mais da operação Advisor para liberar tempo do fundador.",
    metric: "ρ = 0.62",
  },
  {
    id: "I4",
    type: "opportunity",
    title: "Caza Vision com potencial de expansão",
    description:
      "Retorno de 35% com volatilidade moderada (22.8%) e baixa correlação com Venture (0.22). Aumentar alocação de 14.2% para 18.5% melhora diversificação e retorno.",
    metric: "14.2% → 18.5%",
  },
  {
    id: "I5",
    type: "warning",
    title: "Enerdy: risco desproporcional ao retorno",
    description:
      "Volatilidade de 32% para retorno esperado de 28.5% resulta em Sharpe de 0.56. Manter exposição controlada (6.5%) até comprovação de tese operacional.",
    metric: "Sharpe: 0.56",
  },
  {
    id: "I6",
    type: "info",
    title: "Ganho de eficiência na fronteira",
    description:
      `O portfólio ótimo entrega +${(optimalPortfolio.return - currentPortfolio.return).toFixed(1)}pp de retorno com ${(currentPortfolio.risk - optimalPortfolio.risk).toFixed(1)}pp menos risco. A migração gradual pode ser implementada em 2–3 trimestres.`,
    metric: "Sharpe atual → ótimo",
  },
];

// ─── Dados de correlação para heatmap ────────────────────────────────────────

export function getCorrelationPairs(): CorrelationEntry[] {
  const pairs: CorrelationEntry[] = [];
  for (let i = 0; i < femAssets.length; i++) {
    for (let j = 0; j < femAssets.length; j++) {
      pairs.push({
        asset1: femAssets[i].id,
        asset2: femAssets[j].id,
        value: correlationMatrix[i][j],
      });
    }
  }
  return pairs;
}
