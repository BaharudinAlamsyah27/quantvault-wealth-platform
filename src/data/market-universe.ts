import type { AssetClass, AssetCategory, RiskTier } from "@/types/quant";

interface AssetSeed {
  id: string;
  ticker: string;
  name: string;
  category: AssetCategory;
  riskTier: RiskTier;
  isSharia: boolean;
  expenseRatio: number;
  expectedAnnualReturn: number;
  annualVolatility: number;
  market: number;
  rates: number;
  gold: number;
  global: number;
}

const seeds: AssetSeed[] = [
  { id: "MM_PUAS", ticker: "RDPU-SYA", name: "Pasar Uang Syariah & Deposito Mudharabah", category: "MONEY_MARKET", riskTier: "LOW", isSharia: true, expenseRatio: 0.0025, expectedAnnualReturn: 0.054, annualVolatility: 0.0085, market: 0.03, rates: 0.12, gold: 0.02, global: 0.01 },
  { id: "MM_CONV", ticker: "RDPU-KON", name: "Reksa Dana Pasar Uang Likuid", category: "MONEY_MARKET", riskTier: "LOW", isSharia: false, expenseRatio: 0.003, expectedAnnualReturn: 0.0565, annualVolatility: 0.009, market: 0.04, rates: 0.14, gold: 0.01, global: 0.01 },
  { id: "FI_SUKUK", ticker: "PBS-SR01", name: "Sukuk Negara Ritel & Proyek (SBSN)", category: "FIXED_INCOME", riskTier: "LOW", isSharia: true, expenseRatio: 0.004, expectedAnnualReturn: 0.0685, annualVolatility: 0.032, market: 0.1, rates: -0.52, gold: 0.08, global: 0.02 },
  { id: "FI_SBN", ticker: "SBN-FR95", name: "Obligasi Negara Fixed Rate (SBN)", category: "FIXED_INCOME", riskTier: "MEDIUM", isSharia: false, expenseRatio: 0.0035, expectedAnnualReturn: 0.071, annualVolatility: 0.041, market: 0.12, rates: -0.66, gold: 0.06, global: 0.03 },
  { id: "FI_CORP", ticker: "SUK-KORP", name: "Sukuk Korporasi Grade AAA", category: "FIXED_INCOME", riskTier: "MEDIUM", isSharia: true, expenseRatio: 0.006, expectedAnnualReturn: 0.079, annualVolatility: 0.0485, market: 0.2, rates: -0.24, gold: 0.05, global: 0.03 },
  { id: "EQ_JII", ticker: "IDX-JII70", name: "Ekuitas Unggulan Syariah (JII-70 Proxy)", category: "EQUITY", riskTier: "HIGH", isSharia: true, expenseRatio: 0.008, expectedAnnualReturn: 0.118, annualVolatility: 0.164, market: 0.78, rates: 0.02, gold: -0.12, global: 0.08 },
  { id: "EQ_LQ45", ticker: "IDX-LQ45", name: "Ekuitas Bluechip Nasional (LQ45 Proxy)", category: "EQUITY", riskTier: "HIGH", isSharia: false, expenseRatio: 0.007, expectedAnnualReturn: 0.124, annualVolatility: 0.172, market: 0.86, rates: 0.04, gold: -0.1, global: 0.12 },
  { id: "EQ_DIV", ticker: "IDX-HIDIV", name: "Ekuitas Dividen Tinggi & Perbankan", category: "EQUITY", riskTier: "HIGH", isSharia: false, expenseRatio: 0.009, expectedAnnualReturn: 0.132, annualVolatility: 0.185, market: 0.92, rates: 0.1, gold: -0.08, global: 0.1 },
  { id: "EQ_TECH", ticker: "GLB-SHARIA", name: "Ekuitas Teknologi & Kesehatan Global Syariah", category: "GLOBAL_EQUITY", riskTier: "HIGH", isSharia: true, expenseRatio: 0.01, expectedAnnualReturn: 0.149, annualVolatility: 0.228, market: 0.64, rates: 0.16, gold: -0.04, global: 0.72 },
  { id: "CM_GOLD", ticker: "GOLD-ANTM", name: "Emas Murni Fisik / Digital (Hedging Inflasi)", category: "COMMODITY", riskTier: "MEDIUM", isSharia: true, expenseRatio: 0.005, expectedAnnualReturn: 0.096, annualVolatility: 0.121, market: -0.12, rates: -0.08, gold: 0.82, global: 0.08 },
];

const MONTH_COUNT = 60;
const periods = Array.from({ length: MONTH_COUNT }, (_, index) => {
  const date = new Date(Date.UTC(2021, 10 + index, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
});

function factorSeries(index: number) {
  const marketShock = index === 31 ? -2.8 : index === 32 ? 1.55 : index === 48 ? -1.35 : 0;
  const rateShock = index >= 17 && index <= 21 ? 0.55 : index === 31 ? -0.35 : 0;
  const market = Math.sin(index * 0.62) * 0.48 + Math.cos(index * 0.19) * 0.23 + marketShock;
  const rates = Math.sin(index * 0.26 + 0.8) * 0.6 + Math.cos(index * 0.11) * 0.22 + rateShock;
  const gold = Math.cos(index * 0.21 + 0.5) * 0.66 - market * 0.14 + Math.sin(index * 0.47) * 0.2;
  const global = Math.sin(index * 0.51 + 1.1) * 0.65 + Math.cos(index * 0.15 + 0.3) * 0.28 + marketShock * 0.72;
  return { market, rates, gold, global };
}

function calibratedReturns(seed: AssetSeed, assetIndex: number): number[] {
  const raw = Array.from({ length: MONTH_COUNT }, (_, month) => {
    const factors = factorSeries(month);
    const idiosyncratic = Math.sin(month * (0.37 + assetIndex * 0.013) + assetIndex * 0.91) * 0.38
      + Math.cos(month * (0.79 + assetIndex * 0.009) + assetIndex * 0.41) * 0.2;
    return seed.market * factors.market + seed.rates * factors.rates + seed.gold * factors.gold + seed.global * factors.global + idiosyncratic;
  });
  const average = raw.reduce((sum, value) => sum + value, 0) / raw.length;
  const sampleVariance = raw.reduce((sum, value) => sum + (value - average) ** 2, 0) / (raw.length - 1);
  const targetMean = seed.expectedAnnualReturn / 12;
  const targetMonthlyVolatility = seed.annualVolatility / Math.sqrt(12);
  return raw.map((value) => targetMean + ((value - average) / Math.sqrt(sampleVariance)) * targetMonthlyVolatility);
}

export const MARKET_UNIVERSE: AssetClass[] = seeds.map((seed, index) => {
  const monthlyReturns = calibratedReturns(seed, index);
  let price = 1_000;
  const monthlyPrices = [price];
  for (const value of monthlyReturns) {
    price *= 1 + value;
    monthlyPrices.push(price);
  }
  return {
    ...seed,
    minWeight: 0,
    maxWeight: 0.4,
    monthlyReturns,
    monthlyPrices,
    periods,
    active: true,
  };
});

export const MARKET_PERIODS = periods;
export const DEFAULT_RISK_FREE_RATE = 0.0625;
export const DEFAULT_SHRINKAGE = 0.15;

export function getReturnsMatrix(assets: AssetClass[] = MARKET_UNIVERSE): number[][] {
  if (assets.length === 0) return [];
  const periodsCount = Math.min(...assets.map((asset) => asset.monthlyReturns.length));
  return Array.from({ length: periodsCount }, (_, month) => assets.map((asset) => asset.monthlyReturns[month] ?? 0));
}

/**
 * Recalibrate an asset's 60-month return series when the Risk Committee
 * manually overrides expectedAnnualReturn or annualVolatility.
 */
export function recalibrateAsset(
  asset: AssetClass,
  expectedAnnualReturn: number,
  annualVolatility: number,
  expenseRatio: number,
): AssetClass {
  const returns = asset.monthlyReturns;
  const n = returns.length;
  if (n < 2) return { ...asset, expectedAnnualReturn, annualVolatility, expenseRatio };
  const oldMean = returns.reduce((sum, v) => sum + v, 0) / n;
  const oldVar = returns.reduce((sum, v) => sum + (v - oldMean) ** 2, 0) / (n - 1);
  const oldStd = Math.sqrt(Math.max(1e-12, oldVar));
  const targetMean = expectedAnnualReturn / 12;
  const targetStd = Math.max(0.001, annualVolatility) / Math.sqrt(12);
  const monthlyReturns = returns.map((v) => targetMean + ((v - oldMean) / oldStd) * targetStd);
  let price = 1_000;
  const monthlyPrices = [price];
  for (const r of monthlyReturns) {
    price *= Math.max(0.01, 1 + r);
    monthlyPrices.push(price);
  }
  return {
    ...asset,
    expectedAnnualReturn,
    annualVolatility,
    expenseRatio,
    monthlyReturns,
    monthlyPrices,
  };
}
