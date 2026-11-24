import type { DemoPersona, GovernanceAuditEntry } from "@/types/quant";

const STORAGE_KEY = "quantvault-demo-session-v2";

export interface AssetOverride {
  expectedAnnualReturn: number;
  annualVolatility: number;
  expenseRatio: number;
}

export interface DemoSession {
  personaId: string;
  riskFreeRate: number;
  maxWeight: number;
  activeAssets: Record<string, boolean>;
  shariaStatus: Record<string, boolean>;
  assetOverrides: Record<string, AssetOverride>;
  clientWeightsMap: Record<string, Record<string, number>>;
  launchedCampaigns: string[];
  loyaltyActivated: boolean;
  customClients: DemoPersona[];
  auditLog: GovernanceAuditEntry[];
  approvedPersonas: string[];
}

export function createDefaultSession(persona: DemoPersona, assetIds: string[]): DemoSession {
  return {
    personaId: persona.id,
    riskFreeRate: 0.0625,
    maxWeight: 0.35,
    activeAssets: Object.fromEntries(assetIds.map((id) => [id, true])),
    shariaStatus: {},
    assetOverrides: {},
    clientWeightsMap: {},
    launchedCampaigns: [],
    loyaltyActivated: false,
    customClients: [],
    auditLog: [],
    approvedPersonas: [],
  };
}

export function loadDemoSession<T extends DemoSession>(fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    const parsed: unknown = JSON.parse(saved);
    return parsed && typeof parsed === "object" ? ({ ...fallback, ...parsed } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveDemoSession(session: DemoSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Graceful no-op when storage is unavailable
  }
}

export function clearDemoSession(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}
