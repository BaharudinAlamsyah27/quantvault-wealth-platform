import { useEffect, useState } from "react";
import { FileText, Printer, X } from "lucide-react";
import type { DemoPersona, PortfolioPoint, RebalanceSummary } from "@/types/quant";
import type { SuitabilityCheckResult } from "@/lib/quant/rebalancer";
import { formatIdr, formatPercent } from "@/lib/utils/formatters";

interface Props {
  persona: DemoPersona;
  portfolio: PortfolioPoint;
  rebalance: RebalanceSummary;
  riskFreeRate: number;
  effectiveMaxWeight: number;
  shariaOnly: boolean;
  suitability: SuitabilityCheckResult;
  approved: boolean;
  onRequestReview: () => void;
}

export function IpsReportModal({ persona, portfolio, rebalance, riskFreeRate, effectiveMaxWeight, shariaOnly, suitability, approved, onRequestReview }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return <>
    <button className="button-primary ips-open-button" onClick={() => setOpen(true)}><FileText size={16} /> Buka &amp; cetak Investment Policy Statement</button>
    {open && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="ips-document" role="dialog" aria-modal="true" aria-labelledby="ips-title">
        <div className="ips-toolbar"><span className="micro-label">QUANTVAULT · PRIVATE WEALTH SIMULATION</span><div><button className="button-secondary" onClick={() => window.print()}><Printer size={15} /> Cetak / simpan PDF</button><button className="icon-button" onClick={() => setOpen(false)} aria-label="Tutup laporan"><X size={17} /></button></div></div>
        <div className="ips-content"><div className="ips-overline">INVESTMENT POLICY STATEMENT <span>·</span> DEMO / SINTETIS</div><h2 id="ips-title">Rencana investasi<br />{persona.name}</h2><p className="ips-intro">Ringkasan kebijakan portofolio untuk keperluan pembelajaran dan demonstrasi kuantitatif.</p>
          <div className="ips-metrics"><div><small>Net return (TER)</small><strong className="tabular-nums">{formatPercent(portfolio.netExpectedReturn)}</strong></div><div><small>Volatilitas</small><strong className="tabular-nums">{formatPercent(portfolio.volatility)}</strong></div><div><small>Sharpe / Calmar</small><strong className="tabular-nums">{portfolio.sharpeRatio.toFixed(2)} / {portfolio.calmarRatio.toFixed(2)}</strong></div></div>
          <div className="ips-two-col"><div><small>INVESTOR PROFILE</small><p>{persona.label}<br />Horizon {persona.horizonYears} tahun<br />Modal awal {formatIdr(persona.initialCapitalIdr)}<br />DCA {formatIdr(persona.monthlyContributionIdr)} / bulan</p></div><div><small>RISK &amp; SUITABILITY POLICY</small><p>Risk-free rate {formatPercent(riskFreeRate)} · TER {formatPercent(portfolio.weightedExpenseRatio)}<br />Plafon konsentrasi {formatPercent(effectiveMaxWeight)} / aset · VaR 95% {formatPercent(portfolio.var95)}<br />Status POJK: {suitability.status === "SUITABLE" ? "SUITABLE" : "SUITABILITY BREACH"}<br />{shariaOnly ? "Filter khusus Syariah (DPS) aktif" : "Universe konvensional & syariah"}</p></div></div>
          <div className="ips-allocation"><small>ALOKASI REKOMENDASI</small>{rebalance.instructions.filter((item) => item.targetWeight > 0.005).map((item) => <div key={item.assetId}><span>{item.ticker} · {item.name}</span><strong className="tabular-nums">{formatPercent(item.targetWeight)}</strong></div>)}</div>
          <div className="ips-approval"><span className={`approval-stamp ${approved ? "is-approved" : ""}`}>{approved ? "ADVISOR SIGN-OFF RECORDED" : "MENUNGGU REVIEW ADVISOR"}</span>{!approved && <button className="button-secondary" onClick={() => { setOpen(false); onRequestReview(); }}>Ajukan ke RM Desk</button>}</div>
          <p className="ips-disclaimer">Simulasi Kuantitatif untuk Portofolio Pembelajaran &amp; Demonstrasi Teknis — Menggunakan Data Pasar Sintetis Terkalibrasi.</p>
        </div>
      </section>
    </div>}
  </>;
}
