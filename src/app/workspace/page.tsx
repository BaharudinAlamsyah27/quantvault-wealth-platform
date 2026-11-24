"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { SidebarNav, type AppTheme, type InvestorTab } from "@/components/layout/SidebarNav";
import { AdvisorDeskPanel, type AdvisorClientSummary } from "@/components/advisor/AdvisorDeskPanel";
import { CustomerIntelligencePanel, type IntelligenceTab } from "@/components/analytics/CustomerIntelligencePanel";
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap";
import { EfficientFrontierChart } from "@/components/charts/EfficientFrontierChart";
import { HistoricalBacktestChart } from "@/components/charts/HistoricalBacktestChart";
import { MonteCarloChart } from "@/components/charts/MonteCarloChart";
import { RiskGovernancePanel } from "@/components/governance/RiskGovernancePanel";
import { AllocationTable } from "@/components/portfolio/AllocationTable";
import { IpsReportModal } from "@/components/portfolio/IpsReportModal";
import { MacroStressTestCard } from "@/components/portfolio/MacroStressTestCard";
import { RebalanceCalculator } from "@/components/portfolio/RebalanceCalculator";
import { RiskQuestionnaire } from "@/components/profiler/RiskQuestionnaire";
import { DEFAULT_PERSONA, INITIAL_CLIENT_BOOK } from "@/data/demo-personas";
import { DEFAULT_RISK_FREE_RATE, getReturnsMatrix, MARKET_UNIVERSE, recalibrateAsset } from "@/data/market-universe";
import { assessRisk } from "@/data/risk-questions";
import { optimizeFastSingle, optimizePortfolio, evaluateWeights } from "@/lib/quant/markowitz";
import { simulateMonteCarlo } from "@/lib/quant/monte-carlo";
import { calculateRebalance, evaluateSuitability } from "@/lib/quant/rebalancer";
import { formatIdr, formatPercent } from "@/lib/utils/formatters";
import { clearDemoSession, createDefaultSession, loadDemoSession, saveDemoSession, type AssetOverride } from "@/lib/storage/demo-session";
import { HelpTip } from "@/components/ui/HelpTip";
import type { BankingRole, DemoPersona, GovernanceAuditEntry, OptimizationObjective } from "@/types/quant";

const defaultAnswers = DEFAULT_PERSONA.presetAnswers;
const defaultSession = createDefaultSession(DEFAULT_PERSONA, MARKET_UNIVERSE.map((asset) => asset.id));

export default function WorkspacePage() {
  const [role, setRole] = useState<BankingRole>("investor");
  const [investorTab, setInvestorTab] = useState<InvestorTab>("frontier");
  const [intelligenceTab, setIntelligenceTab] = useState<IntelligenceTab>("rfm");
  const [persona, setPersona] = useState<DemoPersona>(DEFAULT_PERSONA);
  const [riskFreeRate, setRiskFreeRate] = useState(DEFAULT_RISK_FREE_RATE);
  const [globalMaxWeight, setGlobalMaxWeight] = useState(0.35);
  const [shariaOnly, setShariaOnly] = useState(DEFAULT_PERSONA.shariaOnly);
  const [activeAssets, setActiveAssets] = useState<Record<string, boolean>>(defaultSession.activeAssets);
  const [shariaStatus, setShariaStatus] = useState<Record<string, boolean>>({});
  const [assetOverrides, setAssetOverrides] = useState<Record<string, AssetOverride>>({});
  const [clientWeightsMap, setClientWeightsMap] = useState<Record<string, Record<string, number>>>({});
  const [launchedCampaigns, setLaunchedCampaigns] = useState<string[]>([]);
  const [loyaltyActivated, setLoyaltyActivated] = useState(false);
  const [customClients, setCustomClients] = useState<DemoPersona[]>([]);
  const [auditLog, setAuditLog] = useState<GovernanceAuditEntry[]>([]);
  const [approvedIds, setApprovedIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>(defaultAnswers);
  const [quizTouched, setQuizTouched] = useState(false);
  const [riskAversion, setRiskAversion] = useState(DEFAULT_PERSONA.riskAversion);
  const [objective, setObjective] = useState<OptimizationObjective>("RISK_MATCHED");
  const [targetReturn, setTargetReturn] = useState(0.105);
  const [capital, setCapital] = useState(DEFAULT_PERSONA.initialCapitalIdr);
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULT_PERSONA.monthlyContributionIdr);
  const [horizonYears, setHorizonYears] = useState(DEFAULT_PERSONA.horizonYears);
  const [goalName, setGoalName] = useState("Dana Pensiun & Pendidikan");
  const [targetGoalIdr, setTargetGoalIdr] = useState(DEFAULT_PERSONA.initialCapitalIdr * 3);
  const [currentWeights, setCurrentWeights] = useState<Record<string, number>>(DEFAULT_PERSONA.currentWeights);
  const [theme, setTheme] = useState<AppTheme>("cream");
  const [hydrated, setHydrated] = useState(false);

  const allClients = useMemo(() => [...customClients, ...INITIAL_CLIENT_BOOK], [customClients]);

  const policyAssets = useMemo(() => MARKET_UNIVERSE.map((asset) => {
    const override = assetOverrides[asset.id];
    const base = override
      ? recalibrateAsset(asset, override.expectedAnnualReturn, override.annualVolatility, override.expenseRatio)
      : asset;
    return {
      ...base,
      isSharia: shariaStatus[asset.id] ?? asset.isSharia,
      active: activeAssets[asset.id] !== false,
    };
  }), [activeAssets, shariaStatus, assetOverrides]);
  const returnsMatrix = useMemo(() => getReturnsMatrix(policyAssets), [policyAssets]);
  const assessment = useMemo(() => assessRisk(answers), [answers]);
  const activeRiskAversion = quizTouched ? riskAversion : persona.riskAversion;
  const effectiveMaxRisky = quizTouched ? assessment.maxRiskyWeight : Math.min(0.9, Math.max(0.2, 0.18 + persona.riskScore * 0.075));
  const effectiveShariaOnly = shariaOnly;

  const result = useMemo(() => optimizePortfolio(policyAssets, returnsMatrix, {
    objective,
    riskAversion: activeRiskAversion,
    riskFreeRate,
    maxWeight: globalMaxWeight,
    maxRiskyWeight: objective === "RISK_MATCHED" ? effectiveMaxRisky : undefined,
    targetReturn,
    shariaOnly: effectiveShariaOnly,
  }), [policyAssets, returnsMatrix, objective, activeRiskAversion, riskFreeRate, globalMaxWeight, effectiveMaxRisky, targetReturn, effectiveShariaOnly]);

  const currentPoint = useMemo(() => evaluateWeights(currentWeights, policyAssets, returnsMatrix, riskFreeRate), [currentWeights, policyAssets, returnsMatrix, riskFreeRate]);
  const rebalance = useMemo(() => calculateRebalance({ assets: policyAssets, currentWeights, optimal: result.optimal, portfolioValueIdr: capital, riskFreeRate }), [policyAssets, currentWeights, result.optimal, capital, riskFreeRate]);
  const monteCarlo = useMemo(() => simulateMonteCarlo({
    initialCapitalIdr: capital,
    monthlyContributionIdr: monthlyContribution,
    expectedReturn: result.optimal.netExpectedReturn,
    volatility: result.optimal.volatility,
    horizonYears,
    paths: 1_000,
    seed: 26_026 + persona.id.length,
    targetIdr: targetGoalIdr,
    inflationRate: 0.03,
  }), [capital, monthlyContribution, result.optimal.netExpectedReturn, result.optimal.volatility, horizonYears, persona.id, targetGoalIdr]);
  const suitability = useMemo(
    () => evaluateSuitability(result.optimal.weights, effectiveMaxRisky, policyAssets),
    [result.optimal.weights, effectiveMaxRisky, policyAssets],
  );
  const highestWeight = Math.max(0, ...Object.values(result.optimal.weights));
  const sumWeights = Object.values(result.optimal.weights).reduce((sum, value) => sum + value, 0);

  const addAudit = useCallback((actor: string, action: string, detail: string) => {
    const entry: GovernanceAuditEntry = { id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`, timestamp: new Date().toISOString(), actor, action, detail };
    setAuditLog((previous) => [entry, ...previous].slice(0, 50));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get("role");
    if (urlRole === "investor" || urlRole === "advisor" || urlRole === "intelligence" || urlRole === "committee") {
      setRole(urlRole);
    }
    const urlTab = params.get("tab");
    if (urlTab === "rfm" || urlTab === "churn" || urlTab === "campaign" || urlTab === "loyalty") {
      setIntelligenceTab(urlTab);
    }

    const session = loadDemoSession(defaultSession);
    const savedCustom = Array.isArray(session.customClients) ? session.customClients : [];
    const combinedClients = [...savedCustom, ...INITIAL_CLIENT_BOOK];
    const savedPersona = combinedClients.find((item) => item.id === session.personaId) ?? DEFAULT_PERSONA;
    const restoredActiveAssets = { ...defaultSession.activeAssets, ...(session.activeAssets ?? {}) };
    if (!Object.values(restoredActiveAssets).some(Boolean)) Object.assign(restoredActiveAssets, defaultSession.activeAssets);
    const restoredWeightsMap = session.clientWeightsMap && typeof session.clientWeightsMap === "object" ? session.clientWeightsMap : {};
    setCustomClients(savedCustom);
    setAssetOverrides(session.assetOverrides && typeof session.assetOverrides === "object" ? session.assetOverrides : {});
    setClientWeightsMap(restoredWeightsMap);
    setLaunchedCampaigns(Array.isArray(session.launchedCampaigns) ? session.launchedCampaigns : []);
    setLoyaltyActivated(Boolean(session.loyaltyActivated));
    setPersona(savedPersona);
    setRiskFreeRate(Number.isFinite(session.riskFreeRate) ? Math.min(0.5, Math.max(0, session.riskFreeRate)) : DEFAULT_RISK_FREE_RATE);
    setGlobalMaxWeight(Number.isFinite(session.maxWeight) ? Math.min(1, Math.max(0.01, session.maxWeight)) : 0.35);
    setActiveAssets(restoredActiveAssets);
    setShariaStatus(session.shariaStatus && typeof session.shariaStatus === "object" ? session.shariaStatus : {});
    setAuditLog(Array.isArray(session.auditLog) ? session.auditLog : []);
    setApprovedIds(Array.isArray(session.approvedPersonas) ? session.approvedPersonas : []);
    setShariaOnly(savedPersona.shariaOnly);
    setCapital(savedPersona.initialCapitalIdr);
    setMonthlyContribution(savedPersona.monthlyContributionIdr);
    setHorizonYears(savedPersona.horizonYears);
    setTargetGoalIdr(savedPersona.initialCapitalIdr * 3);
    setCurrentWeights(restoredWeightsMap[savedPersona.id] ?? savedPersona.currentWeights);
    setRiskAversion(savedPersona.riskAversion);
    setAnswers(savedPersona.presetAnswers);
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!hydrated) return;
    saveDemoSession({
      personaId: persona.id,
      riskFreeRate,
      maxWeight: globalMaxWeight,
      activeAssets,
      shariaStatus,
      assetOverrides,
      clientWeightsMap,
      launchedCampaigns,
      loyaltyActivated,
      customClients,
      auditLog,
      approvedPersonas: approvedIds,
    });
  }, [hydrated, persona.id, riskFreeRate, globalMaxWeight, activeAssets, shariaStatus, assetOverrides, clientWeightsMap, launchedCampaigns, loyaltyActivated, customClients, auditLog, approvedIds]);

  const selectPersona = (nextPersona: DemoPersona) => {
    setPersona(nextPersona);
    setShariaOnly(nextPersona.shariaOnly);
    setCapital(nextPersona.initialCapitalIdr);
    setMonthlyContribution(nextPersona.monthlyContributionIdr);
    setHorizonYears(nextPersona.horizonYears);
    setTargetGoalIdr(nextPersona.initialCapitalIdr * 3);
    setCurrentWeights(clientWeightsMap[nextPersona.id] ?? nextPersona.currentWeights);
    setRiskAversion(nextPersona.riskAversion);
    setAnswers(nextPersona.presetAnswers);
    setQuizTouched(false);
    setObjective("RISK_MATCHED");
  };

  const handleCurrentWeightsChange = (nextWeights: Record<string, number>) => {
    setCurrentWeights(nextWeights);
    setClientWeightsMap((prev) => ({ ...prev, [persona.id]: nextWeights }));
  };

  const resetDemo = () => {
    clearDemoSession();
    setRole("investor");
    setInvestorTab("frontier");
    setIntelligenceTab("rfm");
    setPersona(DEFAULT_PERSONA);
    setRiskFreeRate(DEFAULT_RISK_FREE_RATE);
    setGlobalMaxWeight(0.35);
    setShariaOnly(DEFAULT_PERSONA.shariaOnly);
    setActiveAssets(Object.fromEntries(MARKET_UNIVERSE.map((asset) => [asset.id, true])));
    setShariaStatus({});
    setAssetOverrides({});
    setClientWeightsMap({});
    setLaunchedCampaigns([]);
    setLoyaltyActivated(false);
    setCustomClients([]);
    setAuditLog([]);
    setApprovedIds([]);
    setAnswers(DEFAULT_PERSONA.presetAnswers);
    setQuizTouched(false);
    setRiskAversion(DEFAULT_PERSONA.riskAversion);
    setObjective("RISK_MATCHED");
    setCapital(DEFAULT_PERSONA.initialCapitalIdr);
    setMonthlyContribution(DEFAULT_PERSONA.monthlyContributionIdr);
    setHorizonYears(DEFAULT_PERSONA.horizonYears);
    setGoalName("Dana Pensiun & Pendidikan");
    setTargetGoalIdr(DEFAULT_PERSONA.initialCapitalIdr * 3);
    setCurrentWeights(DEFAULT_PERSONA.currentWeights);
  };

  const executeRebalance = () => {
    handleCurrentWeightsChange(result.optimal.weights);
    addAudit(
      "INVESTOR WORKSPACE",
      "Rebalance executed (simulasi)",
      `${persona.cif ?? persona.id} · ${persona.name} · Drift ${formatPercent(rebalance.totalDrift)} diselaraskan ke target`,
    );
  };

  const changeAnswers = (nextAnswers: Record<string, number>) => {
    setAnswers(nextAnswers);
    setQuizTouched(true);
    setRiskAversion(assessRisk(nextAnswers).riskAversion);
  };

  const updateActiveAsset = (id: string, value: boolean) => {
    const activeCount = Object.values(activeAssets).filter(Boolean).length;
    if (!value && activeCount <= 1) return;
    setActiveAssets((previous) => ({ ...previous, [id]: value }));
    const asset = policyAssets.find((item) => item.id === id);
    addAudit("RISK COMMITTEE", value ? "Asset activated" : "Asset frozen", `${asset?.ticker ?? id} · ${asset?.name ?? id}`);
  };

  const updateShariaStatus = (id: string, value: boolean) => {
    const asset = policyAssets.find((item) => item.id === id);
    setShariaStatus((previous) => ({ ...previous, [id]: value }));
    addAudit("DPS GOVERNANCE", value ? "Sharia status verified" : "Sharia status removed", `${asset?.ticker ?? id}`);
  };

  const verifyPython = async () => {
    const response = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objective,
        riskAversion: activeRiskAversion,
        targetReturn,
        maxWeight: globalMaxWeight,
        maxRiskyWeight: objective === "RISK_MATCHED" ? effectiveMaxRisky : undefined,
        riskFreeRate,
        shariaOnly: effectiveShariaOnly,
        activeAssets,
        shariaStatus,
        assetOverrides,
        currentWeights,
        initialCapitalIdr: capital,
        monthlyContributionIdr: monthlyContribution,
        horizonYears,
        verifyWithPython: true,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Verifikasi gagal.");
    return payload.pythonVerification ?? { available: false, message: "Engine Python SLSQP tidak dapat dihubungi." };
  };

  const advisorClients = useMemo<AdvisorClientSummary[]>(() => allClients.map((clientPersona) => {
    const clientShariaOnly = shariaOnly || clientPersona.shariaOnly;
    const maxRisky = Math.min(0.9, Math.max(0.2, 0.18 + clientPersona.riskScore * 0.075));
    const optimal = optimizeFastSingle(policyAssets, returnsMatrix, {
      riskAversion: clientPersona.riskAversion,
      riskFreeRate,
      maxWeight: globalMaxWeight,
      maxRiskyWeight: maxRisky,
      shariaOnly: clientShariaOnly,
    });
    const effectiveClientWeights = clientWeightsMap[clientPersona.id] ?? clientPersona.currentWeights;
    const currentSuitability = evaluateSuitability(effectiveClientWeights, maxRisky, policyAssets);
    return {
      persona: clientPersona,
      current: evaluateWeights(effectiveClientWeights, policyAssets, returnsMatrix, riskFreeRate),
      optimal,
      suitabilityStatus: currentSuitability.status,
    };
  }), [allClients, policyAssets, returnsMatrix, riskFreeRate, globalMaxWeight, shariaOnly, clientWeightsMap]);

  const handleAddClient = (newClient: DemoPersona) => {
    setCustomClients((prev) => [newClient, ...prev]);
    addAudit("WEALTH ADVISOR", "Client onboarded", `${newClient.cif} · ${newClient.name} (${newClient.label})`);
  };

  const handleImportClients = (imported: DemoPersona[]) => {
    setCustomClients((prev) => [...imported, ...prev]);
    addAudit("WEALTH ADVISOR", "Batch CSV import", `${imported.length} nasabah baru diimpor ke direktori CRM`);
  };

  const handleAssetOverride = (id: string, override: AssetOverride) => {
    setAssetOverrides((prev) => ({ ...prev, [id]: override }));
  };

  const handleResetAssetOverrides = () => {
    setAssetOverrides({});
    addAudit("RISK COMMITTEE", "Market parameters reset", "Kembali ke kalibrasi 60 bulan standar");
  };

  const approvePersona = (approvedPersona: DemoPersona) => {
    if (approvedIds.includes(approvedPersona.id)) return;
    setApprovedIds((previous) => [...previous, approvedPersona.id]);
    addAudit("WEALTH ADVISOR", "Advisor sign-off", `Proposal disetujui untuk ${approvedPersona.name} · demo`);
  };

  const requestAdvisorReview = () => {
    addAudit("INVESTOR WORKSPACE", "IPS submitted for review", `${persona.name} · ${formatPercent(result.optimal.expectedReturn)} expected return`);
    setRole("advisor");
  };

  const handleNavigate = (nextRole: BankingRole, subTab?: InvestorTab | IntelligenceTab) => {
    setRole(nextRole);
    if (nextRole === "investor" && (subTab === "frontier" || subTab === "rebalance" || subTab === "simulation" || subTab === "correlation")) {
      setInvestorTab(subTab);
    }
    if (nextRole === "intelligence" && (subTab === "rfm" || subTab === "churn" || subTab === "campaign" || subTab === "loyalty")) {
      setIntelligenceTab(subTab);
    }
  };

  const displayScore = quizTouched ? assessment.score : persona.riskScore;
  const displayCategory = quizTouched ? assessment.category : persona.label;

  return (
    <div className="app-frame">
      <SidebarNav
        role={role}
        investorTab={investorTab}
        intelligenceTab={intelligenceTab}
        onNavigate={handleNavigate}
        persona={persona}
        clients={allClients}
        onSelectClient={selectPersona}
        totalClients={allClients.length}
        shariaOnly={effectiveShariaOnly}
        onShariaChange={setShariaOnly}
        onReset={resetDemo}
        theme={theme}
        onThemeChange={setTheme}
      />

      <main id="workspace" className="app-main">
        {role === "investor" && (
          <>
            <div className="role-authority-banner has-media">
              <img
                src="/images/investor-wealth.jpg"
                alt="Ilustrasi nasabah meninjau alokasi portofolio"
                width={76}
                height={52}
                className="banner-thumb editorial-img-top"
              />
              <div>
                <strong>Peran Aktif: Nasabah / Investor Workspace ({persona.cif ?? "CIF-1002"} · {persona.name})</strong>
                <span>
                  Wewenang: Mengisi asesmen profil risiko, mengatur modal &amp; tujuan investasi, mengeksplorasi Efficient Frontier, dan mensimulasikan rebalance. Pada mode Risk-Matched, plafon ekuitas POJK ({(effectiveMaxRisky * 100).toFixed(0)}%) ditegakkan otomatis.
                </span>
              </div>
            </div>

            <header className="context-header">
              <div>
                <div className="context-breadcrumb">
                  <span>Portofolio Nasabah</span>
                  <span>/</span>
                  <strong>{persona.name}</strong>
                  <span className="status-pill">{effectiveShariaOnly ? "Syariah (DPS)" : "Konvensional & Syariah"}</span>
                  <span className={`suitability-pill ${suitability.status === "BREACH" ? "is-breach" : "is-suitable"}`}>
                    {suitability.status === "BREACH" ? "POJK Suitability Breach" : "POJK Suitable"}
                  </span>
                </div>
                <h1>Optimalisasi Portofolio — {persona.name}</h1>
              </div>
              <div className="context-actions">
                <IpsReportModal
                  persona={{ ...persona, initialCapitalIdr: capital, monthlyContributionIdr: monthlyContribution, horizonYears }}
                  portfolio={result.optimal}
                  rebalance={rebalance}
                  riskFreeRate={riskFreeRate}
                  effectiveMaxWeight={result.effectiveMaxWeight}
                  shariaOnly={effectiveShariaOnly}
                  suitability={suitability}
                  approved={approvedIds.includes(persona.id)}
                  onRequestReview={requestAdvisorReview}
                />
              </div>
            </header>

            <section className="kpi-strip" aria-label="Ringkasan portfolio">
              <KpiCard label="Net Return (Setelah TER)" value={formatPercent(result.optimal.netExpectedReturn)} note={`Gross ${formatPercent(result.optimal.expectedReturn)} · TER ${formatPercent(result.optimal.weightedExpenseRatio)}`} icon={<HelpTip title="Net Expected Return" description="Estimasi imbal hasil tahunan portofolio setelah dikurangi rata-rata tertimbang biaya pengelolaan instrumen (Total Expense Ratio / TER)." />} />
              <KpiCard label="Volatilitas (σp)" value={formatPercent(result.optimal.volatility)} note={`Efektif ${result.optimal.effectiveAssets.toFixed(1)} aset`} icon={<HelpTip title="Volatilitas & Diversifikasi" description="Simpangan baku imbal hasil tahunan (risiko). N_eff mengukur jumlah aset efektif yang benar-benar berkontribusi pada diversifikasi." />} />
              <KpiCard label="Sharpe / Calmar" value={`${result.optimal.sharpeRatio.toFixed(2)} / ${result.optimal.calmarRatio.toFixed(2)}`} note={`Sortino ${result.optimal.sortinoRatio.toFixed(2)} · Rf ${formatPercent(riskFreeRate)}`} icon={<HelpTip title="Sharpe & Calmar Ratio" description="Sharpe mengukur kelebihan return per unit volatilitas total; Calmar mengukur return dibagi Maximum Drawdown historis." />} />
              <KpiCard label="VaR 95% / Max DD" value={`${formatPercent(result.optimal.var95)} / ${formatPercent(Math.abs(result.optimal.maxDrawdown))}`} note="Parametrik · Historis 5 thn" icon={<HelpTip title="Value at Risk & Max Drawdown" description="VaR 95% adalah estimasi batas kerugian tahunan terburuk dengan keyakinan 95%; Max DD adalah penurunan puncak-ke-lembah terdalam dalam 60 bulan." />} />
              <KpiCard label="Modal & Target Dana" value={formatIdr(capital)} note={`DCA ${formatIdr(monthlyContribution)} / bln`} icon={<HelpTip title="Modal & Kontribusi Rutin" description="Modal awal ditambah setoran rutin bulanan (Dollar-Cost Averaging) yang disimulasikan pada proyeksi Monte Carlo." />} />
            </section>

            {suitability.status === "BREACH" && (
              <div className="notice-banner is-breach">
                <ShieldCheck size={16} />
                <span><strong>Peringatan Kesesuaian Risiko (POJK):</strong> {suitability.message}</span>
              </div>
            )}

            {result.notices.length > 0 && (
              <div className="notice-banner">
                <ShieldCheck size={16} />
                <span>{result.notices[0]}</span>
              </div>
            )}

            <section className="workspace-grid">
              <aside className="controls-column">
                <RiskQuestionnaire
                  answers={answers}
                  assessment={assessment}
                  displayScore={displayScore}
                  displayCategory={displayCategory}
                  displayLambda={activeRiskAversion}
                  onChange={changeAnswers}
                />

                <section className="panel controls-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="micro-label">Parameter Optimasi</span>
                      <h2>Kendala &amp; Modal</h2>
                    </div>
                    <span className="engine-badge"><span className="status-dot" /> Live</span>
                  </div>

                  <label className="field-label">
                    Objektif Markowitz
                    <select value={objective} onChange={(event) => setObjective(event.target.value as OptimizationObjective)}>
                      <option value="RISK_MATCHED">Sesuai Profil Risiko (POJK Enforced)</option>
                      <option value="MAX_SHARPE">Maximum Sharpe Ratio (Tangency)</option>
                      <option value="MIN_VOLATILITY">Minimum Volatility (Paling Stabil)</option>
                      <option value="TARGET_RETURN">Target Return Kustom</option>
                    </select>
                  </label>

                  <label className="range-control">
                    <span><b>Risk Aversion (λ)</b><strong className="tabular-nums">{activeRiskAversion.toFixed(2)}</strong></span>
                    <input type="range" min="0.8" max="7.5" step="0.1" value={activeRiskAversion} onChange={(event) => { setQuizTouched(true); setRiskAversion(Number(event.target.value)); }} />
                    <span className="range-endpoints"><span>Agresif (0.8)</span><span>Konservatif (7.5)</span></span>
                  </label>

                  <label className="range-control">
                    <span><b>Plafon Bobot per Aset</b><strong className="tabular-nums">{formatPercent(result.effectiveMaxWeight)}</strong></span>
                    <input type="range" min="0.15" max="0.7" step="0.01" value={globalMaxWeight} onChange={(event) => setGlobalMaxWeight(Number(event.target.value))} />
                    <span className="range-endpoints"><span>15%</span><span>70%</span></span>
                  </label>

                  {objective === "TARGET_RETURN" && (
                    <label className="range-control">
                      <span><b>Target Return Tahunan</b><strong className="tabular-nums">{formatPercent(targetReturn)}</strong></span>
                      <input type="range" min="0.04" max="0.22" step="0.0025" value={targetReturn} onChange={(event) => setTargetReturn(Number(event.target.value))} />
                    </label>
                  )}

                  <label className="field-label">
                    Modal Awal
                    <span className="input-with-prefix">
                      <b>Rp</b>
                      <input className="tabular-nums" type="number" min="100000" step="1000000" value={capital} onChange={(event) => setCapital(Math.max(100_000, Number(event.target.value) || 100_000))} />
                    </span>
                  </label>

                  <label className="field-label">
                    Investasi Rutin / Bulan (DCA)
                    <span className="input-with-prefix">
                      <b>Rp</b>
                      <input className="tabular-nums" type="number" min="0" step="250000" value={monthlyContribution} onChange={(event) => setMonthlyContribution(Math.max(0, Number(event.target.value) || 0))} />
                    </span>
                  </label>

                  <label className="range-control">
                    <span><b>Horizon Investasi</b><strong className="tabular-nums">{horizonYears} tahun</strong></span>
                    <input type="range" min="1" max="20" step="1" value={horizonYears} onChange={(event) => setHorizonYears(Number(event.target.value))} />
                    <span className="range-endpoints"><span>1 thn</span><span>20 thn</span></span>
                  </label>

                  <label className="field-label">
                    Tujuan Keuangan
                    <select value={goalName} onChange={(event) => setGoalName(event.target.value)}>
                      <option value="Dana Pensiun & Pendidikan">Dana Pensiun &amp; Pendidikan</option>
                      <option value="Dana Haji / Umrah">Dana Haji / Umrah</option>
                      <option value="Pembelian Properti">Pembelian Properti</option>
                      <option value="Dana Cadangan Bisnis">Dana Cadangan Bisnis</option>
                    </select>
                  </label>

                  <label className="field-label">
                    Target Dana ({horizonYears} Thn)
                    <span className="input-with-prefix">
                      <b>Rp</b>
                      <input className="tabular-nums" type="number" min="1000000" step="10000000" value={targetGoalIdr} onChange={(event) => setTargetGoalIdr(Math.max(1_000_000, Number(event.target.value) || 1_000_000))} />
                    </span>
                  </label>
                </section>
              </aside>

              <div className="visuals-column">
                <div className="workspace-tabs" role="tablist" aria-label="Modul analisis portofolio">
                  <button type="button" role="tab" aria-selected={investorTab === "frontier"} className={`workspace-tab ${investorTab === "frontier" ? "is-active" : ""}`} onClick={() => setInvestorTab("frontier")}>
                    Efficient Frontier &amp; Alokasi
                  </button>
                  <button type="button" role="tab" aria-selected={investorTab === "rebalance"} className={`workspace-tab ${investorTab === "rebalance" ? "is-active" : ""}`} onClick={() => setInvestorTab("rebalance")}>
                    Kalkulator Rebalancing
                  </button>
                  <button type="button" role="tab" aria-selected={investorTab === "simulation"} className={`workspace-tab ${investorTab === "simulation" ? "is-active" : ""}`} onClick={() => setInvestorTab("simulation")}>
                    Proyeksi Monte Carlo &amp; Stress Test
                  </button>
                  <button type="button" role="tab" aria-selected={investorTab === "correlation"} className={`workspace-tab ${investorTab === "correlation" ? "is-active" : ""}`} onClick={() => setInvestorTab("correlation")}>
                    Matriks Korelasi Aset
                  </button>
                </div>

                {investorTab === "frontier" && (
                  <>
                    <EfficientFrontierChart
                      result={result}
                      riskFreeRate={riskFreeRate}
                      shariaOnly={effectiveShariaOnly}
                      currentPoint={currentPoint}
                      onSelectTarget={(value) => {
                        setTargetReturn(value);
                        setObjective("TARGET_RETURN");
                      }}
                    />
                    <AllocationTable assets={policyAssets} rebalance={rebalance} result={result} />
                  </>
                )}

                {investorTab === "rebalance" && (
                  <RebalanceCalculator
                    assets={policyAssets}
                    currentWeights={currentWeights}
                    onWeightsChange={handleCurrentWeightsChange}
                    portfolioValueIdr={capital}
                    onPortfolioValueChange={setCapital}
                    rebalance={rebalance}
                    onExecuteRebalance={executeRebalance}
                  />
                )}

                {investorTab === "simulation" && (
                  <>
                    <div className="analytics-grid">
                      <MonteCarloChart result={monteCarlo} horizonYears={horizonYears} goalName={goalName} targetGoalIdr={targetGoalIdr} />
                      <MacroStressTestCard assets={policyAssets} weights={result.optimal.weights} portfolioValueIdr={capital} />
                    </div>
                    <HistoricalBacktestChart assets={policyAssets} recommendedWeights={result.optimal.weights} currentWeights={currentWeights} />
                  </>
                )}

                {investorTab === "correlation" && (
                  <CorrelationHeatmap assets={policyAssets} matrix={result.correlationMatrix} />
                )}
              </div>
            </section>
          </>
        )}

        {role === "advisor" && (
          <AdvisorDeskPanel
            clients={advisorClients}
            activePersonaId={persona.id}
            approvedIds={approvedIds}
            onSelect={selectPersona}
            onInspect={(nextPersona) => {
              selectPersona(nextPersona);
              setRole("investor");
            }}
            onApprove={approvePersona}
            onAddClient={handleAddClient}
            onImportClients={handleImportClients}
          />
        )}

        {role === "intelligence" && (
          <CustomerIntelligencePanel
            clients={advisorClients}
            activeTab={intelligenceTab}
            onTabChange={setIntelligenceTab}
            launchedCampaigns={launchedCampaigns}
            loyaltyActivated={loyaltyActivated}
            onLaunchCampaign={(segment, detail) => {
              setLaunchedCampaigns((prev) => (prev.includes(segment) ? prev : [...prev, segment]));
              addAudit("CUSTOMER INTELLIGENCE", "Campaign launched", detail);
            }}
            onActivateLoyalty={(detail) => {
              setLoyaltyActivated(true);
              addAudit("CUSTOMER INTELLIGENCE", "Loyalty scheme activated", detail);
            }}
            onInspectClient={(nextPersona) => {
              selectPersona(nextPersona);
              setRole("investor");
            }}
          />
        )}

        {role === "committee" && (
          <RiskGovernancePanel
            assets={policyAssets}
            riskFreeRate={riskFreeRate}
            maxWeight={globalMaxWeight}
            effectiveMaxWeight={result.effectiveMaxWeight}
            onRiskFreeRateChange={(value) => {
              setRiskFreeRate(value);
              addAudit("RISK COMMITTEE", "Risk-free rate updated", formatPercent(value));
            }}
            onMaxWeightChange={(value) => {
              setGlobalMaxWeight(value);
              addAudit("RISK COMMITTEE", "Concentration cap updated", formatPercent(value));
            }}
            onAssetActiveChange={updateActiveAsset}
            onShariaChange={updateShariaStatus}
            onAssetOverrideChange={handleAssetOverride}
            onResetAssetOverrides={handleResetAssetOverrides}
            hasAssetOverrides={Object.keys(assetOverrides).length > 0}
            sumWeights={sumWeights}
            highestWeight={highestWeight}
            typescriptWeights={result.optimal.weights}
            var95={result.optimal.var95}
            auditLog={auditLog}
            onVerify={verifyPython}
          />
        )}

        <footer className="app-footer">
          <div>
            <span className="brand-footer">QUANTVAULT <span>·</span> PRIVATE WEALTH PLATFORM</span>
            <span>Markowitz Mean-Variance · Ledoit-Wolf Shrinkage 15% · K-Means · Logistic Churn</span>
          </div>
          <p>Simulasi Kuantitatif untuk Portofolio Pembelajaran &amp; Demonstrasi Teknis — Menggunakan Data Pasar Sintetis Terkalibrasi.</p>
        </footer>
      </main>

      <div className="mobile-summary">
        <span>μ {formatPercent(result.optimal.expectedReturn)}</span>
        <span>σ {formatPercent(result.optimal.volatility)}</span>
        <span>SR {result.optimal.sharpeRatio.toFixed(2)}</span>
        <strong className="tabular-nums">{formatIdr(capital)}</strong>
      </div>
    </div>
  );
}

function KpiCard({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return (
    <article className="kpi-card">
      <div className="kpi-title">
        <span>{label}</span>
        {icon}
      </div>
      <strong className="kpi-value tabular-nums">{value}</strong>
      <small>{note}</small>
    </article>
  );
}
