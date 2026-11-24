import { DEFAULT_SHRINKAGE } from "@/data/market-universe";
import type { AssetClass, PortfolioMetrics } from "@/types/quant";

export interface MarketStatistics {
  means: number[];
  covarianceMatrix: number[][];
  correlationMatrix: number[][];
}

const clamp = (value: number, lower: number, upper: number) => Math.min(upper, Math.max(lower, value));
const statisticsCache = new Map<string, MarketStatistics>();

function marketCacheKey(assets: AssetClass[], returnsMatrix: number[][], shrinkage: number): string {
  const returnSignature = returnsMatrix.map((row) => row.map((value) => value.toPrecision(8)).join(",")).join(";");
  return `${shrinkage}|${assets.map((asset) => asset.id).join(",")}|${returnSignature}`;
}

export function estimateMarketStatistics(assets: AssetClass[], returnsMatrix: number[][], shrinkage = DEFAULT_SHRINKAGE): MarketStatistics {
  if (assets.length === 0) return { means: [], covarianceMatrix: [], correlationMatrix: [] };
  const key = marketCacheKey(assets, returnsMatrix, shrinkage);
  const cached = statisticsCache.get(key);
  if (cached) return cached;
  const observations = returnsMatrix.filter((row) => row.length === assets.length && row.every(Number.isFinite));
  if (observations.length < 2) throw new Error("At least two complete monthly observations are required.");
  const n = assets.length;
  const monthlyMeans = Array.from({ length: n }, (_, column) => observations.reduce((sum, row) => sum + row[column], 0) / observations.length);
  const sampleCovariance = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    let total = 0;
    for (const row of observations) total += (row[i] - monthlyMeans[i]) * (row[j] - monthlyMeans[j]);
    return (total / (observations.length - 1)) * 12;
  }));
  const volatilities = sampleCovariance.map((row, index) => Math.sqrt(Math.max(0, row[index])));
  const correlations = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    if (i === j) return 1;
    const denominator = volatilities[i] * volatilities[j];
    return denominator > 1e-14 ? clamp(sampleCovariance[i][j] / denominator, -1, 1) : 0;
  }));
  const pairCorrelations: number[] = [];
  for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) pairCorrelations.push(correlations[i][j]);
  const averageCorrelation = pairCorrelations.length ? pairCorrelations.reduce((sum, value) => sum + value, 0) / pairCorrelations.length : 0;
  const target = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j
    ? sampleCovariance[i][i]
    : averageCorrelation * Math.sqrt(Math.max(0, sampleCovariance[i][i] * sampleCovariance[j][j]))));
  const delta = clamp(shrinkage, 0, 1);
  const covarianceMatrix = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (1 - delta) * sampleCovariance[i][j] + delta * target[i][j]));
  const annualizedCorrelations = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    const denominator = Math.sqrt(Math.max(0, covarianceMatrix[i][i] * covarianceMatrix[j][j]));
    return denominator > 1e-14 ? clamp(covarianceMatrix[i][j] / denominator, -1, 1) : (i === j ? 1 : 0);
  }));
  const result = {
    means: monthlyMeans.map((value) => value * 12),
    covarianceMatrix,
    correlationMatrix: annualizedCorrelations,
  };
  statisticsCache.set(key, result);
  if (statisticsCache.size > 8) statisticsCache.delete(statisticsCache.keys().next().value as string);
  return result;
}

export function portfolioReturn(weights: number[], means: number[]): number {
  return weights.reduce((sum, weight, index) => sum + weight * (means[index] ?? 0), 0);
}

export function portfolioVariance(weights: number[], covarianceMatrix: number[][]): number {
  let variance = 0;
  for (let i = 0; i < weights.length; i += 1) {
    for (let j = 0; j < weights.length; j += 1) variance += weights[i] * weights[j] * (covarianceMatrix[i]?.[j] ?? 0);
  }
  return Math.max(0, variance);
}

export function calculatePortfolioMetrics(
  weights: number[],
  assets: AssetClass[],
  statistics: MarketStatistics,
  returnsMatrix: number[][],
  riskFreeRate: number,
): PortfolioMetrics {
  const expectedReturn = portfolioReturn(weights, statistics.means);
  const weightedExpenseRatio = weights.reduce((sum, weight, index) => sum + weight * (assets[index]?.expenseRatio ?? 0), 0);
  const netExpectedReturn = expectedReturn - weightedExpenseRatio;
  const variance = portfolioVariance(weights, statistics.covarianceMatrix);
  const volatility = Math.sqrt(variance);
  const sharpeRatio = volatility > 1e-12 ? (expectedReturn - riskFreeRate) / volatility : 0;
  const monthlyRiskFree = riskFreeRate / 12;
  const portfolioMonthlyReturns = returnsMatrix.map((row) => row.reduce((sum, value, index) => sum + value * (weights[index] ?? 0), 0));
  const downsideSquared = portfolioMonthlyReturns.reduce((sum, value) => sum + Math.min(0, value - monthlyRiskFree) ** 2, 0);
  const downsideDeviation = Math.sqrt(downsideSquared / Math.max(1, portfolioMonthlyReturns.length) * 12);
  const sortinoRatio = downsideDeviation > 1e-12 ? (expectedReturn - riskFreeRate) / downsideDeviation : 0;
  const var95 = Math.max(0, -(expectedReturn - 1.64485 * volatility));
  const cvar95 = Math.max(0, -(expectedReturn - 2.06271 * volatility));
  const orderedReturns = [...portfolioMonthlyReturns].sort((a, b) => a - b);
  const historicalCutoff = orderedReturns[Math.max(0, Math.floor((orderedReturns.length - 1) * 0.05))] ?? 0;
  const historicalVaR95 = Math.max(0, -historicalCutoff * Math.sqrt(12));
  let wealth = 1;
  let peak = 1;
  let maxDrawdown = 0;
  for (const monthlyReturn of portfolioMonthlyReturns) {
    wealth *= Math.max(0, 1 + monthlyReturn);
    peak = Math.max(peak, wealth);
    if (peak > 0) maxDrawdown = Math.min(maxDrawdown, (wealth - peak) / peak);
  }
  const calmarRatio = expectedReturn / Math.max(0.005, Math.abs(maxDrawdown));
  const weightSqSum = weights.reduce((sum, weight) => sum + weight * weight, 0);
  const effectiveAssets = weightSqSum > 1e-12 ? 1 / weightSqSum : 0;
  const sigmaW = statistics.covarianceMatrix.map((row) => row.reduce((sum, value, index) => sum + value * (weights[index] ?? 0), 0));
  const riskContributions = Object.fromEntries(assets.map((asset, index) => [asset.id, variance > 1e-14 ? (weights[index] * sigmaW[index]) / variance : 0]));
  return {
    expectedReturn,
    netExpectedReturn,
    weightedExpenseRatio,
    volatility,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    effectiveAssets,
    var95,
    cvar95,
    historicalVaR95,
    maxDrawdown,
    riskContributions,
  };
}
