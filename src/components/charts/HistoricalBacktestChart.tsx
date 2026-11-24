import type { AssetClass } from "@/types/quant";
import { portfolioGrowthSeries } from "@/lib/quant/rebalancer";
import { formatRatio } from "@/lib/utils/formatters";

export function HistoricalBacktestChart({ assets, recommendedWeights, currentWeights }: { assets: AssetClass[]; recommendedWeights: Record<string, number>; currentWeights: Record<string, number> }) {
  const recommended = portfolioGrowthSeries(recommendedWeights, assets);
  const current = portfolioGrowthSeries(currentWeights, assets);
  const start = 100;
  const recommendedLine = recommended.map((value) => start * value);
  const currentLine = current.map((value) => start * value);
  const allValues = [...recommendedLine, ...currentLine];
  const minimum = Math.min(...allValues) * 0.96;
  const maximum = Math.max(...allValues) * 1.03;
  const width = 760;
  const height = 285;
  const margin = { left: 48, right: 18, top: 22, bottom: 38 };
  const x = (index: number) => margin.left + index / Math.max(1, recommendedLine.length - 1) * (width - margin.left - margin.right);
  const y = (value: number) => margin.top + (maximum - value) / Math.max(1e-8, maximum - minimum) * (height - margin.top - margin.bottom);
  const points = (series: number[]) => series.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const finalRecommended = recommendedLine[recommendedLine.length - 1] ?? 100;
  const finalCurrent = currentLine[currentLine.length - 1] ?? 100;
  return (
    <section className="panel chart-panel">
      <div className="panel-heading chart-heading"><div><span className="micro-label">SYNTHETIC HISTORY · 60 MONTHS</span><h2>Historical backtest</h2><p>Nilai indeks berawal dari 100; memakai seri imbal hasil historis sintetis yang sama.</p></div><span className="engine-badge">5 tahun</span></div>
      <div className="chart-scroll"><svg className="monte-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Perbandingan nilai historis portofolio sekarang dan rekomendasi">
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => { const value = minimum + (maximum - minimum) * fraction; return <g key={fraction}><line x1={margin.left} x2={width - margin.right} y1={y(value)} y2={y(value)} className="chart-grid-line" /><text x={margin.left - 8} y={y(value) + 4} textAnchor="end" className="chart-axis-label tabular-nums">{formatRatio(value)}</text></g>; })}
        <polyline points={points(currentLine)} className="backtest-current-line" /><polyline points={points(recommendedLine)} className="backtest-recommended-line" />
        <text x={margin.left} y={height - 8} className="chart-axis-label">NOV 2021</text><text x={width - margin.right} y={height - 8} textAnchor="end" className="chart-axis-label">OKT 2026</text>
      </svg></div>
      <div className="backtest-summary"><div><span>Rekomendasi · indeks akhir</span><strong className="mono tabular-nums">{formatRatio(finalRecommended)}</strong></div><div><span>Portofolio saat ini · indeks akhir</span><strong className="mono tabular-nums">{formatRatio(finalCurrent)}</strong></div><div><span>Selisih nilai indeks</span><strong className="mono tabular-nums">{formatRatio(finalRecommended - finalCurrent)}</strong></div></div>
      <div className="chart-legend"><span><i className="legend-swatch frontier-swatch" />Alokasi rekomendasi</span><span><i className="legend-swatch current-swatch" />Alokasi saat ini</span></div>
    </section>
  );
}
