import { MARKET_UNIVERSE, getReturnsMatrix } from "@/data/market-universe";
import type { AssetClass, OptimizationConstraints, OptimizationResult, PortfolioCloudPoint, PortfolioPoint } from "@/types/quant";
import { calculatePortfolioMetrics, estimateMarketStatistics, portfolioReturn, portfolioVariance, type MarketStatistics } from "./statistics";

const EPSILON = 1e-10;
const frontierWeightCache = new Map<string, number[][]>();
const frontierWarmCache = new Map<string, { activeIds: string[]; maxWeight: number; weights: number[][] }>();
const sharpeWeightCache = new Map<string, number[]>();
const cloudPointCache = new Map<string, PortfolioCloudPoint[]>();

function remember<TKey, TValue>(cache: Map<TKey, TValue>, key: TKey, value: TValue, limit = 12): TValue {
  cache.set(key, value);
  if (cache.size > limit) cache.delete(cache.keys().next().value as TKey);
  return value;
}

export function projectBoundedSimplex(
  values: number[],
  requestedMaxWeight: number,
  riskyMask?: boolean[],
  maxRiskyWeight?: number,
): { weights: number[]; maxWeight: number } {
  if (!values.length) return { weights: [], maxWeight: 0 };
  const maxWeight = Math.min(1, Math.max(requestedMaxWeight, 1 / values.length));
  const projectBasic = (vals: number[], upperBounds: number[], targetSum: number): number[] => {
    const capSum = upperBounds.reduce((s, u) => s + u, 0);
    const effectiveTarget = Math.min(targetSum, capSum);
    let low = Math.min(...vals) - 1;
    let high = Math.max(...vals);
    for (let iteration = 0; iteration < 60; iteration += 1) {
      const theta = (low + high) / 2;
      const sum = vals.reduce((total, value, idx) => total + Math.min(upperBounds[idx], Math.max(0, value - theta)), 0);
      if (sum > effectiveTarget) low = theta;
      else high = theta;
    }
    const theta = (low + high) / 2;
    const weights = vals.map((value, idx) => Math.min(upperBounds[idx], Math.max(0, value - theta)));
    const residual = effectiveTarget - weights.reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(residual) > 1e-13) {
      const index = weights.findIndex((weight, idx) => weight + residual >= -1e-12 && weight + residual <= upperBounds[idx] + 1e-12);
      if (index >= 0) weights[index] = Math.min(upperBounds[index], Math.max(0, weights[index] + residual));
    }
    return weights;
  };

  const uniformCaps = Array(values.length).fill(maxWeight) as number[];
  let weights = projectBasic(values, uniformCaps, 1);

  // Enforce POJK group cap on HIGH riskTier assets if requested and feasible
  if (riskyMask && maxRiskyWeight !== undefined && maxRiskyWeight < 1 - 1e-9) {
    const riskyIndices = riskyMask.map((isRisky, idx) => (isRisky ? idx : -1)).filter((idx) => idx >= 0);
    const safeIndices = riskyMask.map((isRisky, idx) => (!isRisky ? idx : -1)).filter((idx) => idx >= 0);
    const maxSafeCapacity = safeIndices.length * maxWeight;
    const minRiskyNeeded = Math.max(0, 1 - maxSafeCapacity);
    const feasibleRiskyCap = Math.min(1, Math.max(maxRiskyWeight, minRiskyNeeded));
    const currentRiskySum = riskyIndices.reduce((sum, idx) => sum + weights[idx], 0);
    if (currentRiskySum > feasibleRiskyCap + 1e-10 && safeIndices.length > 0 && riskyIndices.length > 0) {
      const riskyVals = riskyIndices.map((idx) => values[idx]);
      const safeVals = safeIndices.map((idx) => values[idx]);
      const projRisky = projectBasic(riskyVals, Array(riskyIndices.length).fill(maxWeight), feasibleRiskyCap);
      const projSafe = projectBasic(safeVals, Array(safeIndices.length).fill(maxWeight), 1 - feasibleRiskyCap);
      weights = Array(values.length).fill(0) as number[];
      riskyIndices.forEach((idx, i) => { weights[idx] = projRisky[i]; });
      safeIndices.forEach((idx, i) => { weights[idx] = projSafe[i]; });
    }
  }

  return { weights, maxWeight };
}

function multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * (vector[index] ?? 0), 0));
}

function optimizeProjected(
  initial: number[],
  maxWeight: number,
  objective: (weights: number[]) => number,
  gradient: (weights: number[]) => number[],
  iterations = 400,
  riskyMask?: boolean[],
  maxRiskyWeight?: number,
): number[] {
  let weights = projectBoundedSimplex(initial, maxWeight, riskyMask, maxRiskyWeight).weights;
  let currentScore = objective(weights);
  let extrapolated = weights;
  let momentum = 1;
  let step = 1;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const grad = gradient(extrapolated);
    let accepted = false;
    let candidate = weights;
    let candidateScore = currentScore;
    let localStep = step;
    for (let lineSearch = 0; lineSearch < 12; lineSearch += 1) {
      candidate = projectBoundedSimplex(
        extrapolated.map((value, index) => value + localStep * (grad[index] ?? 0)),
        maxWeight,
        riskyMask,
        maxRiskyWeight,
      ).weights;
      candidateScore = objective(candidate);
      if (candidateScore >= currentScore - 1e-14) {
        accepted = true;
        break;
      }
      localStep *= 0.5;
    }
    if (!accepted) break;
    const delta = Math.max(...candidate.map((value, index) => Math.abs(value - weights[index])));
    const nextMomentum = (1 + Math.sqrt(1 + 4 * momentum * momentum)) / 2;
    const momentumFactor = (momentum - 1) / nextMomentum;
    const nextExtrapolated = projectBoundedSimplex(
      candidate.map((value, index) => value + momentumFactor * (value - weights[index])),
      maxWeight,
      riskyMask,
      maxRiskyWeight,
    ).weights;
    weights = candidate;
    currentScore = candidateScore;
    extrapolated = objective(nextExtrapolated) >= currentScore - 1e-14 ? nextExtrapolated : candidate;
    momentum = extrapolated === candidate ? 1 : nextMomentum;
    step = Math.min(32, Math.max(localStep * 1.25, 1e-5));
    if (delta < 1e-11) break;
  }
  return weights;
}

function greedyMaxReturn(means: number[], maxWeight: number): number[] {
  const weights = Array(means.length).fill(0) as number[];
  let remaining = 1;
  const order = means.map((value, index) => ({ value, index })).sort((a, b) => b.value - a.value);
  for (const item of order) {
    const allocation = Math.min(maxWeight, remaining);
    weights[item.index] = allocation;
    remaining -= allocation;
    if (remaining <= EPSILON) break;
  }
  return weights;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function capRandomWeights(rawWeights: number[], maxWeight: number): number[] {
  const weights = Array(rawWeights.length).fill(0) as number[];
  let active = rawWeights.map((_, index) => index);
  let remaining = 1;
  while (active.length > 0) {
    const rawTotal = active.reduce((sum, index) => sum + rawWeights[index], 0);
    const capped = active.filter((index) => rawTotal > 0 && remaining * rawWeights[index] / rawTotal >= maxWeight - 1e-12);
    if (capped.length === 0) {
      for (const index of active) weights[index] = rawTotal > 0 ? remaining * rawWeights[index] / rawTotal : remaining / active.length;
      break;
    }
    for (const index of capped) {
      weights[index] = maxWeight;
      remaining -= maxWeight;
    }
    const cappedSet = new Set(capped);
    active = active.filter((index) => !cappedSet.has(index));
  }
  const residual = 1 - weights.reduce((sum, weight) => sum + weight, 0);
  const available = weights.findIndex((weight) => weight + residual >= -1e-10 && weight + residual <= maxWeight + 1e-10);
  if (available >= 0) weights[available] += residual;
  return weights;
}

function toPoint(
  activeWeights: number[],
  activeIndices: number[],
  assets: AssetClass[],
  statistics: MarketStatistics,
  returnsMatrix: number[][],
  riskFreeRate: number,
  objective?: OptimizationConstraints["objective"],
  label?: string,
): PortfolioPoint {
  const weights = Array(assets.length).fill(0) as number[];
  activeIndices.forEach((fullIndex, activeIndex) => { weights[fullIndex] = activeWeights[activeIndex] ?? 0; });
  return {
    ...calculatePortfolioMetrics(weights, assets, statistics, returnsMatrix, riskFreeRate),
    weights: Object.fromEntries(assets.map((asset, index) => [asset.id, weights[index]])),
    objective,
    label,
  };
}

function toCloudPoint(
  activeWeights: number[],
  activeIndices: number[],
  assets: AssetClass[],
  means: number[],
  covarianceMatrix: number[][],
  riskFreeRate: number,
  label: string,
): PortfolioCloudPoint {
  const weights = Array(assets.length).fill(0) as number[];
  activeIndices.forEach((fullIndex, activeIndex) => { weights[fullIndex] = activeWeights[activeIndex] ?? 0; });
  const expectedReturn = portfolioReturn(weights, means);
  const volatility = Math.sqrt(portfolioVariance(weights, covarianceMatrix));
  return {
    expectedReturn,
    volatility,
    sharpeRatio: volatility > 1e-12 ? (expectedReturn - riskFreeRate) / volatility : 0,
    weights: Object.fromEntries(assets.map((asset, index) => [asset.id, weights[index]])),
    label,
  };
}

export function optimizePortfolio(
  assets: AssetClass[] = MARKET_UNIVERSE,
  returnsMatrix: number[][] = getReturnsMatrix(assets),
  constraints: OptimizationConstraints = {
    objective: "RISK_MATCHED",
    riskAversion: 2.6,
    riskFreeRate: 0.0625,
    maxWeight: 0.35,
    shariaOnly: false,
  },
): OptimizationResult {
  const startedAt = performance.now();
  const statistics = estimateMarketStatistics(assets, returnsMatrix);
  const activeIndices = assets.map((asset, index) => ({ asset, index })).filter(({ asset }) => asset.active !== false
    && (!constraints.shariaOnly || asset.isSharia)
    && (!constraints.eligibleAssetIds || constraints.eligibleAssetIds.includes(asset.id))).map(({ index }) => index);
  if (activeIndices.length === 0) throw new Error("At least one active instrument must be available to the optimizer.");
  const requestedMax = Math.min(1, Math.max(0, constraints.maxWeight));
  const { maxWeight: effectiveMaxWeight } = projectBoundedSimplex(Array(activeIndices.length).fill(0), requestedMax);
  const notices: string[] = [];
  if (effectiveMaxWeight > requestedMax + 1e-10) notices.push(`Maximum weight was raised to ${(effectiveMaxWeight * 100).toFixed(2)}% to keep the active universe feasible.`);
  const activeMeans = activeIndices.map((index) => statistics.means[index]);
  const activeCovariance = activeIndices.map((i) => activeIndices.map((j) => statistics.covarianceMatrix[i][j]));
  const initial = Array(activeIndices.length).fill(1 / activeIndices.length) as number[];
  const activeReturn = (weights: number[]) => portfolioReturn(weights, activeMeans);
  const activeVariance = (weights: number[]) => portfolioVariance(weights, activeCovariance);
  const varianceGradient = (weights: number[]) => multiplyMatrixVector(activeCovariance, weights);
  const modelKey = `${assets.map((asset) => asset.id).join(",")}|${statistics.means.map((value) => value.toPrecision(8)).join(",")}|${statistics.covarianceMatrix.flat().map((value) => value.toPrecision(8)).join(",")}`;
  const activeIds = activeIndices.map((index) => assets[index].id);
  const frontierKey = `${modelKey}|${activeIds.join(",")}|${effectiveMaxWeight.toPrecision(9)}`;
  let frontierWeights = frontierWeightCache.get(frontierKey);
  if (!frontierWeights) {
    const prior = frontierWarmCache.get(modelKey);
    const sameActiveSet = prior?.activeIds.join(",") === activeIds.join(",");
    const adjacentCap = prior !== undefined && Math.abs(prior.maxWeight - effectiveMaxWeight) <= 0.020001;
    const frontierIterations = prior ? (sameActiveSet && adjacentCap ? 80 : 120) : 160;
    const adaptPriorWeights = (pointIndex: number) => {
      if (!prior) return initial;
      const oldPoint = prior.weights[Math.min(pointIndex, prior.weights.length - 1)] ?? [];
      const priorById = new Map(prior.activeIds.map((id, index) => [id, oldPoint[index] ?? 0]));
      const values = activeIds.map((id) => priorById.has(id) ? priorById.get(id)! : 1 / activeIds.length);
      return projectBoundedSimplex(values, effectiveMaxWeight).weights;
    };
    const minVolWeights = optimizeProjected(initial, effectiveMaxWeight,
      (weights) => -0.5 * activeVariance(weights),
      (weights) => varianceGradient(weights).map((value) => -value), prior ? (sameActiveSet && adjacentCap ? 100 : 150) : 220);
    const maxReturnWeights = greedyMaxReturn(activeMeans, effectiveMaxWeight);
    const calculated: number[][] = [minVolWeights];
    let warmStart = minVolWeights;
    const intermediateCount = 38;
    for (let index = 0; index < intermediateCount; index += 1) {
      const fraction = index / (intermediateCount - 1);
      const riskAversion = 50 * Math.pow(0.1 / 50, fraction);
      const startWeights = prior ? adaptPriorWeights(index + 1) : warmStart;
      warmStart = optimizeProjected(startWeights, effectiveMaxWeight,
        (weights) => activeReturn(weights) - (riskAversion / 2) * activeVariance(weights),
        (weights) => {
          const sigmaW = varianceGradient(weights);
          return activeMeans.map((mean, assetIndex) => mean - riskAversion * sigmaW[assetIndex]);
        }, frontierIterations);
      calculated.push(warmStart);
    }
    calculated.push(maxReturnWeights);
    frontierWeights = remember(frontierWeightCache, frontierKey, calculated);
    remember(frontierWarmCache, modelKey, { activeIds, maxWeight: effectiveMaxWeight, weights: calculated });
  }
  const frontierPoints = frontierWeights.map((weights, index) => toPoint(weights, activeIndices, assets, statistics, returnsMatrix, constraints.riskFreeRate, "TARGET_RETURN", `Frontier ${index + 1}`));
  const minVolWeights = frontierWeights[0];
  const minVolPoint = toPoint(minVolWeights, activeIndices, assets, statistics, returnsMatrix, constraints.riskFreeRate, "MIN_VOLATILITY", "Minimum volatility");
  const maxReturnWeights = frontierWeights[frontierWeights.length - 1];
  const minReturn = activeReturn(minVolWeights);
  const maxReturn = activeReturn(maxReturnWeights);
  const bestFrontierPoint = frontierPoints.reduce((best, point) => point.sharpeRatio > best.sharpeRatio ? point : best, frontierPoints[0]);
  const sharpeCacheKey = `${frontierKey}|rf:${constraints.riskFreeRate.toPrecision(8)}`;
  let maxSharpeWeights = sharpeWeightCache.get(sharpeCacheKey);
  if (!maxSharpeWeights) {
    const activeBest = activeIndices.map((index) => bestFrontierPoint.weights[assets[index].id] ?? 0);
    maxSharpeWeights = optimizeProjected(activeBest, effectiveMaxWeight,
      (weights) => {
        const volatility = Math.sqrt(Math.max(activeVariance(weights), 1e-16));
        return (activeReturn(weights) - constraints.riskFreeRate) / volatility;
      },
      (weights) => {
        const variance = Math.max(activeVariance(weights), 1e-16);
        const volatility = Math.sqrt(variance);
        const sigmaW = varianceGradient(weights);
        const excess = activeReturn(weights) - constraints.riskFreeRate;
        return activeMeans.map((mean, index) => (mean * volatility - excess * sigmaW[index] / volatility) / variance);
      }, 180);
    remember(sharpeWeightCache, sharpeCacheKey, maxSharpeWeights);
  }
  const maxSharpePointCandidate = toPoint(maxSharpeWeights, activeIndices, assets, statistics, returnsMatrix, constraints.riskFreeRate, "MAX_SHARPE", "Maximum Sharpe");
  const maxSharpe = maxSharpePointCandidate.sharpeRatio >= bestFrontierPoint.sharpeRatio ? maxSharpePointCandidate : bestFrontierPoint;
  const minimumFrontierSharpe = frontierPoints.reduce((best, point) => point.sharpeRatio > best.sharpeRatio ? point : best, frontierPoints[0]);
  const maxSharpePoint = maxSharpe.sharpeRatio >= minimumFrontierSharpe.sharpeRatio ? maxSharpe : minimumFrontierSharpe;
  const minVolatility = frontierPoints.reduce((best, point) => point.volatility < best.volatility ? point : best, minVolPoint);
  let optimal: PortfolioPoint;
  if (constraints.objective === "MAX_SHARPE") optimal = maxSharpePoint;
  else if (constraints.objective === "MIN_VOLATILITY") optimal = minVolatility;
  else if (constraints.objective === "RISK_MATCHED") {
    const riskAversion = Math.min(50, Math.max(0.1, constraints.riskAversion));
    const frontierIndex = Math.max(0, Math.min(39, Math.round(Math.log(50 / riskAversion) / Math.log(500) * 38)));
    const startWeights = frontierWeights[frontierIndex];
    const activeRiskyMask = activeIndices.map((idx) => assets[idx].riskTier === "HIGH");
    const weights = optimizeProjected(startWeights, effectiveMaxWeight,
      (candidate) => activeReturn(candidate) - (riskAversion / 2) * activeVariance(candidate),
      (candidate) => {
        const sigmaW = varianceGradient(candidate);
        return activeMeans.map((mean, index) => mean - riskAversion * sigmaW[index]);
      }, 220, activeRiskyMask, constraints.maxRiskyWeight);
    optimal = toPoint(weights, activeIndices, assets, statistics, returnsMatrix, constraints.riskFreeRate, "RISK_MATCHED", "Risk matched");
  } else {
    const target = Math.min(maxReturn, Math.max(minReturn, constraints.targetReturn ?? (minReturn + maxReturn) / 2));
    const startPoint = frontierPoints.reduce((best, point) => Math.abs(point.expectedReturn - target) < Math.abs(best.expectedReturn - target) ? point : best, frontierPoints[0]);
    const startWeights = activeIndices.map((index) => startPoint.weights[assets[index].id] ?? 0);
    const weights = optimizeProjected(startWeights, effectiveMaxWeight,
      (candidate) => -0.5 * activeVariance(candidate) - 900 * (activeReturn(candidate) - target) ** 2,
      (candidate) => {
        const sigmaW = varianceGradient(candidate);
        const returnGap = activeReturn(candidate) - target;
        return sigmaW.map((value, index) => -value - 1800 * returnGap * activeMeans[index]);
      }, 240);
    optimal = toPoint(weights, activeIndices, assets, statistics, returnsMatrix, constraints.riskFreeRate, "TARGET_RETURN", "Target return");
  }
  const cloudKey = `${modelKey}|${activeIds.join(",")}|rf:${constraints.riskFreeRate.toPrecision(8)}`;
  let cloudPoints = cloudPointCache.get(cloudKey);
  if (!cloudPoints) {
    const random = seededRandom(26026);
    cloudPoints = Array.from({ length: 300 }, (_, index) => {
      const exponentials = activeIndices.map(() => -Math.log(Math.max(1e-12, random())));
      const cloudMaxWeight = Math.max(0.15, 1 / activeIndices.length);
      const projected = capRandomWeights(exponentials, cloudMaxWeight);
      return toCloudPoint(projected, activeIndices, assets, statistics.means, statistics.covarianceMatrix, constraints.riskFreeRate, `Cloud ${index + 1}`);
    });
    remember(cloudPointCache, cloudKey, cloudPoints);
  }
  frontierPoints.sort((a, b) => a.volatility - b.volatility || a.expectedReturn - b.expectedReturn);

  // Strategy benchmarks: Equal Weight (1/N) and Risk Parity (Equal Risk Contribution)
  const equalActiveWeights = Array(activeIndices.length).fill(1 / activeIndices.length) as number[];
  const equalWeight = toPoint(equalActiveWeights, activeIndices, assets, statistics, returnsMatrix, constraints.riskFreeRate, undefined, "Equal Weight (1/N)");

  let rpWeights = activeIndices.map((idx) => 1 / Math.max(1e-4, Math.sqrt(Math.max(1e-8, statistics.covarianceMatrix[idx][idx]))));
  const rpInitSum = rpWeights.reduce((sum, v) => sum + v, 0);
  rpWeights = rpWeights.map((v) => v / Math.max(1e-12, rpInitSum));
  const nActive = activeIndices.length;
  for (let step = 0; step < 60; step += 1) {
    const sigmaW = multiplyMatrixVector(activeCovariance, rpWeights);
    const totalVar = Math.max(1e-14, activeVariance(rpWeights));
    const targetRc = totalVar / nActive;
    const next = rpWeights.map((w, i) => w * Math.sqrt(targetRc / Math.max(1e-14, w * sigmaW[i])));
    const sumNext = next.reduce((sum, v) => sum + v, 0);
    rpWeights = next.map((v) => v / Math.max(1e-12, sumNext));
  }
  const riskParity = toPoint(rpWeights, activeIndices, assets, statistics, returnsMatrix, constraints.riskFreeRate, undefined, "Risk Parity (ERC)");

  return {
    optimal,
    minVolatility,
    maxSharpe,
    benchmarks: { equalWeight, riskParity },
    frontierPoints,
    cloudPoints,
    assets,
    means: statistics.means,
    covarianceMatrix: statistics.covarianceMatrix,
    correlationMatrix: statistics.correlationMatrix,
    executionTimeMs: performance.now() - startedAt,
    effectiveMaxWeight,
    notices,
  };
}

export function optimizeFastSingle(
  assets: AssetClass[] = MARKET_UNIVERSE,
  returnsMatrix: number[][] = getReturnsMatrix(assets),
  constraints: Pick<OptimizationConstraints, "riskAversion" | "riskFreeRate" | "maxWeight" | "shariaOnly" | "maxRiskyWeight">,
): PortfolioPoint {
  const statistics = estimateMarketStatistics(assets, returnsMatrix);
  const activeIndices = assets
    .map((asset, index) => ({ asset, index }))
    .filter(({ asset }) => asset.active !== false && (!constraints.shariaOnly || asset.isSharia))
    .map(({ index }) => index);
  if (activeIndices.length === 0) {
    return evaluateWeights({}, assets, returnsMatrix, constraints.riskFreeRate);
  }
  const requestedMax = Math.min(1, Math.max(0, constraints.maxWeight));
  const { maxWeight: effectiveMaxWeight } = projectBoundedSimplex(Array(activeIndices.length).fill(0), requestedMax);
  const activeMeans = activeIndices.map((index) => statistics.means[index]);
  const activeCovariance = activeIndices.map((i) => activeIndices.map((j) => statistics.covarianceMatrix[i][j]));
  const activeRiskyMask = activeIndices.map((idx) => assets[idx].riskTier === "HIGH");
  const initial = Array(activeIndices.length).fill(1 / activeIndices.length) as number[];
  const riskAversion = Math.min(50, Math.max(0.1, constraints.riskAversion));
  const weights = optimizeProjected(
    initial,
    effectiveMaxWeight,
    (candidate) => portfolioReturn(candidate, activeMeans) - (riskAversion / 2) * portfolioVariance(candidate, activeCovariance),
    (candidate) => {
      const sigmaW = multiplyMatrixVector(activeCovariance, candidate);
      return activeMeans.map((mean, index) => mean - riskAversion * sigmaW[index]);
    },
    45,
    activeRiskyMask,
    constraints.maxRiskyWeight,
  );
  return toPoint(weights, activeIndices, assets, statistics, returnsMatrix, constraints.riskFreeRate, "RISK_MATCHED", "Risk matched");
}

export function evaluateWeights(
  weightsById: Record<string, number>,
  assets: AssetClass[] = MARKET_UNIVERSE,
  returnsMatrix: number[][] = getReturnsMatrix(assets),
  riskFreeRate = 0.0625,
): PortfolioPoint {
  const statistics = estimateMarketStatistics(assets, returnsMatrix);
  const weights = assets.map((asset) => Math.max(0, weightsById[asset.id] ?? 0));
  return {
    ...calculatePortfolioMetrics(weights, assets, statistics, returnsMatrix, riskFreeRate),
    weights: Object.fromEntries(assets.map((asset, index) => [asset.id, weights[index]])),
  };
}
