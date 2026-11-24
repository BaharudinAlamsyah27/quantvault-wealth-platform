import type { AdvisorClientSummary } from "@/components/advisor/AdvisorDeskPanel";

export type CustomerSegmentName =
  | "VIP Accumulator"
  | "Core Growth"
  | "Yield Seeker"
  | "At-Risk Dormant";

export interface EnrichedCustomerMetric {
  clientId: string;
  cif: string;
  name: string;
  label: string;
  shariaOnly: boolean;
  aumIdr: number;
  monthlyDcaIdr: number;
  recencyDays: number;
  frequencyPerYear: number;
  rfmScore: number; // 1.0 - 5.0
  segment: CustomerSegmentName;
  drift: number;
  sharpeGap: number;
  suitabilityStatus: "SUITABLE" | "BREACH";
  churnProbability: number; // 0 - 1
  churnRisk: "LOW" | "MEDIUM" | "HIGH";
  churnDrivers: string[];
  recommendedAction: string;
  loyaltyTier: "Platinum" | "Gold" | "Silver";
}

export interface SegmentSummary {
  segment: CustomerSegmentName;
  count: number;
  totalAumIdr: number;
  avgChurnProbability: number;
  avgRfmScore: number;
  color: string;
}

export interface AbTestResult {
  targetSegment: string;
  audienceSize: number;
  controlSize: number;
  treatmentSize: number;
  controlRate: number;
  treatmentRate: number;
  relativeLift: number;
  zScore: number;
  pValue: number;
  statisticallySignificant: boolean;
  incrementalConversions: number;
  incrementalAumIdr: number;
  campaignCostIdr: number;
  estimatedAnnualFeeRevenueIdr: number;
  netRoiPercent: number;
}

export interface LoyaltySimulationResult {
  eligibleClients: number;
  totalTrackedAumIdr: number;
  atRiskAumIdr: number;
  retainedAumIdr: number;
  annualRewardCostIdr: number;
  retainedAnnualFeeRevenueIdr: number;
  netBenefitIdr: number;
  loyaltyRoiPercent: number;
  tierBreakdown: {
    tier: "Platinum" | "Gold" | "Silver";
    count: number;
    totalAumIdr: number;
    rewardCostIdr: number;
  }[];
}

function deterministicHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4_294_967_295;
}

/**
 * Standard normal complementary error function approximation for two-tailed p-value
 */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

export function analyzeCustomerIntelligence(
  clients: AdvisorClientSummary[],
  interventions?: { launchedCampaigns?: string[]; loyaltyActivated?: boolean },
): {
  customers: EnrichedCustomerMetric[];
  segments: SegmentSummary[];
} {
  if (clients.length === 0) return { customers: [], segments: [] };

  // 1. Derive deterministic behavioral RFM features + risk/drift signals
  const rawFeatures = clients.map((item) => {
    const h1 = deterministicHash(item.persona.id + ":recency");
    const h2 = deterministicHash(item.persona.id + ":freq");
    const drift =
      Object.keys(item.optimal.weights).reduce(
        (sum, id) => sum + Math.abs((item.optimal.weights[id] ?? 0) - (item.current.weights[id] ?? 0)),
        0,
      ) / 2;
    const sharpeGap = Math.max(0, item.optimal.sharpeRatio - item.current.sharpeRatio);

    // Higher drift & lower DCA correlate with higher recency (less recent engagement)
    const recencyDays = Math.round(
      5 + h1 * 85 + (drift > 0.35 ? 35 : 0) + (item.persona.monthlyContributionIdr < 2_500_000 ? 20 : 0),
    );
    const frequencyPerYear = Math.max(
      2,
      Math.round(4 + (item.persona.monthlyContributionIdr / 1_000_000) * 1.8 + h2 * 6),
    );
    const aumIdr = item.persona.initialCapitalIdr;
    return { item, drift, sharpeGap, recencyDays, frequencyPerYear, aumIdr };
  });

  // 2. Standardize [Recency (inverted), Frequency, Monetary] for K-Means (K = 4)
  const rVals = rawFeatures.map((f) => -f.recencyDays);
  const fVals = rawFeatures.map((f) => f.frequencyPerYear);
  const mVals = rawFeatures.map((f) => Math.log10(Math.max(1_000_000, f.aumIdr)));

  const standardize = (arr: number[]) => {
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    const std = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, arr.length)) || 1;
    return arr.map((v) => (v - mean) / std);
  };

  const zR = standardize(rVals);
  const zF = standardize(fVals);
  const zM = standardize(mVals);
  const vectors = rawFeatures.map((_, i) => [zR[i], zF[i], zM[i]]);

  // Deterministic K-Means (K=4) seeded from quartile composites
  const compositeScores = vectors.map((v, i) => ({ i, score: v[0] * 0.35 + v[1] * 0.3 + v[2] * 0.35 }));
  compositeScores.sort((a, b) => b.score - a.score);
  const pickIdx = (q: number) => compositeScores[Math.min(compositeScores.length - 1, Math.floor(q * compositeScores.length))].i;
  let centroids = [
    [...vectors[pickIdx(0.08)]],
    [...vectors[pickIdx(0.35)]],
    [...vectors[pickIdx(0.65)]],
    [...vectors[pickIdx(0.92)]],
  ];
  const assignments = new Array<number>(vectors.length).fill(0);

  for (let iter = 0; iter < 25; iter += 1) {
    let changed = false;
    for (let i = 0; i < vectors.length; i += 1) {
      let bestC = 0;
      let bestDist = Infinity;
      for (let c = 0; c < 4; c += 1) {
        const d =
          (vectors[i][0] - centroids[c][0]) ** 2 +
          (vectors[i][1] - centroids[c][1]) ** 2 +
          (vectors[i][2] - centroids[c][2]) ** 2;
        if (d < bestDist) {
          bestDist = d;
          bestC = c;
        }
      }
      if (assignments[i] !== bestC) {
        assignments[i] = bestC;
        changed = true;
      }
    }
    if (!changed && iter > 2) break;
    centroids = centroids.map((old, c) => {
      const members = vectors.filter((_, i) => assignments[i] === c);
      if (members.length === 0) return old;
      return [
        members.reduce((s, v) => s + v[0], 0) / members.length,
        members.reduce((s, v) => s + v[1], 0) / members.length,
        members.reduce((s, v) => s + v[2], 0) / members.length,
      ];
    });
  }

  // Order cluster IDs by composite centroid quality so segment labels are semantically consistent
  const clusterOrder = centroids
    .map((c, idx) => ({ idx, value: c[0] * 0.35 + c[1] * 0.3 + c[2] * 0.35 }))
    .sort((a, b) => b.value - a.value)
    .map((entry) => entry.idx);

  const segmentNames: CustomerSegmentName[] = [
    "VIP Accumulator",
    "Core Growth",
    "Yield Seeker",
    "At-Risk Dormant",
  ];
  const clusterToSegment = new Map<number, CustomerSegmentName>();
  clusterOrder.forEach((clusterIdx, rank) => {
    clusterToSegment.set(clusterIdx, segmentNames[rank] ?? "Core Growth");
  });

  // 3. Build enriched records with Logistic Churn Prediction (#21) & Loyalty Tier (#24)
  const customers: EnrichedCustomerMetric[] = rawFeatures.map((feat, idx) => {
    const segment = clusterToSegment.get(assignments[idx]) ?? "Core Growth";
    const rfmRaw = 3 + vectors[idx][0] * 0.65 + vectors[idx][1] * 0.55 + vectors[idx][2] * 0.65;
    const rfmScore = Number(Math.min(5, Math.max(1, rfmRaw)).toFixed(2));

    // Logistic churn model (with real-time retention intervention effect from #22 & #24)
    const activeCampaigns = interventions?.launchedCampaigns ?? [];
    const hasCampaign =
      activeCampaigns.includes("ALL") ||
      activeCampaigns.includes(segment) ||
      (feat.item.persona.shariaOnly && activeCampaigns.includes("SHARIA"));
    const logit =
      -2.35 +
      (feat.recencyDays / 45) * 1.15 +
      feat.drift * 1.85 +
      feat.sharpeGap * 0.85 +
      (feat.item.suitabilityStatus === "BREACH" ? 0.9 : 0) -
      (feat.frequencyPerYear / 12) * 0.65 -
      (hasCampaign ? 0.55 : 0) -
      (interventions?.loyaltyActivated ? 0.45 : 0);
    const churnProbability = Number((1 / (1 + Math.exp(-logit))).toFixed(4));
    const churnRisk: "LOW" | "MEDIUM" | "HIGH" =
      churnProbability >= 0.55 ? "HIGH" : churnProbability >= 0.3 ? "MEDIUM" : "LOW";

    const drivers: string[] = [];
    if (feat.recencyDays >= 60) drivers.push(`Tidak aktif ${feat.recencyDays} hari`);
    if (feat.drift >= 0.25) drivers.push(`Drift portofolio tinggi (${(feat.drift * 100).toFixed(0)}%)`);
    if (feat.sharpeGap >= 0.35) drivers.push(`Sharpe tertinggal −${feat.sharpeGap.toFixed(2)}`);
    if (feat.item.suitabilityStatus === "BREACH") drivers.push("POJK Suitability Breach");
    if (drivers.length === 0) drivers.push("Engagement stabil & portofolio efisien");

    const recommendedAction =
      churnRisk === "HIGH"
        ? "Hubungi RM + tawarkan Rebalance bebas biaya & bonus loyalitas"
        : churnRisk === "MEDIUM"
          ? "Kirim notifikasi auto-DCA & ringkasan IPS"
          : "Pertahankan retensi & tawarkan upsell produk Syariah/SBN";

    const loyaltyTier: "Platinum" | "Gold" | "Silver" =
      feat.aumIdr >= 250_000_000 ? "Platinum" : feat.aumIdr >= 100_000_000 ? "Gold" : "Silver";

    return {
      clientId: feat.item.persona.id,
      cif: feat.item.persona.cif ?? `CIF-${1001 + idx}`,
      name: feat.item.persona.name,
      label: feat.item.persona.label,
      shariaOnly: feat.item.persona.shariaOnly,
      aumIdr: feat.aumIdr,
      monthlyDcaIdr: feat.item.persona.monthlyContributionIdr,
      recencyDays: feat.recencyDays,
      frequencyPerYear: feat.frequencyPerYear,
      rfmScore,
      segment,
      drift: feat.drift,
      sharpeGap: feat.sharpeGap,
      suitabilityStatus: feat.item.suitabilityStatus,
      churnProbability,
      churnRisk,
      churnDrivers: drivers.slice(0, 2),
      recommendedAction,
      loyaltyTier,
    };
  });

  const colors: Record<CustomerSegmentName, string> = {
    "VIP Accumulator": "#0f766e",
    "Core Growth": "#1d4ed8",
    "Yield Seeker": "#d97706",
    "At-Risk Dormant": "#b91c1c",
  };

  const segments: SegmentSummary[] = segmentNames.map((seg) => {
    const list = customers.filter((c) => c.segment === seg);
    const totalAumIdr = list.reduce((s, c) => s + c.aumIdr, 0);
    const avgChurnProbability = list.length ? list.reduce((s, c) => s + c.churnProbability, 0) / list.length : 0;
    const avgRfmScore = list.length ? list.reduce((s, c) => s + c.rfmScore, 0) / list.length : 0;
    return { segment: seg, count: list.length, totalAumIdr, avgChurnProbability, avgRfmScore, color: colors[seg] };
  });

  return { customers, segments };
}

export function simulateAbCampaign(options: {
  targetSegment: string;
  audienceSize: number;
  totalBankPopulation?: number;
  segmentShare?: number;
  baseConversionRate: number;
  treatmentLiftRate: number;
  costPerClientIdr: number;
  avgTopUpPerConversionIdr: number;
  bankFeeBps?: number;
}): AbTestResult {
  // Transparent population scaling: use explicit bank population * segment share if provided
  const scaledAudience =
    options.totalBankPopulation && options.segmentShare !== undefined
      ? Math.max(40, Math.round(options.totalBankPopulation * Math.max(0.04, options.segmentShare)))
      : Math.max(40, options.audienceSize);
  const controlSize = Math.floor(scaledAudience / 2);
  const treatmentSize = scaledAudience - controlSize;
  const p1 = Math.min(0.95, Math.max(0.01, options.baseConversionRate));
  const p2 = Math.min(0.98, Math.max(0.01, p1 + options.treatmentLiftRate));

  const x1 = Math.round(controlSize * p1);
  const x2 = Math.round(treatmentSize * p2);
  const pooledP = (x1 + x2) / (controlSize + treatmentSize);
  const se = Math.sqrt(Math.max(1e-12, pooledP * (1 - pooledP) * (1 / controlSize + 1 / treatmentSize)));
  const zScore = (p2 - p1) / se;
  const pValue = Math.min(1, Math.max(0, 2 * (1 - normalCdf(Math.abs(zScore)))));
  const statisticallySignificant = pValue < 0.05;

  const incrementalConversions = Math.max(0, Math.round(treatmentSize * (p2 - p1)));
  const incrementalAumIdr = incrementalConversions * options.avgTopUpPerConversionIdr;
  const campaignCostIdr = treatmentSize * options.costPerClientIdr;
  const feeRate = (options.bankFeeBps ?? 125) / 10_000; // 1.25% annual AUM fee/margin
  const estimatedAnnualFeeRevenueIdr = incrementalAumIdr * feeRate;
  const netRoiPercent =
    campaignCostIdr > 0
      ? ((estimatedAnnualFeeRevenueIdr - campaignCostIdr) / campaignCostIdr) * 100
      : 0;

  return {
    targetSegment: options.targetSegment,
    audienceSize: scaledAudience,
    controlSize,
    treatmentSize,
    controlRate: p1,
    treatmentRate: p2,
    relativeLift: ((p2 - p1) / Math.max(1e-6, p1)) * 100,
    zScore,
    pValue,
    statisticallySignificant,
    incrementalConversions,
    incrementalAumIdr,
    campaignCostIdr,
    estimatedAnnualFeeRevenueIdr,
    netRoiPercent,
  };
}

export function simulateLoyaltyProgram(
  customers: EnrichedCustomerMetric[],
  options: {
    platinumRewardBps: number;
    goldRewardBps: number;
    silverRewardBps: number;
    churnReductionEffectiveness: number; // e.g. 0.45 (45% of churn risk prevented)
    targetedRetentionOnly?: boolean; // Only grant reward to MEDIUM/HIGH churn clients to eliminate free-rider cost
    bankMarginBps?: number; // e.g. 125 bps (1.25%)
  },
): LoyaltySimulationResult {
  const bankMarginRate = (options.bankMarginBps ?? 125) / 10_000;
  const rateByTier = {
    Platinum: options.platinumRewardBps / 10_000,
    Gold: options.goldRewardBps / 10_000,
    Silver: options.silverRewardBps / 10_000,
  };

  let totalTrackedAumIdr = 0;
  let atRiskAumIdr = 0;
  let annualRewardCostIdr = 0;
  let eligibleClients = 0;

  const tiers: ("Platinum" | "Gold" | "Silver")[] = ["Platinum", "Gold", "Silver"];
  const tierMap = {
    Platinum: { count: 0, totalAumIdr: 0, rewardCostIdr: 0 },
    Gold: { count: 0, totalAumIdr: 0, rewardCostIdr: 0 },
    Silver: { count: 0, totalAumIdr: 0, rewardCostIdr: 0 },
  };

  for (const c of customers) {
    totalTrackedAumIdr += c.aumIdr;
    atRiskAumIdr += c.aumIdr * c.churnProbability;
    const receivesReward = !options.targetedRetentionOnly || c.churnRisk !== "LOW";
    const cost = receivesReward ? c.aumIdr * rateByTier[c.loyaltyTier] : 0;
    if (receivesReward) eligibleClients += 1;
    annualRewardCostIdr += cost;
    tierMap[c.loyaltyTier].count += 1;
    tierMap[c.loyaltyTier].totalAumIdr += c.aumIdr;
    tierMap[c.loyaltyTier].rewardCostIdr += cost;
  }

  const retainedAumIdr = atRiskAumIdr * Math.min(0.85, Math.max(0, options.churnReductionEffectiveness));
  const retainedAnnualFeeRevenueIdr = retainedAumIdr * bankMarginRate;
  const netBenefitIdr = retainedAnnualFeeRevenueIdr - annualRewardCostIdr;
  const loyaltyRoiPercent = annualRewardCostIdr > 0 ? (netBenefitIdr / annualRewardCostIdr) * 100 : 0;

  return {
    eligibleClients,
    totalTrackedAumIdr,
    atRiskAumIdr,
    retainedAumIdr,
    annualRewardCostIdr,
    retainedAnnualFeeRevenueIdr,
    netBenefitIdr,
    loyaltyRoiPercent,
    tierBreakdown: tiers.map((tier) => ({ tier, ...tierMap[tier] })),
  };
}
