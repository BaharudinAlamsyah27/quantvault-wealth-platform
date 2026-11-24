import type { MonteCarloResult, MonteCarloYearPoint } from "@/types/quant";

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function runSimulationPaths(options: {
  initialCapital: number;
  contribution: number;
  expectedReturn: number;
  annualVolatility: number;
  horizonYears: number;
  paths: number;
  seed: number;
  inflationRate: number;
}) {
  const random = mulberry32(options.seed);
  let spareNormal: number | null = null;
  const normal = () => {
    if (spareNormal !== null) {
      const result = spareNormal;
      spareNormal = null;
      return result;
    }
    const first = Math.max(random(), 1e-12);
    const second = random();
    const magnitude = Math.sqrt(-2 * Math.log(first));
    const angle = 2 * Math.PI * second;
    spareNormal = magnitude * Math.sin(angle);
    return magnitude * Math.cos(angle);
  };
  const values = Array.from({ length: options.paths }, () => options.initialCapital);
  const points: MonteCarloYearPoint[] = [
    {
      year: 0,
      p10: options.initialCapital,
      p25: options.initialCapital,
      p50: options.initialCapital,
      p75: options.initialCapital,
      p90: options.initialCapital,
      realP10: options.initialCapital,
      realP50: options.initialCapital,
      realP90: options.initialCapital,
      principal: options.initialCapital,
    },
  ];
  const dt = 1 / 12;
  const drift = (options.expectedReturn - 0.5 * options.annualVolatility ** 2) * dt;
  const diffusion = options.annualVolatility * Math.sqrt(dt);
  for (let month = 1; month <= options.horizonYears * 12; month += 1) {
    for (let path = 0; path < options.paths; path += 1) {
      values[path] = (values[path] + options.contribution) * Math.exp(drift + diffusion * normal());
    }
    if (month % 12 === 0) {
      const year = month / 12;
      const deflator = Math.pow(1 + options.inflationRate, year);
      const ordered = [...values].sort((a, b) => a - b);
      const quantile = (probability: number) => {
        const position = (ordered.length - 1) * probability;
        const lower = Math.floor(position);
        const upper = Math.ceil(position);
        return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower);
      };
      const p10 = quantile(0.1);
      const p50 = quantile(0.5);
      const p90 = quantile(0.9);
      points.push({
        year,
        p10,
        p25: quantile(0.25),
        p50,
        p75: quantile(0.75),
        p90,
        realP10: p10 / deflator,
        realP50: p50 / deflator,
        realP90: p90 / deflator,
        principal: options.initialCapital + options.contribution * month,
      });
    }
  }
  return { points, terminalValues: values };
}

export function simulateMonteCarlo(options: {
  initialCapitalIdr: number;
  monthlyContributionIdr: number;
  expectedReturn: number;
  volatility: number;
  horizonYears: number;
  paths?: number;
  seed?: number;
  targetIdr?: number;
  inflationRate?: number;
}): MonteCarloResult {
  const paths = Math.max(1, Math.floor(options.paths ?? 1_000));
  const horizonYears = Math.max(1, Math.min(20, Math.floor(options.horizonYears)));
  const initialCapital = Math.max(0, options.initialCapitalIdr);
  const contribution = Math.max(0, options.monthlyContributionIdr);
  const annualVolatility = Math.max(0, options.volatility);
  const inflationRate = Math.max(0, Math.min(0.15, options.inflationRate ?? 0.03));
  const seed = options.seed ?? 26_026;

  const { points, terminalValues } = runSimulationPaths({
    initialCapital,
    contribution,
    expectedReturn: options.expectedReturn,
    annualVolatility,
    horizonYears,
    paths,
    seed,
    inflationRate,
  });

  const target = options.targetIdr;
  const probabilityOfTarget = target && target > 0 ? terminalValues.filter((value) => value >= target).length / paths : null;

  let recommendedExtraDcaIdr = 0;
  if (target && target > 0 && probabilityOfTarget !== null && probabilityOfTarget < 0.75) {
    let low = 0;
    let high = Math.max(1_000_000, Math.ceil(target / (horizonYears * 12)));
    for (let iter = 0; iter < 8; iter += 1) {
      const mid = (low + high) / 2;
      const probe = runSimulationPaths({
        initialCapital,
        contribution: contribution + mid,
        expectedReturn: options.expectedReturn,
        annualVolatility,
        horizonYears,
        paths: 120,
        seed,
        inflationRate,
      });
      const prob = probe.terminalValues.filter((v) => v >= target).length / 120;
      if (prob >= 0.75) high = mid;
      else low = mid;
    }
    recommendedExtraDcaIdr = Math.ceil(high / 50_000) * 50_000;
  }

  return { points, paths, probabilityOfTarget, recommendedExtraDcaIdr };
}
