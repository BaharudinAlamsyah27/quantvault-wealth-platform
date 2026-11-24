export type AssetCategory = "MONEY_MARKET" | "FIXED_INCOME" | "EQUITY" | "GLOBAL_EQUITY" | "COMMODITY";
export type RiskTier = "LOW" | "MEDIUM" | "HIGH";
export type OptimizationObjective = "RISK_MATCHED" | "MAX_SHARPE" | "MIN_VOLATILITY" | "TARGET_RETURN";
export type BankingRole = "investor" | "advisor" | "intelligence" | "committee";

export interface AssetClass {
  id: string;
  ticker: string;
  name: string;
  category: AssetCategory;
  riskTier: RiskTier;
  isSharia: boolean;
  expenseRatio: number;
  minWeight: number;
  maxWeight: number;
  expectedAnnualReturn: number;
  annualVolatility: number;
  monthlyReturns: number[];
  monthlyPrices: number[];
  periods: string[];
  active?: boolean;
}

export interface OptimizationConstraints {
  objective: OptimizationObjective;
  riskAversion: number;
  riskFreeRate: number;
  maxWeight: number;
  maxRiskyWeight?: number;
  targetReturn?: number;
  shariaOnly: boolean;
  eligibleAssetIds?: string[];
}

export interface PortfolioMetrics {
  expectedReturn: number;
  netExpectedReturn: number;
  weightedExpenseRatio: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  effectiveAssets: number;
  var95: number;
  cvar95: number;
  historicalVaR95: number;
  maxDrawdown: number;
  riskContributions: Record<string, number>;
}

export interface PortfolioPoint extends PortfolioMetrics {
  weights: Record<string, number>;
  objective?: OptimizationObjective;
  label?: string;
}

export interface PortfolioCloudPoint {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  weights: Record<string, number>;
  label: string;
}

export interface OptimizationResult {
  optimal: PortfolioPoint;
  minVolatility: PortfolioPoint;
  maxSharpe: PortfolioPoint;
  benchmarks: {
    equalWeight: PortfolioPoint;
    riskParity: PortfolioPoint;
  };
  frontierPoints: PortfolioPoint[];
  cloudPoints: PortfolioCloudPoint[];
  assets: AssetClass[];
  means: number[];
  covarianceMatrix: number[][];
  correlationMatrix: number[][];
  executionTimeMs: number;
  effectiveMaxWeight: number;
  notices: string[];
}

export interface RebalanceInstruction {
  assetId: string;
  ticker: string;
  name: string;
  currentWeight: number;
  targetWeight: number;
  deltaWeight: number;
  deltaAmountIdr: number;
  action: "BUY" | "SELL" | "HOLD";
  riskContribution: number;
}

export interface RebalanceSummary {
  instructions: RebalanceInstruction[];
  current: PortfolioMetrics;
  recommended: PortfolioPoint;
  returnUplift: number;
  volatilityChange: number;
  sharpeUplift: number;
  totalDrift: number;
}

export interface MonteCarloYearPoint {
  year: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  realP10: number;
  realP50: number;
  realP90: number;
  principal: number;
}

export interface MonteCarloResult {
  points: MonteCarloYearPoint[];
  paths: number;
  probabilityOfTarget: number | null;
  recommendedExtraDcaIdr: number;
}

export interface MacroScenarioImpact {
  id: string;
  name: string;
  description: string;
  portfolioReturn: number;
  estimatedLossIdr: number;
}

export interface RiskAnswerOption {
  label: string;
  score: number;
}

export interface RiskQuestion {
  id: string;
  dimension: string;
  prompt: string;
  options: RiskAnswerOption[];
}

export interface RiskAssessmentResult {
  rawScore: number;
  score: number;
  capacityScore: number;
  toleranceScore: number;
  category: string;
  riskAversion: number;
  maxRiskyWeight: number;
}

export interface DemoPersona {
  id: string;
  cif?: string;
  name: string;
  age: number;
  label: string;
  description: string;
  initialCapitalIdr: number;
  monthlyContributionIdr: number;
  horizonYears: number;
  shariaOnly: boolean;
  riskScore: number;
  riskAversion: number;
  presetAnswers: Record<string, number>;
  currentWeights: Record<string, number>;
}

export interface GovernanceAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail: string;
}
