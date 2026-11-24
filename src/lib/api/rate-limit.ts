const WINDOW_MS = 60_000;
const LIMIT = 60;
const windows = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(request: Request): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwardedFor || request.headers.get("x-real-ip") || "anonymous";
  let current = windows.get(key);
  if (!current || current.expiresAt <= now) {
    current = { count: 0, expiresAt: now + WINDOW_MS };
    windows.set(key, current);
  }
  current.count += 1;
  if (windows.size > 5_000) {
    for (const [entryKey, value] of windows) if (value.expiresAt <= now) windows.delete(entryKey);
  }
  return { allowed: current.count <= LIMIT, remaining: Math.max(0, LIMIT - current.count), retryAfter: Math.max(1, Math.ceil((current.expiresAt - now) / 1_000)) };
}

export function rateLimitHeaders(remaining: number): Record<string, string> {
  return { "X-RateLimit-Limit": String(LIMIT), "X-RateLimit-Remaining": String(remaining), "Cache-Control": "no-store" };
}
