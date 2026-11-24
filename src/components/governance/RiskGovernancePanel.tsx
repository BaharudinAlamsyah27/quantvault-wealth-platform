import { useState } from "react";
import { Activity, BadgeCheck, LockKeyhole, Play, RotateCcw, ShieldCheck } from "lucide-react";
import type { AssetClass, GovernanceAuditEntry } from "@/types/quant";
import type { AssetOverride } from "@/lib/storage/demo-session";
import { formatPercent } from "@/lib/utils/formatters";
import { HelpTip } from "@/components/ui/HelpTip";

interface Props {
  assets: AssetClass[];
  riskFreeRate: number;
  maxWeight: number;
  effectiveMaxWeight: number;
  onRiskFreeRateChange: (value: number) => void;
  onMaxWeightChange: (value: number) => void;
  onAssetActiveChange: (id: string, value: boolean) => void;
  onShariaChange: (id: string, value: boolean) => void;
  onAssetOverrideChange: (id: string, override: AssetOverride) => void;
  onResetAssetOverrides: () => void;
  hasAssetOverrides: boolean;
  sumWeights: number;
  highestWeight: number;
  typescriptWeights: Record<string, number>;
  var95: number;
  auditLog: GovernanceAuditEntry[];
  onVerify: () => Promise<unknown>;
}

interface PythonResult { engine?: string; weights?: Record<string, number>; metrics?: { expectedReturn?: number }; available?: boolean; message?: string; status?: number }

export function RiskGovernancePanel(props: Props) {
  const [verification, setVerification] = useState<PythonResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const activeCount = props.assets.filter((asset) => asset.active !== false).length;
  const allocationPass = Math.abs(props.sumWeights - 1) < 1e-6;
  const concentrationPass = props.highestWeight <= props.effectiveMaxWeight + 1e-6;
  const verificationAvailable = verification?.weights !== undefined;
  const maximumWeightDifference = verification?.weights
    ? Math.max(...props.assets.map((asset) => Math.abs((verification.weights?.[asset.id] ?? 0) - (props.typescriptWeights[asset.id] ?? 0))))
    : null;
  const runVerification = async () => {
    setVerifying(true);
    setVerifyError(null);
    try { setVerification(await props.onVerify() as PythonResult); }
    catch (error) { setVerifyError(error instanceof Error ? error.message : "Engine Python tidak tersedia."); }
    finally { setVerifying(false); }
  };

  return (
    <section className="role-workspace governance-workspace">
      <div className="role-authority-banner has-media">
        <img
          src="/images/quant-analyst.jpg"
          alt="Analis kuantitatif dan auditor risiko memeriksa parameter pasar"
          width={76}
          height={52}
          className="banner-thumb editorial-img-top"
        />
        <div>
          <strong>Peran Aktif: Komite Investasi, Risiko &amp; Auditor (DPS Governance)</strong>
          <span>
            Wewenang: Mengubah suku bunga bebas risiko (BI-Rate/SBN), batas konsentrasi maksimum per aset, membekukan/mengaktifkan instrumen, memverifikasi status Syariah (DPS), mengedit asumsi Return (μ), Volatilitas (σ), &amp; TER secara manual, serta mengaudit solver SLSQP.
          </span>
        </div>
      </div>

      <div className="workspace-title-row">
        <div>
          <span className="micro-label">INVESTMENT COMMITTEE · GOVERNANCE &amp; MARKET DATA</span>
          <h1>Kontrol Risiko, Parameter Pasar &amp; Audit</h1>
          <p>Angka awal berasal dari model faktor 60 bulan terkalibrasi dan dapat diubah manual langsung di tabel bawah.</p>
        </div>
        <div className="governance-status"><span className="status-dot" /> POLICY ENGINE ACTIVE</div>
      </div>

      <div className="governance-grid">
        <div className="governance-left-col">
          <section className="panel policy-panel">
            <div className="panel-heading">
              <div>
                <span className="micro-label">BANK POLICY</span>
                <h2>
                  Investment Guardrails{" "}
                  <HelpTip
                    title="Investment Guardrails"
                    description="Batasan kebijakan makro bank yang otomatis mengikat seluruh optimasi portofolio di Workspace Nasabah maupun Wealth Advisor."
                  />
                </h2>
              </div>
              <LockKeyhole size={18} />
            </div>
            <label className="range-control">
              <span><b>Risk-free rate (Rf)</b><strong className="tabular-nums">{formatPercent(props.riskFreeRate)}</strong></span>
              <small>Asumsi acuan tahunan kupon SBN / BI-Rate untuk menghitung Sharpe Ratio.</small>
              <input type="range" min="0.02" max="0.12" step="0.0025" value={props.riskFreeRate} onChange={(event) => props.onRiskFreeRateChange(Number(event.target.value))} />
              <span className="range-endpoints"><span>2,00%</span><span>12,00%</span></span>
            </label>
            <label className="range-control">
              <span><b>Batas bobot per aset (w_max)</b><strong className="tabular-nums">{formatPercent(props.maxWeight)}</strong></span>
              <small>Effective cap {formatPercent(props.effectiveMaxWeight)} · {activeCount} aset aktif</small>
              <input type="range" min="0.15" max="0.7" step="0.01" value={props.maxWeight} onChange={(event) => props.onMaxWeightChange(Number(event.target.value))} />
              <span className="range-endpoints"><span>15%</span><span>70%</span></span>
            </label>
            {props.effectiveMaxWeight > props.maxWeight && (
              <p className="policy-notice">Cap dinaikkan ke batas feasible karena aset aktif tidak cukup untuk membentuk bobot 100%.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div><span className="micro-label">POLICY SNAPSHOT</span><h2>Ringkasan Kepatuhan Universe</h2></div>
            </div>
            <div className="policy-summary-grid">
              <div className="policy-stat"><small>INSTRUMEN AKTIF</small><strong className="tabular-nums">{activeCount} / {props.assets.length}</strong></div>
              <div className="policy-stat"><small>DPS SYARIAH</small><strong className="tabular-nums">{props.assets.filter((asset) => asset.active !== false && asset.isSharia).length} aset</strong></div>
              <div className="policy-stat"><small>PLAFON EFEKTIF</small><strong className="tabular-nums">{formatPercent(props.effectiveMaxWeight)}</strong></div>
              <div className="policy-stat"><small>AUDIT TRAIL</small><strong className="tabular-nums">{props.auditLog.length} log</strong></div>
            </div>
          </section>
        </div>

        <section className="panel universe-panel">
          <div className="panel-heading">
            <div>
              <span className="micro-label">ASSET UNIVERSE &amp; MANUAL CALIBRATION</span>
              <h2>
                Parameter Pasar &amp; Status DPS{" "}
                <HelpTip
                  title="Sumber Data & Edit Manual"
                  description="Angka default berasal dari model faktor sintetis 60 bulan (mengacu karakteristik Pasar Uang, SBN/Sukuk, JII70, LQ45, dan Emas). Anda dapat mengubah Return (μ), Volatilitas (σ), dan TER (%) secara manual di sini untuk simulasi skenario pasar Anda sendiri."
                />
              </h2>
            </div>
            {props.hasAssetOverrides && (
              <button type="button" className="button-secondary crm-btn" onClick={props.onResetAssetOverrides}>
                <RotateCcw size={13} /> Reset Kalibrasi
              </button>
            )}
          </div>

          <div className="table-scroll">
            <table className="data-table universe-edit-table">
              <thead>
                <tr>
                  <th>Aktif &amp; Instrumen</th>
                  <th>Return μ (%)</th>
                  <th>Volatilitas σ (%)</th>
                  <th>TER (%)</th>
                  <th>Status DPS</th>
                </tr>
              </thead>
              <tbody>
                {props.assets.map((asset) => (
                  <tr key={asset.id} className={asset.active === false ? "muted-row" : ""}>
                    <th scope="row">
                      <div className="universe-asset">
                        <label className="check-control" aria-label={`Aktifkan ${asset.ticker}`}>
                          <input type="checkbox" checked={asset.active !== false} onChange={(event) => props.onAssetActiveChange(asset.id, event.target.checked)} />
                          <span className="check-box" />
                        </label>
                        <span>
                          <strong>{asset.ticker}</strong>
                          <small>{asset.name}</small>
                        </span>
                      </div>
                    </th>
                    <td>
                      <div className="percent-input">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="60"
                          aria-label={`Expected return ${asset.ticker}`}
                          className="tabular-nums"
                          value={Math.round(asset.expectedAnnualReturn * 10000) / 100}
                          onChange={(e) =>
                            props.onAssetOverrideChange(asset.id, {
                              expectedAnnualReturn: Math.min(0.6, Math.max(0, (Number(e.target.value) || 0) / 100)),
                              annualVolatility: asset.annualVolatility,
                              expenseRatio: asset.expenseRatio,
                            })
                          }
                        />
                        <span>%</span>
                      </div>
                    </td>
                    <td>
                      <div className="percent-input">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="80"
                          aria-label={`Volatilitas ${asset.ticker}`}
                          className="tabular-nums"
                          value={Math.round(asset.annualVolatility * 10000) / 100}
                          onChange={(e) =>
                            props.onAssetOverrideChange(asset.id, {
                              expectedAnnualReturn: asset.expectedAnnualReturn,
                              annualVolatility: Math.min(0.8, Math.max(0.001, (Number(e.target.value) || 0.1) / 100)),
                              expenseRatio: asset.expenseRatio,
                            })
                          }
                        />
                        <span>%</span>
                      </div>
                    </td>
                    <td>
                      <div className="percent-input">
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="5"
                          aria-label={`Expense ratio ${asset.ticker}`}
                          className="tabular-nums"
                          value={Math.round(asset.expenseRatio * 10000) / 100}
                          onChange={(e) =>
                            props.onAssetOverrideChange(asset.id, {
                              expectedAnnualReturn: asset.expectedAnnualReturn,
                              annualVolatility: asset.annualVolatility,
                              expenseRatio: Math.min(0.05, Math.max(0, (Number(e.target.value) || 0) / 100)),
                            })
                          }
                        />
                        <span>%</span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`sharia-status ${asset.isSharia ? "is-compliant" : "is-conventional"}`}
                        onClick={() => props.onShariaChange(asset.id, !asset.isSharia)}
                        aria-label={`Ubah status DPS untuk ${asset.ticker}`}
                      >
                        <BadgeCheck size={13} />
                        {asset.isSharia ? "DPS VERIFIED" : "CONVENTIONAL"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted-note">Setiap perubahan angka μ, σ, TER, atau status DPS langsung mengkalibrasi ulang seri 60 bulan dan memperbarui kurva Efficient Frontier secara real-time.</p>
        </section>
      </div>

      <section className="panel audit-check-panel">
        <div className="panel-heading chart-heading">
          <div>
            <span className="micro-label">QUANT SOLVER AUDIT CHECK</span>
            <h2>
              Invariant Verification &amp; Cross-Engine Check{" "}
              <HelpTip
                title="Verifikasi Silang Python SLSQP"
                description="Membandingkan hasil optimasi TypeScript di browser dengan mesin optimasi Python (SciPy SLSQP) di server untuk memastikan tidak ada penyimpangan numerik."
              />
            </h2>
            <p>Pemeriksaan langsung atas alokasi aktif terhadap kendala kebijakan bank.</p>
          </div>
          <button type="button" className="button-secondary" onClick={runVerification} disabled={verifying}>
            <Play size={14} />{verifying ? "Menghubungi engine…" : "Verifikasi Python SLSQP"}
          </button>
        </div>
        <div className="audit-metric-grid">
          <AuditMetric pass={allocationPass} label="Σ bobot optimal" value={`${(props.sumWeights * 100).toFixed(4)}%`} />
          <AuditMetric pass={concentrationPass} label="Batas konsentrasi" value={`${formatPercent(props.highestWeight)} ≤ ${formatPercent(props.effectiveMaxWeight)}`} />
          <AuditMetric pass={props.var95 < 1} label="VaR 95% tahunan" value={formatPercent(props.var95)} />
          <div className="audit-metric">
            <small>PYTHON SLSQP</small>
            <strong className="tabular-nums">{verificationAvailable ? verification?.engine ?? "CONNECTED" : verification?.available === false ? "UNAVAILABLE" : "NOT CHECKED"}</strong>
            <span>{verificationAvailable ? `μ ${formatPercent(verification?.metrics?.expectedReturn ?? 0)}` : verifyError ?? verification?.message ?? "Klik Verifikasi untuk uji silang backend."}</span>
          </div>
        </div>
        {verificationAvailable && <div className="python-diff"><Activity size={15} /> Selisih bobot maksimum TypeScript vs Python: <strong className="tabular-nums">{((maximumWeightDifference ?? 0) * 10_000).toFixed(2)} bp</strong>.</div>}
        {verificationAvailable && <div className="python-weight-table"><div className="python-weight-head"><span>Instrumen</span><span>TypeScript</span><span>Python SLSQP</span><span>Δ bp</span></div>{props.assets.map((asset) => { const typescriptWeight = props.typescriptWeights[asset.id] ?? 0; const pythonWeight = verification?.weights?.[asset.id] ?? 0; return <div className="python-weight-row" key={asset.id}><strong>{asset.ticker}</strong><span className="tabular-nums">{formatPercent(typescriptWeight)}</span><span className="tabular-nums">{formatPercent(pythonWeight)}</span><span className="tabular-nums">{((pythonWeight - typescriptWeight) * 10_000).toFixed(2)}</span></div>; })}</div>}
      </section>

      <section className="panel audit-log-panel">
        <div className="panel-heading chart-heading">
          <div><span className="micro-label">GOVERNANCE AUDIT TRAIL</span><h2>Log Perubahan Kebijakan &amp; Eksekusi</h2><p>Mencatat seluruh perubahan guardrail, parameter pasar, persetujuan RM, dan simulasi rebalance.</p></div>
          <span className="engine-badge">{props.auditLog.length} event</span>
        </div>
        {props.auditLog.length === 0 ? <div className="empty-audit"><ShieldCheck size={18} /><span>Belum ada perubahan. Setiap pembaruan guardrail atau eksekusi rebalance akan dicatat di sini.</span></div> : <div className="audit-log-list">{props.auditLog.slice(0, 15).map((entry) => <article className="audit-log-row" key={entry.id}><span className="audit-log-time tabular-nums">{new Date(entry.timestamp).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span><strong>{entry.actor}</strong><span>{entry.action} · {entry.detail}</span></article>)}</div>}
      </section>
    </section>
  );
}

function AuditMetric({ pass, label, value }: { pass: boolean; label: string; value: string }) {
  return <div className="audit-metric"><small>{label}</small><strong className="tabular-nums">{value}</strong><span className={pass ? "positive-value" : "negative-value"}>{pass ? "PASS · invariant met" : "CHECK · review constraint"}</span></div>;
}
