import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_RISK_FREE_RATE, getReturnsMatrix, MARKET_UNIVERSE } from "@/data/market-universe";
import { estimateMarketStatistics } from "@/lib/quant/statistics";
import { checkRateLimit, rateLimitHeaders } from "@/lib/api/rate-limit";

const querySchema = z.object({ shariaOnly: z.enum(["true", "false"]).optional() });

export function GET(request: Request) {
  const limit = checkRateLimit(request);
  if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429, headers: { ...rateLimitHeaders(limit.remaining), "Retry-After": String(limit.retryAfter) } });
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ shariaOnly: url.searchParams.get("shariaOnly") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query parameters.", issues: parsed.error.issues }, { status: 400, headers: rateLimitHeaders(limit.remaining) });
  const assets = MARKET_UNIVERSE.filter((asset) => !asset.active ? false : parsed.data.shariaOnly !== "true" || asset.isSharia);
  const returnsMatrix = getReturnsMatrix(assets);
  const statistics = estimateMarketStatistics(assets, returnsMatrix);
  return NextResponse.json({ assets, returnsMatrix, means: statistics.means, covarianceMatrix: statistics.covarianceMatrix, correlationMatrix: statistics.correlationMatrix, riskFreeRate: DEFAULT_RISK_FREE_RATE }, { headers: rateLimitHeaders(limit.remaining) });
}
