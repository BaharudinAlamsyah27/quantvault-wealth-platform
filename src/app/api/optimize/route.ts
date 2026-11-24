import { NextResponse } from "next/server";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { z } from "zod";
import { getReturnsMatrix, MARKET_UNIVERSE, recalibrateAsset } from "@/data/market-universe";
import { checkRateLimit, rateLimitHeaders } from "@/lib/api/rate-limit";
import { optimizePortfolio } from "@/lib/quant/markowitz";
import { estimateMarketStatistics } from "@/lib/quant/statistics";
import { calculateRebalance } from "@/lib/quant/rebalancer";

const optimizeSchema = z.object({
  objective: z.enum(["RISK_MATCHED", "MAX_SHARPE", "MIN_VOLATILITY", "TARGET_RETURN"]).default("RISK_MATCHED"),
  riskAversion: z.number().min(0.1).max(50).default(2.6),
  targetReturn: z.number().min(-1).max(2).optional(),
  maxWeight: z.number().min(0.01).max(1).default(0.35),
  maxRiskyWeight: z.number().min(0.1).max(1).optional(),
  riskFreeRate: z.number().min(0).max(0.5).default(0.0625),
  shariaOnly: z.boolean().default(false),
  activeAssets: z.record(z.string(), z.boolean()).optional(),
  shariaStatus: z.record(z.string(), z.boolean()).optional(),
  assetOverrides: z.record(z.string(), z.object({
    expectedAnnualReturn: z.number().min(0).max(0.6),
    annualVolatility: z.number().min(0.001).max(0.8),
    expenseRatio: z.number().min(0).max(0.05),
  })).optional(),
  currentWeights: z.record(z.string(), z.number().min(0).max(1)).optional(),
  initialCapitalIdr: z.number().min(100_000).max(100_000_000_000_000).default(100_000_000),
  monthlyContributionIdr: z.number().min(0).max(10_000_000_000).default(3_000_000),
  horizonYears: z.number().int().min(1).max(20).default(10),
  verifyWithPython: z.boolean().default(false),
});

export async function POST(request: Request) {
  const limit = checkRateLimit(request);
  if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429, headers: { ...rateLimitHeaders(limit.remaining), "Retry-After": String(limit.retryAfter) } });
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 16 * 1024) return NextResponse.json({ error: "Request body must be smaller than 16 KB." }, { status: 413, headers: rateLimitHeaders(limit.remaining) });
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Unable to read request body." }, { status: 400, headers: rateLimitHeaders(limit.remaining) });
  }
  if (new TextEncoder().encode(rawBody).byteLength > 16 * 1024) return NextResponse.json({ error: "Request body must be smaller than 16 KB." }, { status: 413, headers: rateLimitHeaders(limit.remaining) });
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Request body must contain valid JSON." }, { status: 400, headers: rateLimitHeaders(limit.remaining) }); }
  const parsed = optimizeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid optimization request.", issues: parsed.error.issues }, { status: 400, headers: rateLimitHeaders(limit.remaining) });
  const input = parsed.data;
  const policyAssets = MARKET_UNIVERSE.map((asset) => {
    const override = input.assetOverrides?.[asset.id];
    const base = override
      ? recalibrateAsset(asset, override.expectedAnnualReturn, override.annualVolatility, override.expenseRatio)
      : asset;
    return {
      ...base,
      isSharia: input.shariaStatus?.[asset.id] ?? asset.isSharia,
      active: input.activeAssets?.[asset.id] !== undefined ? input.activeAssets[asset.id] : asset.active !== false,
    };
  });
  const returnsMatrix = getReturnsMatrix(policyAssets);
  const result = optimizePortfolio(policyAssets, returnsMatrix, {
    objective: input.objective,
    riskAversion: input.riskAversion,
    riskFreeRate: input.riskFreeRate,
    maxWeight: input.maxWeight,
    maxRiskyWeight: input.maxRiskyWeight,
    targetReturn: input.targetReturn,
    shariaOnly: input.shariaOnly,
  });
  const rebalanceActions = input.currentWeights ? calculateRebalance({ assets: policyAssets, currentWeights: input.currentWeights, optimal: result.optimal, portfolioValueIdr: input.initialCapitalIdr, riskFreeRate: input.riskFreeRate }).instructions : [];
  let pythonVerification: unknown;
  if (input.verifyWithPython) {
    const statistics = estimateMarketStatistics(policyAssets, returnsMatrix);
    const pythonPayload = {
      means: statistics.means,
      covarianceMatrix: statistics.covarianceMatrix,
      returnsMatrix,
      objective: input.objective,
      riskAversion: input.riskAversion,
      targetReturn: input.targetReturn,
      riskFreeRate: input.riskFreeRate,
      maxWeight: result.effectiveMaxWeight,
      shariaOnly: input.shariaOnly,
      assets: policyAssets.map((asset) => ({ id: asset.id, isSharia: asset.isSharia, active: asset.active !== false })),
    };
    if (process.env.VERCEL) {
      try {
        const pythonResponse = await fetch(new URL("/api/py/optimize", request.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pythonPayload),
          signal: AbortSignal.timeout(3_500),
        });
        pythonVerification = pythonResponse.ok ? await pythonResponse.json() : { available: false, status: pythonResponse.status };
      } catch (error) {
        pythonVerification = { available: false, message: error instanceof Error ? error.message : "Python engine unavailable." };
      }
    } else {
      try {
        const scriptDir = path.join(process.cwd(), "api", "py");
        const localProc = spawnSync(
          "python",
          ["-c", "import json, sys, optimize; print(json.dumps(optimize._handler(json.load(sys.stdin))))"],
          { cwd: scriptDir, input: JSON.stringify(pythonPayload), encoding: "utf-8", timeout: 4_000 },
        );
        if (localProc.status === 0 && localProc.stdout) {
          pythonVerification = JSON.parse(localProc.stdout.trim());
        } else {
          pythonVerification = { available: false, message: localProc.stderr?.trim() || "Local Python SLSQP execution failed." };
        }
      } catch (error) {
        pythonVerification = { available: false, message: error instanceof Error ? error.message : "Local Python runtime unavailable." };
      }
    }
  }
  return NextResponse.json({ ...result, rebalanceActions, engine: "typescript-projected-gradient", pythonVerification }, { headers: rateLimitHeaders(limit.remaining) });
}
