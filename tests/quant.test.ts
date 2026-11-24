import { describe, expect, it } from "vitest";
import { DEFAULT_RISK_FREE_RATE, getReturnsMatrix, MARKET_UNIVERSE } from "@/data/market-universe";
import { DEMO_PERSONAS } from "@/data/demo-personas";
import { optimizePortfolio, projectBoundedSimplex } from "@/lib/quant/markowitz";
import { simulateMonteCarlo } from "@/lib/quant/monte-carlo";
import { calculateRebalance, evaluateSuitability } from "@/lib/quant/rebalancer";
import { estimateMarketStatistics } from "@/lib/quant/statistics";
import { analyzeCustomerIntelligence, simulateAbCampaign, simulateLoyaltyProgram } from "@/lib/quant/customer-intelligence";
import { INITIAL_CLIENT_BOOK } from "@/data/demo-personas";
import type { OptimizationObjective } from "@/types/quant";

const returns = getReturnsMatrix();
const objectives: OptimizationObjective[] = ["MAX_SHARPE", "MIN_VOLATILITY", "TARGET_RETURN", "RISK_MATCHED"];

describe("bounded-simplex projection", () => {
  it("projects weights to a feasible simplex with exact sum and caps", () => {
    const result = projectBoundedSimplex([0.9, -0.2, 0.4, 0.1], 0.4);
    expect(result.weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 12);
    expect(result.weights.every((weight) => weight >= -1e-10 && weight <= 0.4 + 1e-10)).toBe(true);
  });

  it("raises an infeasible concentration cap to the minimum feasible value", () => {
    const result = projectBoundedSimplex([4, 2], 0.35);
    expect(result.maxWeight).toBe(0.5);
    expect(result.weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 12);
  });
});

describe("calibrated synthetic market data", () => {
  it("contains 60 monthly observations and matches configured annual return and volatility", () => {
    const statistics = estimateMarketStatistics(MARKET_UNIVERSE, returns);
    expect(MARKET_UNIVERSE.every((asset) => asset.monthlyReturns.length === 60)).toBe(true);
    MARKET_UNIVERSE.forEach((asset, index) => {
      expect(statistics.means[index]).toBeCloseTo(asset.expectedAnnualReturn, 10);
      expect(Math.sqrt(statistics.covarianceMatrix[index][index])).toBeCloseTo(asset.annualVolatility, 10);
    });
  });
});

describe("Markowitz optimizer invariants", () => {
  it.each(objectives)("keeps %s weights long-only, normalized, and within cap", (objective) => {
    const result = optimizePortfolio(MARKET_UNIVERSE, returns, {
      objective,
      riskAversion: 2.6,
      riskFreeRate: DEFAULT_RISK_FREE_RATE,
      maxWeight: 0.35,
      targetReturn: 0.105,
      shariaOnly: false,
    });
    const weights = Object.values(result.optimal.weights);
    expect(Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1)).toBeLessThan(1e-6);
    expect(weights.every((weight) => weight >= -1e-7)).toBe(true);
    expect(weights.every((weight) => weight <= result.effectiveMaxWeight + 1e-6)).toBe(true);
  });

  it("sets every non-compliant allocation to exactly zero under the Sharia filter", () => {
    const result = optimizePortfolio(MARKET_UNIVERSE, returns, {
      objective: "RISK_MATCHED",
      riskAversion: 5.8,
      riskFreeRate: DEFAULT_RISK_FREE_RATE,
      maxWeight: 0.35,
      shariaOnly: true,
    });
    for (const asset of MARKET_UNIVERSE.filter((item) => !item.isSharia)) expect(result.optimal.weights[asset.id]).toBe(0);
  });

  it("keeps minimum volatility no greater than the other frontier points", () => {
    const result = optimizePortfolio(MARKET_UNIVERSE, returns, { objective: "MIN_VOLATILITY", riskAversion: 2.6, riskFreeRate: DEFAULT_RISK_FREE_RATE, maxWeight: 0.35, shariaOnly: false });
    expect(result.frontierPoints).toHaveLength(40);
    expect(result.frontierPoints.every((point) => result.minVolatility.volatility <= point.volatility + 1e-8)).toBe(true);
  });

  it("keeps maximum Sharpe at least as high as all sampled frontier points", () => {
    const result = optimizePortfolio(MARKET_UNIVERSE, returns, { objective: "MAX_SHARPE", riskAversion: 2.6, riskFreeRate: DEFAULT_RISK_FREE_RATE, maxWeight: 0.35, shariaOnly: false });
    expect(result.maxSharpe.sharpeRatio).toBeGreaterThanOrEqual(Math.max(...result.frontierPoints.map((point) => point.sharpeRatio)) - 1e-10);
    expect(result.maxSharpe.sharpeRatio).toBeGreaterThanOrEqual(Math.max(...result.cloudPoints.map((point) => point.sharpeRatio)) - 1e-10);
  });

  it("normalizes percentage risk contributions to one", () => {
    const result = optimizePortfolio(MARKET_UNIVERSE, returns, { objective: "RISK_MATCHED", riskAversion: 2.6, riskFreeRate: DEFAULT_RISK_FREE_RATE, maxWeight: 0.35, shariaOnly: false });
    const contributionSum = Object.values(result.optimal.riskContributions).reduce((sum, contribution) => sum + contribution, 0);
    expect(contributionSum).toBeCloseTo(1, 5);
  });
});

describe("simulation and rebalancing", () => {
  it("produces deterministic Monte Carlo quantiles with principal tracking", () => {
    const input = { initialCapitalIdr: 100_000_000, monthlyContributionIdr: 3_000_000, expectedReturn: 0.1, volatility: 0.14, horizonYears: 5, paths: 1_000, seed: 42 };
    const first = simulateMonteCarlo(input);
    const second = simulateMonteCarlo(input);
    expect(first.points).toEqual(second.points);
    expect(first.points).toHaveLength(6);
    expect(first.points[5].principal).toBe(280_000_000);
    expect(first.points.every((point) => point.p10 <= point.p25 && point.p25 <= point.p50 && point.p50 <= point.p75 && point.p75 <= point.p90)).toBe(true);
  });

  it("reconciles Rupiah trade instructions against the current demo persona", () => {
    const persona = DEMO_PERSONAS[1];
    const optimized = optimizePortfolio(MARKET_UNIVERSE, returns, { objective: "RISK_MATCHED", riskAversion: persona.riskAversion, riskFreeRate: DEFAULT_RISK_FREE_RATE, maxWeight: 0.35, shariaOnly: false });
    const rebalance = calculateRebalance({ assets: MARKET_UNIVERSE, currentWeights: persona.currentWeights, optimal: optimized.optimal, portfolioValueIdr: persona.initialCapitalIdr, riskFreeRate: DEFAULT_RISK_FREE_RATE });
    const totalTrade = rebalance.instructions.reduce((sum, item) => sum + item.deltaAmountIdr, 0);
    expect(Math.abs(totalTrade)).toBeLessThan(0.01);
    const expected = ((optimized.optimal.weights.MM_PUAS ?? 0) - (persona.currentWeights.MM_PUAS ?? 0)) * persona.initialCapitalIdr;
    expect(rebalance.instructions.find((item) => item.assetId === "MM_PUAS")?.deltaAmountIdr).toBeCloseTo(expected, 5);
  });

  it("computes net return after expense ratio, strategy benchmarks, and POJK suitability", () => {
    const result = optimizePortfolio(MARKET_UNIVERSE, returns, { objective: "MAX_SHARPE", riskAversion: 2.6, riskFreeRate: DEFAULT_RISK_FREE_RATE, maxWeight: 0.35, shariaOnly: false });
    expect(result.optimal.netExpectedReturn).toBeLessThan(result.optimal.expectedReturn);
    expect(result.optimal.effectiveAssets).toBeGreaterThan(1);
    expect(result.benchmarks.equalWeight.expectedReturn).toBeGreaterThan(0);
    expect(result.benchmarks.riskParity.volatility).toBeLessThan(result.benchmarks.equalWeight.volatility);
    const conservativeSuitability = evaluateSuitability({ EQ_TECH: 0.8, MM_PUAS: 0.2 }, 0.35, MARKET_UNIVERSE);
    expect(conservativeSuitability.status).toBe("BREACH");
    const safeSuitability = evaluateSuitability({ MM_PUAS: 0.8, EQ_JII: 0.2 }, 0.35, MARKET_UNIVERSE);
    expect(safeSuitability.status).toBe("SUITABLE");
  });

  it("clusters clients with RFM K-Means, scores churn, runs A/B z-test, and computes loyalty ROI", () => {
    const opt = optimizePortfolio(MARKET_UNIVERSE, returns, { objective: "RISK_MATCHED", riskAversion: 2.6, riskFreeRate: DEFAULT_RISK_FREE_RATE, maxWeight: 0.35, shariaOnly: false });
    const summaries = INITIAL_CLIENT_BOOK.map((persona) => ({
      persona,
      current: opt.optimal,
      optimal: opt.optimal,
      suitabilityStatus: "SUITABLE" as const,
    }));
    const { customers, segments } = analyzeCustomerIntelligence(summaries);
    expect(customers).toHaveLength(INITIAL_CLIENT_BOOK.length);
    expect(segments).toHaveLength(4);
    expect(customers.every((c) => c.churnProbability >= 0 && c.churnProbability <= 1)).toBe(true);
    const ab = simulateAbCampaign({
      targetSegment: "At-Risk Dormant",
      audienceSize: 10,
      baseConversionRate: 0.08,
      treatmentLiftRate: 0.05,
      costPerClientIdr: 75_000,
      avgTopUpPerConversionIdr: 25_000_000,
    });
    expect(ab.pValue).toBeGreaterThanOrEqual(0);
    expect(ab.pValue).toBeLessThanOrEqual(1);
    const loyalty = simulateLoyaltyProgram(customers, {
      platinumRewardBps: 35,
      goldRewardBps: 20,
      silverRewardBps: 10,
      churnReductionEffectiveness: 0.45,
    });
    expect(loyalty.eligibleClients).toBe(INITIAL_CLIENT_BOOK.length);
    expect(loyalty.retainedAumIdr).toBeGreaterThanOrEqual(0);
  });
});
