import type { AssetClass, OptimizationResult, PortfolioPoint, RebalanceSummary } from "@/types/quant";
import { formatIdr, formatPercent } from "@/lib/utils/formatters";
import { HelpTip } from "@/components/ui/HelpTip";

interface Props {
  assets: AssetClass[];
  rebalance: RebalanceSummary;
  result: OptimizationResult;
}

const categoryGroups = [
  { key: "MONEY_MARKET", label: "Pasar Uang", color: "#0ea5e9" },
  { key: "FIXED_INCOME", label: "Pendapatan Tetap & Sukuk", color: "#0f766e" },
  { key: "EQUITY_ALL", label: "Ekuitas / Saham", color: "#d97706" },
  { key: "COMMODITY", label: "Emas / Komoditas", color: "#64748b" },
] as const;

export function AllocationTable({ assets, rebalance, result }: Props) {
  const categoryWeights = categoryGroups.map((group) => {
    const weight = assets
      .filter((asset) =>
        group.key === "EQUITY_ALL"
          ? asset.category === "EQUITY" || asset.category === "GLOBAL_EQUITY"
          : asset.category === group.key,
      )
      .reduce((sum, asset) => sum + (rebalance.recommended.weights[asset.id] ?? 0), 0);
    return { ...group, weight };
  });

  const benchmarks: { name: string; point: PortfolioPoint; highlight?: boolean }[] = [
    { name: "Optimal Markowitz (Aktif)", point: result.optimal, highlight: true },
    { name: "Risk Parity (ERC)", point: result.benchmarks.riskParity },
    { name: "Equal Weight (1/N)", point: result.benchmarks.equalWeight },
    { name: "Portofolio Berjalan", point: { ...rebalance.current, weights: {} } },
  ];

  return (
    <div className="allocation-stack">
      <section className="panel allocation-panel">
        <div className="panel-heading chart-heading">
          <div>
            <span className="micro-label">RECOMMENDED ALLOCATION</span>
            <h2>
              Alokasi bobot &amp; kontribusi risiko{" "}
              <HelpTip
                title="Alokasi Bobot & Risk Contribution (%RC)"
                description="Menunjukkan bobot optimal setiap instrumen agar total menjadi 100%, beserta porsi kontribusi masing-masing instrumen terhadap total risiko portofolio (%RC)."
              />
            </h2>
            <p>
              Weighted TER <strong className="tabular-nums">{formatPercent(rebalance.recommended.weightedExpenseRatio)}</strong> · Net Return{" "}
              <strong className="tabular-nums">{formatPercent(rebalance.recommended.netExpectedReturn)}</strong> · Efektif{" "}
              <strong className="tabular-nums">{rebalance.recommended.effectiveAssets.toFixed(1)}</strong> aset
            </p>
          </div>
          <span className="allocation-total tabular-nums">100.00%</span>
        </div>

        <div className="asset-mix-section">
          <div className="asset-mix-bar" role="img" aria-label="Proporsi kelas aset portofolio">
            {categoryWeights.map(
              (group) =>
                group.weight > 0.005 && (
                  <div
                    key={group.key}
                    style={{ width: `${group.weight * 100}%`, backgroundColor: group.color }}
                    title={`${group.label}: ${formatPercent(group.weight)}`}
                  />
                ),
            )}
          </div>
          <div className="asset-mix-legend">
            {categoryWeights.map((group) => (
              <span key={group.key}>
                <i style={{ backgroundColor: group.color }} />
                {group.label}: <strong className="tabular-nums">{formatPercent(group.weight)}</strong>
              </span>
            ))}
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table allocation-table">
            <thead>
              <tr>
                <th>Instrumen</th>
                <th>Bobot kini</th>
                <th>Target</th>
                <th>Kontribusi risiko</th>
                <th>Rebalance</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => {
                const item = rebalance.instructions.find((instruction) => instruction.assetId === asset.id);
                if (!item) return null;
                return (
                  <tr key={asset.id} className={item.targetWeight > 0 ? "" : "muted-row"}>
                    <th scope="row">
                      <span className="ticker-cell">{asset.ticker}</span>
                      <small>{asset.name}</small>
                    </th>
                    <td className="tabular-nums">{formatPercent(item.currentWeight)}</td>
                    <td>
                      <div className="weight-cell">
                        <span className="tabular-nums">{formatPercent(item.targetWeight)}</span>
                        <span className="weight-track">
                          <i style={{ width: `${item.targetWeight * 100}%` }} />
                        </span>
                      </div>
                    </td>
                    <td className="tabular-nums">{formatPercent(item.riskContribution)}</td>
                    <td>
                      <span className={`action-chip action-${item.action.toLowerCase()}`}>[{item.action}]</span>
                      <span className="tabular-nums trade-amount">{formatIdr(Math.abs(item.deltaAmountIdr))}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rebalance-summary-strip">
          <div>
            <small>Expected return kini → target</small>
            <strong className="tabular-nums">
              {formatPercent(rebalance.current.expectedReturn)} <span>→</span> {formatPercent(rebalance.recommended.expectedReturn)}
            </strong>
          </div>
          <div>
            <small>Sharpe uplift</small>
            <strong className="tabular-nums positive-value">
              {rebalance.sharpeUplift >= 0 ? "+" : ""}
              {rebalance.sharpeUplift.toFixed(2)}
            </strong>
          </div>
          <div>
            <small>Total drift</small>
            <strong className="tabular-nums">{formatPercent(rebalance.totalDrift)}</strong>
          </div>
        </div>
      </section>

      <section className="panel benchmark-panel">
        <div className="panel-heading">
          <div>
            <span className="micro-label">STRATEGY BENCHMARKING</span>
            <h2>
              Komparasi strategi kuantitatif{" "}
              <HelpTip
                title="Markowitz vs Risk Parity vs Equal Weight"
                description="Membandingkan efisiensi portofolio Markowitz MVO dengan strategi Risk Parity (menyamakan kontribusi risiko tiap aset) dan Equal Weight (1/N bobot sama rata)."
              />
            </h2>
            <p>Membandingkan Markowitz MVO terhadap Risk Parity (ERC), Equal Weight (1/N), dan portofolio awal.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Strategi</th>
                <th>Gross Return</th>
                <th>Net Return (TER)</th>
                <th>Volatilitas</th>
                <th>Sharpe</th>
                <th>Calmar</th>
                <th>N_eff</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((row) => (
                <tr key={row.name} className={row.highlight ? "benchmark-highlight" : ""}>
                  <th scope="row">{row.name}</th>
                  <td className="tabular-nums">{formatPercent(row.point.expectedReturn)}</td>
                  <td className="tabular-nums">{formatPercent(row.point.netExpectedReturn)}</td>
                  <td className="tabular-nums">{formatPercent(row.point.volatility)}</td>
                  <td className="tabular-nums"><strong>{row.point.sharpeRatio.toFixed(2)}</strong></td>
                  <td className="tabular-nums">{row.point.calmarRatio.toFixed(2)}</td>
                  <td className="tabular-nums">{row.point.effectiveAssets.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
