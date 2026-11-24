import type { AssetClass, MacroScenarioImpact, PortfolioMetrics, PortfolioPoint, RebalanceSummary } from "@/types/quant";
import { evaluateWeights } from "./markowitz";
import { getReturnsMatrix, MARKET_UNIVERSE } from "@/data/market-universe";

export function calculateRebalance(options: {
  assets?: AssetClass[];
  currentWeights: Record<string, number>;
  optimal: PortfolioPoint;
  portfolioValueIdr: number;
  riskFreeRate?: number;
}): RebalanceSummary {
  const assets = options.assets ?? MARKET_UNIVERSE;
  const returns = getReturnsMatrix(assets);
  const rawCurrent = assets.map((asset) => Math.max(0, options.currentWeights[asset.id] ?? 0));
  const totalCurrent = rawCurrent.reduce((sum, value) => sum + value, 0);
  const currentWeights = rawCurrent.map((value) => totalCurrent > 0 ? value / totalCurrent : 0);
  const currentMap = Object.fromEntries(assets.map((asset, index) => [asset.id, currentWeights[index]]));
  const currentPoint = evaluateWeights(currentMap, assets, returns, options.riskFreeRate ?? 0.0625);
  const instructions = assets.map((asset) => {
    const currentWeight = currentMap[asset.id] ?? 0;
    const targetWeight = options.optimal.weights[asset.id] ?? 0;
    const deltaWeight = targetWeight - currentWeight;
    const deltaAmountIdr = deltaWeight * Math.max(0, options.portfolioValueIdr);
    return {
      assetId: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      currentWeight,
      targetWeight,
      deltaWeight,
      deltaAmountIdr,
      action: Math.abs(deltaWeight) < 0.005 ? "HOLD" as const : deltaWeight > 0 ? "BUY" as const : "SELL" as const,
      riskContribution: options.optimal.riskContributions[asset.id] ?? 0,
    };
  });
  const totalDrift = instructions.reduce((sum, item) => sum + Math.abs(item.deltaWeight), 0) / 2;
  return {
    instructions,
    current: currentPoint,
    recommended: options.optimal,
    returnUplift: options.optimal.expectedReturn - currentPoint.expectedReturn,
    volatilityChange: options.optimal.volatility - currentPoint.volatility,
    sharpeUplift: options.optimal.sharpeRatio - currentPoint.sharpeRatio,
    totalDrift,
  };
}

export function simulateMacroScenarios(weights: Record<string, number>, portfolioValueIdr: number, assets: AssetClass[] = MARKET_UNIVERSE): MacroScenarioImpact[] {
  const scenarios: { id: string; name: string; description: string; shocks: Record<AssetClass["category"], number> }[] = [
    { id: "pandemic", name: "Guncangan pandemi", description: "Penurunan ekuitas dan penguatan permintaan aset defensif.", shocks: { MONEY_MARKET: 0.004, FIXED_INCOME: -0.035, EQUITY: -0.18, GLOBAL_EQUITY: -0.22, COMMODITY: 0.045 } },
    { id: "rates", name: "Lonjakan suku bunga", description: "Tekanan harga obligasi, dengan koreksi lebih ringan pada aset berisiko.", shocks: { MONEY_MARKET: 0.003, FIXED_INCOME: -0.09, EQUITY: -0.11, GLOBAL_EQUITY: -0.13, COMMODITY: -0.025 } },
    { id: "stagflation", name: "Stagflasi & pelemahan rupiah", description: "Tekanan daya beli dan premi pada aset lindung nilai.", shocks: { MONEY_MARKET: 0.002, FIXED_INCOME: -0.045, EQUITY: -0.14, GLOBAL_EQUITY: -0.09, COMMODITY: 0.12 } },
  ];
  return scenarios.map((scenario) => {
    const portfolioReturn = assets.reduce((sum, asset) => sum + (weights[asset.id] ?? 0) * scenario.shocks[asset.category], 0);
    return {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      portfolioReturn,
      estimatedLossIdr: portfolioValueIdr * portfolioReturn,
    };
  });
}

export function portfolioGrowthSeries(weights: Record<string, number>, assets: AssetClass[] = MARKET_UNIVERSE): number[] {
  const returns = getReturnsMatrix(assets);
  let wealth = 1;
  return [wealth, ...returns.map((row) => {
    wealth *= Math.max(0, 1 + row.reduce((sum, value, index) => sum + value * (weights[assets[index].id] ?? 0), 0));
    return wealth;
  })];
}

export function portfolioMetricsSummary(metrics: PortfolioMetrics): Pick<PortfolioMetrics, "expectedReturn" | "volatility" | "sharpeRatio"> {
  return { expectedReturn: metrics.expectedReturn, volatility: metrics.volatility, sharpeRatio: metrics.sharpeRatio };
}

export interface SuitabilityCheckResult {
  status: "SUITABLE" | "BREACH";
  riskyWeight: number;
  maxRiskyWeight: number;
  excessWeight: number;
  message: string;
}

export function evaluateSuitability(
  weights: Record<string, number>,
  maxRiskyWeight: number,
  assets: AssetClass[] = MARKET_UNIVERSE,
): SuitabilityCheckResult {
  const riskyWeight = assets
    .filter((asset) => asset.riskTier === "HIGH")
    .reduce((sum, asset) => sum + (weights[asset.id] ?? 0), 0);
  const excessWeight = Math.max(0, riskyWeight - maxRiskyWeight);
  const isBreach = excessWeight > 0.005;
  return {
    status: isBreach ? "BREACH" : "SUITABLE",
    riskyWeight,
    maxRiskyWeight,
    excessWeight,
    message: isBreach
      ? `Porsi ekuitas berisiko tinggi (${(riskyWeight * 100).toFixed(1)}%) melampaui batas profil risiko (${(maxRiskyWeight * 100).toFixed(0)}%).`
      : `Sesuai prinsip kesesuaian (POJK): eksposur aset berisiko (${(riskyWeight * 100).toFixed(1)}%) berada dalam batas (${(maxRiskyWeight * 100).toFixed(0)}%).`,
  };
}
