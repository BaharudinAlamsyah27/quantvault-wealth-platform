import { CheckCircle2 } from "lucide-react";
import type { AssetClass, RebalanceSummary } from "@/types/quant";
import { formatIdr, formatPercent } from "@/lib/utils/formatters";

interface Props {
  assets: AssetClass[];
  currentWeights: Record<string, number>;
  onWeightsChange: (weights: Record<string, number>) => void;
  portfolioValueIdr: number;
  onPortfolioValueChange: (value: number) => void;
  rebalance: RebalanceSummary;
  onExecuteRebalance: () => void;
}

const SWITCHING_FEE_RATE = 0.0015; // 0.15% estimasi biaya switching / transaksi

export function RebalanceCalculator({
  assets,
  currentWeights,
  onWeightsChange,
  portfolioValueIdr,
  onPortfolioValueChange,
  rebalance,
  onExecuteRebalance,
}: Props) {
  const inputTotal = assets.reduce((sum, asset) => sum + (currentWeights[asset.id] ?? 0), 0);
  const normalize = () => {
    if (inputTotal <= 0) return;
    onWeightsChange(Object.fromEntries(assets.map((asset) => [asset.id, (currentWeights[asset.id] ?? 0) / inputTotal])));
  };

  const totalBuyIdr = rebalance.instructions
    .filter((item) => item.action === "BUY")
    .reduce((sum, item) => sum + item.deltaAmountIdr, 0);
  const totalSellIdr = rebalance.instructions
    .filter((item) => item.action === "SELL")
    .reduce((sum, item) => sum + Math.abs(item.deltaAmountIdr), 0);
  const estimatedFeeIdr = (totalBuyIdr + totalSellIdr) * SWITCHING_FEE_RATE * 0.5;
  const isAligned = rebalance.totalDrift < 0.01;

  return (
    <section className="panel rebalance-panel">
      <div className="panel-heading chart-heading">
        <div>
          <span className="micro-label">CURRENT VS RECOMMENDED · ORDER TICKET</span>
          <h2>Kalkulator &amp; eksekusi rebalancing</h2>
          <p>Masukkan bobot portofolio berjalan untuk menghitung tiket order beli/jual dalam Rupiah.</p>
        </div>
        <span className={`input-total-chip tabular-nums ${Math.abs(inputTotal - 1) < 1e-4 ? "is-balanced" : ""}`}>
          {formatPercent(inputTotal)} total
        </span>
      </div>

      <div className="rebalance-controls">
        <label className="field-label">
          Nilai portofolio (AUM)
          <span className="input-with-prefix">
            <b>Rp</b>
            <input
              className="tabular-nums"
              type="number"
              min="100000"
              step="1000000"
              value={portfolioValueIdr}
              onChange={(event) => onPortfolioValueChange(Math.max(100_000, Number(event.target.value) || 100_000))}
            />
          </span>
        </label>
        <div className="rebalance-btn-group">
          <button type="button" className="button-secondary" onClick={normalize} disabled={inputTotal <= 0}>
            Normalisasi ke 100%
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={onExecuteRebalance}
            disabled={isAligned}
          >
            <CheckCircle2 size={15} />
            <span>{isAligned ? "Portofolio Sudah Optimal" : "Simulasikan Eksekusi Rebalance"}</span>
          </button>
        </div>
      </div>

      <div className="order-ticket-strip">
        <div>
          <small>TOTAL ORDER BELI (BUY)</small>
          <strong className="tabular-nums positive-value">{formatIdr(totalBuyIdr)}</strong>
        </div>
        <div>
          <small>TOTAL ORDER JUAL (SELL)</small>
          <strong className="tabular-nums negative-value">{formatIdr(totalSellIdr)}</strong>
        </div>
        <div>
          <small>ESTIMASI BIAYA TRANSAKSI (0,15%)</small>
          <strong className="tabular-nums">{formatIdr(estimatedFeeIdr)}</strong>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table current-weight-table">
          <thead>
            <tr>
              <th>Instrumen</th>
              <th>Bobot saat ini</th>
              <th>Target</th>
              <th>Aksi · IDR</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const target = rebalance.recommended.weights[asset.id] ?? 0;
              const instruction = rebalance.instructions.find((item) => item.assetId === asset.id);
              return (
                <tr key={asset.id}>
                  <th scope="row">
                    <span className="ticker-cell">{asset.ticker}</span>
                  </th>
                  <td>
                    <div className="percent-input">
                      <input
                        aria-label={`Bobot sekarang ${asset.name} dalam persen`}
                        className="tabular-nums"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.round((currentWeights[asset.id] ?? 0) * 1000) / 10}
                        onChange={(event) =>
                          onWeightsChange({
                            ...currentWeights,
                            [asset.id]: Math.min(1, Math.max(0, Number(event.target.value) || 0) / 100),
                          })
                        }
                      />
                      <span>%</span>
                    </div>
                  </td>
                  <td className="tabular-nums">{formatPercent(target)}</td>
                  <td>
                    <span className={`action-chip action-${instruction?.action.toLowerCase()}`}>
                      [{instruction?.action}]
                    </span>
                    <span className="tabular-nums trade-amount">
                      {formatIdr(Math.abs(instruction?.deltaAmountIdr ?? 0))}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="efficiency-uplift">
        <div>
          <small>Δ RETURN TAHUNAN</small>
          <strong className="tabular-nums">
            {rebalance.returnUplift >= 0 ? "+" : ""}
            {formatPercent(rebalance.returnUplift)}
          </strong>
        </div>
        <div>
          <small>Δ VOLATILITAS</small>
          <strong className="tabular-nums">
            {rebalance.volatilityChange >= 0 ? "+" : "−"}
            {formatPercent(Math.abs(rebalance.volatilityChange))}
          </strong>
        </div>
        <div>
          <small>Δ SHARPE</small>
          <strong className="tabular-nums">
            {rebalance.sharpeUplift >= 0 ? "+" : ""}
            {rebalance.sharpeUplift.toFixed(2)}
          </strong>
        </div>
      </div>
      <p className="muted-note">
        Menekan tombol &ldquo;Simulasikan Eksekusi Rebalance&rdquo; akan menyelaraskan bobot berjalan ke target optimal dan mencatat event ke Governance Audit Log.
      </p>
    </section>
  );
}
