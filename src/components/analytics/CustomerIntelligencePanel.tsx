"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Award, BarChart3, CheckCircle2, Download, Eye, Megaphone, Send, Users } from "lucide-react";
import type { AdvisorClientSummary } from "@/components/advisor/AdvisorDeskPanel";
import type { DemoPersona } from "@/types/quant";
import {
  analyzeCustomerIntelligence,
  simulateAbCampaign,
  simulateLoyaltyProgram,
  type CustomerSegmentName,
} from "@/lib/quant/customer-intelligence";
import { formatCompactIdr, formatIdr, formatPercent } from "@/lib/utils/formatters";
import { HelpTip } from "@/components/ui/HelpTip";

export type IntelligenceTab = "rfm" | "churn" | "campaign" | "loyalty";

interface Props {
  clients: AdvisorClientSummary[];
  activeTab: IntelligenceTab;
  onTabChange: (tab: IntelligenceTab) => void;
  launchedCampaigns: string[];
  loyaltyActivated: boolean;
  onLaunchCampaign: (segment: string, detail: string) => void;
  onActivateLoyalty: (detail: string) => void;
  onInspectClient: (persona: DemoPersona) => void;
}

export function CustomerIntelligencePanel({
  clients,
  activeTab: tab,
  onTabChange: setTab,
  launchedCampaigns,
  loyaltyActivated,
  onLaunchCampaign,
  onActivateLoyalty,
  onInspectClient,
}: Props) {

  // #22 Campaign A/B Test State
  const [targetSegment, setTargetSegment] = useState<string>("At-Risk Dormant");
  const [bankPopulation, setBankPopulation] = useState(1_000);
  const [baseConversion, setBaseConversion] = useState(0.08);
  const [liftRate, setLiftRate] = useState(0.045);
  const [costPerClient, setCostPerClient] = useState(75_000);
  const [avgTopUp, setAvgTopUp] = useState(25_000_000);

  // #24 Loyalty Program State
  const [platinumBps, setPlatinumBps] = useState(35);
  const [goldBps, setGoldBps] = useState(20);
  const [silverBps, setSilverBps] = useState(10);
  const [retentionEffect, setRetentionEffect] = useState(0.45);
  const [targetedRetentionOnly, setTargetedRetentionOnly] = useState(true);

  const { customers, segments } = useMemo(
    () => analyzeCustomerIntelligence(clients, { launchedCampaigns, loyaltyActivated }),
    [clients, launchedCampaigns, loyaltyActivated],
  );

  const highChurnClients = useMemo(
    () => [...customers].sort((a, b) => b.churnProbability - a.churnProbability),
    [customers],
  );
  const highRiskCount = customers.filter((c) => c.churnRisk === "HIGH").length;
  const atRiskAum = customers.reduce((s, c) => s + c.aumIdr * c.churnProbability, 0);

  const audienceCount = useMemo(() => {
    if (targetSegment === "ALL") return customers.length;
    if (targetSegment === "SHARIA") return customers.filter((c) => c.shariaOnly).length;
    return customers.filter((c) => c.segment === targetSegment).length;
  }, [customers, targetSegment]);

  const segmentShare = customers.length > 0 ? audienceCount / customers.length : 0.25;

  const abResult = useMemo(
    () =>
      simulateAbCampaign({
        targetSegment,
        audienceSize: Math.max(1, audienceCount),
        totalBankPopulation: bankPopulation,
        segmentShare,
        baseConversionRate: baseConversion,
        treatmentLiftRate: liftRate,
        costPerClientIdr: costPerClient,
        avgTopUpPerConversionIdr: avgTopUp,
      }),
    [targetSegment, audienceCount, bankPopulation, segmentShare, baseConversion, liftRate, costPerClient, avgTopUp],
  );

  const loyaltyResult = useMemo(
    () =>
      simulateLoyaltyProgram(customers, {
        platinumRewardBps: platinumBps,
        goldRewardBps: goldBps,
        silverRewardBps: silverBps,
        churnReductionEffectiveness: retentionEffect,
        targetedRetentionOnly,
      }),
    [customers, platinumBps, goldBps, silverBps, retentionEffect, targetedRetentionOnly],
  );

  const exportChurnCsv = () => {
    const header = ["CIF", "Nama", "Segmen_RFM", "AUM_IDR", "Recency_Hari", "Probabilitas_Churn_Pct", "Risiko", "Faktor_Penyebab", "Rekomendasi"];
    const rows = highChurnClients.map((c) =>
      [
        c.cif,
        `"${c.name}"`,
        `"${c.segment}"`,
        c.aumIdr,
        c.recencyDays,
        (c.churnProbability * 100).toFixed(2),
        c.churnRisk,
        `"${c.churnDrivers.join("; ")}"`,
        `"${c.recommendedAction}"`,
      ].join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quantvault-churn-priority-list.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLaunchCampaign = () => {
    onLaunchCampaign(
      targetSegment,
      `Segmen ${targetSegment} (${abResult.audienceSize} sampel · p=${abResult.pValue.toFixed(4)} · ROI ${abResult.netRoiPercent.toFixed(1)}%)`,
    );
  };

  const handleActivateLoyalty = () => {
    onActivateLoyalty(
      `${targetedRetentionOnly ? "Targeted Retention" : "All-Client"} · Platinum ${platinumBps}bps / Gold ${goldBps}bps · ROI ${loyaltyResult.loyaltyRoiPercent.toFixed(1)}%`,
    );
  };

  const personaById = useMemo(
    () => new Map(clients.map((c) => [c.persona.id, c.persona])),
    [clients],
  );

  // SVG Scatter dimensions for RFM K-Means (#20)
  const svgW = 760;
  const svgH = 290;
  const pad = { left: 68, right: 24, top: 22, bottom: 42 };
  const maxRecency = Math.max(120, ...customers.map((c) => c.recencyDays)) * 1.08;
  const maxAum = Math.max(300_000_000, ...customers.map((c) => c.aumIdr)) * 1.12;
  const sx = (recency: number) => pad.left + (recency / maxRecency) * (svgW - pad.left - pad.right);
  const sy = (aum: number) => pad.top + ((maxAum - aum) / maxAum) * (svgH - pad.top - pad.bottom);

  const segmentColor = (seg: CustomerSegmentName) =>
    segments.find((s) => s.segment === seg)?.color ?? "#0f766e";

  return (
    <section className="role-workspace intelligence-workspace">
      <div className="role-authority-banner">
        <div>
          <strong>Peran Aktif: Customer Intelligence &amp; Retention Analytics</strong>
          <span>
            Wewenang: Menganalisis segmentasi RFM + K-Means seluruh nasabah, memprediksi risiko churn &amp; penarikan dana, merancang kampanye pemasaran A/B Test, dan mengevaluasi ROI program loyalitas nasabah.
          </span>
        </div>
      </div>

      <div className="workspace-title-row">
        <div>
          <span className="micro-label">ANALYTICS &amp; RETENTION HUB</span>
          <h1>Customer Intelligence &amp; Retention Hub</h1>
          <p>Terhubung langsung dengan {customers.length} data nasabah aktif di Client Book dan mesin Markowitz.</p>
        </div>
      </div>

      <div className="advisor-summary-strip">
        <article className="kpi-card">
          <div className="kpi-title">
            <span>SEGMEN K-MEANS AKTIF</span>
            <HelpTip title="Segmentasi RFM + K-Means" description="Mengelompokkan nasabah otomatis berdasarkan Recency (hari sejak transaksi terakhir), Frequency (frekuensi DCA), dan Monetary (AUM) menggunakan algoritma K-Means K=4." />
          </div>
          <strong className="kpi-value tabular-nums">4 Klaster RFM</strong>
          <small>{customers.length} nasabah terklasterisasi</small>
        </article>
        <article className="kpi-card">
          <div className="kpi-title">
            <span>NASABAH RISIKO CHURN TINGGI</span>
            <HelpTip title="Model Prediksi Churn" description="Model regresi logistik memprediksi probabilitas nasabah menutup rekening/menarik dana berdasarkan ketidakaktifan, drift portofolio, Sharpe gap, dan POJK breach." />
          </div>
          <strong className="kpi-value tabular-nums negative-value">{highRiskCount} nasabah</strong>
          <small>AUM terpapar risiko: {formatCompactIdr(atRiskAum)}</small>
        </article>
        <article className="kpi-card">
          <div className="kpi-title">
            <span>ESTIMASI ROI PROGRAM LOYALITAS</span>
            <HelpTip title="Loyalty ROI" description="Perbandingan antara margin pendapatan bank dari AUM yang berhasil diselamatkan terhadap biaya reward/cashback loyalitas tahunan." />
          </div>
          <strong className={`kpi-value tabular-nums ${loyaltyResult.loyaltyRoiPercent >= 0 ? "positive-value" : "negative-value"}`}>
            {loyaltyResult.loyaltyRoiPercent >= 0 ? "+" : ""}
            {loyaltyResult.loyaltyRoiPercent.toFixed(1)}%
          </strong>
          <small>AUM terselamatkan: {formatCompactIdr(loyaltyResult.retainedAumIdr)}</small>
        </article>
      </div>

      <div className="workspace-tabs" role="tablist" aria-label="Modul Customer Intelligence" style={{ marginBottom: "18px" }}>
        <button type="button" role="tab" aria-selected={tab === "rfm"} className={`workspace-tab ${tab === "rfm" ? "is-active" : ""}`} onClick={() => setTab("rfm")}>
          <Users size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          Segmentasi RFM &amp; K-Means
        </button>
        <button type="button" role="tab" aria-selected={tab === "churn"} className={`workspace-tab ${tab === "churn" ? "is-active" : ""}`} onClick={() => setTab("churn")}>
          <AlertTriangle size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          Prediksi Churn Nasabah
        </button>
        <button type="button" role="tab" aria-selected={tab === "campaign"} className={`workspace-tab ${tab === "campaign" ? "is-active" : ""}`} onClick={() => setTab("campaign")}>
          <Megaphone size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          Kampanye &amp; A/B Test
        </button>
        <button type="button" role="tab" aria-selected={tab === "loyalty"} className={`workspace-tab ${tab === "loyalty" ? "is-active" : ""}`} onClick={() => setTab("loyalty")}>
          <Award size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          Program Loyalitas &amp; ROI
        </button>
      </div>

      {tab === "rfm" && (
        <div className="allocation-stack">
          <div className="segment-card-grid">
            {segments.map((seg) => (
              <article className="panel segment-card" key={seg.segment} style={{ borderTop: `3px solid ${seg.color}` }}>
                <span className="micro-label">{seg.count} NASABAH</span>
                <h3>{seg.segment}</h3>
                <strong className="tabular-nums">{formatCompactIdr(seg.totalAumIdr)}</strong>
                <div className="segment-meta">
                  <span>RFM: <b className="tabular-nums">{seg.avgRfmScore.toFixed(2)}/5</b></span>
                  <span>Avg Churn: <b className="tabular-nums">{formatPercent(seg.avgChurnProbability)}</b></span>
                </div>
              </article>
            ))}
          </div>

          <section className="panel chart-panel">
            <div className="panel-heading chart-heading">
              <div>
                <span className="micro-label">K-MEANS CLUSTER MAP (K = 4)</span>
                <h2>
                  Peta Sebaran Klaster Nasabah (Recency vs AUM){" "}
                  <HelpTip
                    title="Peta Klaster K-Means"
                    description="Sumbu horizontal menunjukkan hari sejak transaksi terakhir (semakin ke kanan semakin lama tidak aktif), sumbu vertikal menunjukkan nilai AUM. Titik di kanan bawah adalah prioritas retensi."
                  />
                </h2>
                <p>Ukuran lingkaran mencerminkan frekuensi investasi rutin tahunan setiap nasabah.</p>
              </div>
              <BarChart3 size={18} />
            </div>
            <div className="chart-scroll">
              <svg className="monte-svg" viewBox={`0 0 ${svgW} ${svgH}`} role="img" aria-label="Peta klaster K-Means nasabah">
                {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                  const val = maxAum * f;
                  return (
                    <g key={`y-${f}`}>
                      <line x1={pad.left} x2={svgW - pad.right} y1={sy(val)} y2={sy(val)} className="chart-grid-line" />
                      <text x={pad.left - 8} y={sy(val) + 4} textAnchor="end" className="chart-axis-label tabular-nums">{formatCompactIdr(val)}</text>
                    </g>
                  );
                })}
                {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                  const days = Math.round(maxRecency * f);
                  return (
                    <g key={`x-${f}`}>
                      <line x1={sx(days)} x2={sx(days)} y1={pad.top} y2={svgH - pad.bottom} className="chart-grid-line" />
                      <text x={sx(days)} y={svgH - pad.bottom + 18} textAnchor="middle" className="chart-axis-label tabular-nums">{days} hr</text>
                    </g>
                  );
                })}
                <text x={svgW / 2} y={svgH - 6} textAnchor="middle" className="chart-axis-title">RECENCY (HARI SEJAK TRANSAKSI TERAKHIR)</text>
                {customers.map((c) => (
                  <circle
                    key={c.clientId}
                    cx={sx(c.recencyDays)}
                    cy={sy(c.aumIdr)}
                    r={Math.min(11, Math.max(4.5, c.frequencyPerYear * 0.45))}
                    fill={segmentColor(c.segment)}
                    fillOpacity={0.82}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  >
                    <title>{c.cif} · {c.name} ({c.segment}) — AUM {formatIdr(c.aumIdr)}, Recency {c.recencyDays} hr, Churn {formatPercent(c.churnProbability)}</title>
                  </circle>
                ))}
              </svg>
            </div>
            <div className="chart-legend">
              {segments.map((seg) => (
                <span key={seg.segment}><i className="legend-swatch" style={{ backgroundColor: seg.color }} />{seg.segment}</span>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "churn" && (
        <section className="panel">
          <div className="panel-heading chart-heading">
            <div>
              <span className="micro-label">EXPLAINABLE LOGISTIC CHURN MODEL</span>
              <h2>
                Daftar Nasabah Berisiko Churn &amp; Faktor Penyebab{" "}
                <HelpTip
                  title="Faktor Penyebab Churn"
                  description="Setiap nasabah diurutkan dari probabilitas penarikan dana tertinggi. Jika Anda melakukan Rebalance di workspace nasabah, drift & skor churn nasabah tersebut otomatis turun."
                />
              </h2>
              <p>Diurutkan berdasarkan probabilitas churn tertinggi untuk prioritas tindak lanjut RM.</p>
            </div>
            <button type="button" className="button-secondary crm-btn" onClick={exportChurnCsv}>
              <Download size={14} /> Ekspor Call-List CSV
            </button>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>CIF &amp; Nasabah</th>
                  <th>Segmen RFM</th>
                  <th>AUM</th>
                  <th>Probabilitas Churn</th>
                  <th>Faktor Penyebab Utama</th>
                  <th>Rekomendasi Aksi</th>
                  <th>Tinjau</th>
                </tr>
              </thead>
              <tbody>
                {highChurnClients.map((c) => {
                  const targetPersona = personaById.get(c.clientId);
                  return (
                    <tr key={c.clientId}>
                      <th scope="row">
                        <span className="ticker-cell">{c.cif} · {c.name}</span>
                        <small>Recency {c.recencyDays} hr · {c.frequencyPerYear}x/thn</small>
                      </th>
                      <td>{c.segment}</td>
                      <td className="tabular-nums">{formatCompactIdr(c.aumIdr)}</td>
                      <td className="tabular-nums">
                        <span className={`suitability-pill ${c.churnRisk === "HIGH" ? "is-breach" : c.churnRisk === "MEDIUM" ? "is-warning" : "is-suitable"}`}>
                          {formatPercent(c.churnProbability)} · {c.churnRisk}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "normal", minWidth: 200 }}>{c.churnDrivers.join(" · ")}</td>
                      <td style={{ whiteSpace: "normal", minWidth: 210 }}>{c.recommendedAction}</td>
                      <td>
                        {targetPersona && (
                          <button type="button" className="button-secondary crm-btn" onClick={() => onInspectClient(targetPersona)}>
                            <Eye size={13} /> Buka
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "campaign" && (
        <div className="governance-grid">
          <section className="panel policy-panel">
            <div className="panel-heading">
              <div>
                <span className="micro-label">TARGETED CAMPAIGN &amp; A/B DESIGN</span>
                <h2>
                  Parameter Uji A/B Kampanye{" "}
                  <HelpTip
                    title="Uji Statistik Two-Proportion Z-Test"
                    description="Menguji apakah kenaikan konversi kelompok Treatment (B) dibanding Control (A) signifikan secara statistik (p-value < 0,05) sebelum bank menggelontorkan anggaran promosi penuh."
                  />
                </h2>
              </div>
            </div>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <label className="field-label">
                Segmen Target Kampanye
                <select value={targetSegment} onChange={(e) => setTargetSegment(e.target.value)}>
                  <option value="At-Risk Dormant">At-Risk Dormant (Retensi &amp; Rebalance)</option>
                  <option value="VIP Accumulator">VIP Accumulator (Cross-Sell SBN / Sukuk)</option>
                  <option value="Core Growth">Core Growth (Promo Auto-DCA)</option>
                  <option value="Yield Seeker">Yield Seeker (Upgrade Fixed Income)</option>
                  <option value="SHARIA">Khusus Nasabah Syariah (DPS)</option>
                  <option value="ALL">Seluruh Basis Nasabah</option>
                </select>
              </label>
              <label className="range-control">
                <span><b>Skala Populasi Bank (Proyeksi)</b><strong className="tabular-nums">{bankPopulation.toLocaleString("id-ID")} nasabah</strong></span>
                <small>Proporsi segmen di CRM: {(segmentShare * 100).toFixed(0)}% → {abResult.audienceSize.toLocaleString("id-ID")} target sampel</small>
                <input type="range" min="200" max="5000" step="200" value={bankPopulation} onChange={(e) => setBankPopulation(Number(e.target.value))} />
              </label>
              <label className="range-control">
                <span><b>Baseline Konversi Control (A)</b><strong className="tabular-nums">{formatPercent(baseConversion)}</strong></span>
                <input type="range" min="0.02" max="0.25" step="0.005" value={baseConversion} onChange={(e) => setBaseConversion(Number(e.target.value))} />
              </label>
              <label className="range-control">
                <span><b>Estimasi Uplift Treatment (B)</b><strong className="tabular-nums">+{formatPercent(liftRate)}</strong></span>
                <input type="range" min="0.005" max="0.15" step="0.005" value={liftRate} onChange={(e) => setLiftRate(Number(e.target.value))} />
              </label>
              <label className="field-label">
                Biaya Kampanye / Nasabah (IDR)
                <input type="number" min="10000" step="15000" value={costPerClient} onChange={(e) => setCostPerClient(Math.max(10_000, Number(e.target.value) || 10_000))} className="text-input tabular-nums" />
              </label>
              <label className="field-label">
                Rata-Rata Top-Up per Konversi (IDR)
                <input type="number" min="1000000" step="5000000" value={avgTopUp} onChange={(e) => setAvgTopUp(Math.max(1_000_000, Number(e.target.value) || 1_000_000))} className="text-input tabular-nums" />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="micro-label">STATISTICAL SIGNIFICANCE &amp; ROI REPORT</span>
                <h2>Hasil Simulasi A/B Test ({abResult.audienceSize.toLocaleString("id-ID")} Sampel)</h2>
              </div>
              <span className={`suitability-pill ${abResult.statisticallySignificant ? "is-suitable" : "is-breach"}`}>
                {abResult.statisticallySignificant ? "SIGNIFIKAN (p < 0,05)" : "BELUM SIGNIFIKAN"}
              </span>
            </div>
            <div className="policy-summary-grid">
              <div className="policy-stat"><small>CONVERSION A → B</small><strong className="tabular-nums">{formatPercent(abResult.controlRate)} → {formatPercent(abResult.treatmentRate)}</strong></div>
              <div className="policy-stat"><small>Z-SCORE / P-VALUE</small><strong className="tabular-nums">{abResult.zScore.toFixed(2)} / {abResult.pValue.toFixed(4)}</strong></div>
              <div className="policy-stat"><small>INCREMENTAL AUM</small><strong className="tabular-nums positive-value">+{formatCompactIdr(abResult.incrementalAumIdr)}</strong></div>
              <div className="policy-stat"><small>ESTIMASI BIAYA KAMPANYE</small><strong className="tabular-nums">{formatCompactIdr(abResult.campaignCostIdr)}</strong></div>
              <div className="policy-stat"><small>EST. FEE MARGIN BANK (1,25%)</small><strong className="tabular-nums">{formatCompactIdr(abResult.estimatedAnnualFeeRevenueIdr)}</strong></div>
              <div className="policy-stat">
                <small>NET CAMPAIGN ROI</small>
                <strong className={`tabular-nums ${abResult.netRoiPercent >= 0 ? "positive-value" : "negative-value"}`}>
                  {abResult.netRoiPercent >= 0 ? "+" : ""}{abResult.netRoiPercent.toFixed(1)}%
                </strong>
              </div>
            </div>
            <div style={{ padding: "0 18px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <p className="muted-note" style={{ margin: 0, flex: "1 1 260px" }}>
                Rekomendasi: {abResult.statisticallySignificant && abResult.netRoiPercent > 0
                  ? "Kampanye layak diluncurkan penuh (signifikan α = 5% dan ROI positif)."
                  : "Tingkatkan efisiensi biaya per nasabah atau perkuat penawaran sebelum peluncuran."}
              </p>
              <button
                type="button"
                className={`button-primary ${launchedCampaigns.includes(targetSegment) ? "button-approved" : ""}`}
                onClick={handleLaunchCampaign}
              >
                {launchedCampaigns.includes(targetSegment) ? <CheckCircle2 size={15} /> : <Send size={15} />}
                <span>{launchedCampaigns.includes(targetSegment) ? "Tercatat di Audit Log" : "Luncurkan Kampanye"}</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {tab === "loyalty" && (
        <div className="governance-grid">
          <section className="panel policy-panel">
            <div className="panel-heading">
              <div>
                <span className="micro-label">LOYALTY TIER &amp; REWARD CONFIG</span>
                <h2>
                  Simulasi Program Loyalitas{" "}
                  <HelpTip
                    title="Targeted Retention vs All-Client Reward"
                    description="Memberi reward ke semua nasabah sering membebani biaya (free-rider cost). Mode Targeted Retention hanya memberi reward ke nasabah berisiko churn sedang/tinggi sehingga ROI jauh lebih sehat."
                  />
                </h2>
              </div>
            </div>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <label className="checkbox-inline" style={{ marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={targetedRetentionOnly}
                  onChange={(e) => {
                    setTargetedRetentionOnly(e.target.checked);
                  }}
                />
                <span>Targeted Retention (Hanya nasabah risiko churn Sedang/Tinggi)</span>
              </label>
              <label className="range-control">
                <span><b>Reward Platinum (≥ Rp 250 Jt)</b><strong className="tabular-nums">{platinumBps} bps/thn</strong></span>
                <input type="range" min="10" max="80" step="5" value={platinumBps} onChange={(e) => setPlatinumBps(Number(e.target.value))} />
              </label>
              <label className="range-control">
                <span><b>Reward Gold (Rp 100–249 Jt)</b><strong className="tabular-nums">{goldBps} bps/thn</strong></span>
                <input type="range" min="5" max="60" step="5" value={goldBps} onChange={(e) => setGoldBps(Number(e.target.value))} />
              </label>
              <label className="range-control">
                <span><b>Reward Silver (&lt; Rp 100 Jt)</b><strong className="tabular-nums">{silverBps} bps/thn</strong></span>
                <input type="range" min="0" max="40" step="5" value={silverBps} onChange={(e) => setSilverBps(Number(e.target.value))} />
              </label>
              <label className="range-control">
                <span><b>Efektivitas Penurunan Churn</b><strong className="tabular-nums">{(retentionEffect * 100).toFixed(0)}%</strong></span>
                <input type="range" min="0.1" max="0.8" step="0.05" value={retentionEffect} onChange={(e) => setRetentionEffect(Number(e.target.value))} />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="micro-label">COST VS RETENTION BENEFIT</span>
                <h2>Ringkasan ROI Program Loyalitas</h2>
              </div>
              <span className={`suitability-pill ${loyaltyResult.loyaltyRoiPercent >= 0 ? "is-suitable" : "is-breach"}`}>
                ROI {loyaltyResult.loyaltyRoiPercent >= 0 ? "+" : ""}{loyaltyResult.loyaltyRoiPercent.toFixed(1)}%
              </span>
            </div>
            <div className="policy-summary-grid">
              <div className="policy-stat"><small>AUM BERISIKO CHURN</small><strong className="tabular-nums">{formatCompactIdr(loyaltyResult.atRiskAumIdr)}</strong></div>
              <div className="policy-stat"><small>AUM BERHASIL DIPERTAHANKAN</small><strong className="tabular-nums positive-value">{formatCompactIdr(loyaltyResult.retainedAumIdr)}</strong></div>
              <div className="policy-stat"><small>BIAYA REWARD / TAHUN</small><strong className="tabular-nums negative-value">{formatIdr(loyaltyResult.annualRewardCostIdr)}</strong></div>
              <div className="policy-stat"><small>NET BENEFIT BANK / TAHUN</small><strong className={`tabular-nums ${loyaltyResult.netBenefitIdr >= 0 ? "positive-value" : "negative-value"}`}>{formatIdr(loyaltyResult.netBenefitIdr)}</strong></div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tier Loyalitas</th>
                    <th>Jumlah Nasabah</th>
                    <th>Total AUM Tier</th>
                    <th>Biaya Reward / Thn</th>
                  </tr>
                </thead>
                <tbody>
                  {loyaltyResult.tierBreakdown.map((row) => (
                    <tr key={row.tier}>
                      <th scope="row"><strong>{row.tier}</strong></th>
                      <td className="tabular-nums">{row.count} nasabah</td>
                      <td className="tabular-nums">{formatCompactIdr(row.totalAumIdr)}</td>
                      <td className="tabular-nums">{formatIdr(row.rewardCostIdr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "14px 18px", borderTop: "1px solid var(--grid)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span className="muted-note" style={{ margin: 0 }}>
                Penerima reward aktif: <strong>{loyaltyResult.eligibleClients} dari {customers.length} nasabah</strong> ({targetedRetentionOnly ? "Targeted Retention" : "Semua Nasabah"}).
              </span>
              <button
                type="button"
                className={`button-primary ${loyaltyActivated ? "button-approved" : ""}`}
                onClick={handleActivateLoyalty}
              >
                <CheckCircle2 size={15} />
                <span>{loyaltyActivated ? "Skema Aktif di Audit Log" : "Aktifkan Skema Loyalitas"}</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
