import type { AssetClass } from "@/types/quant";

function colorFor(value: number): string {
  if (value < 0) {
    const intensity = Math.min(0.8, Math.abs(value) * 0.62);
    return `rgba(15, 118, 110, ${intensity})`;
  }
  const intensity = Math.min(0.76, value * 0.62);
  return `rgba(180, 83, 9, ${intensity})`;
}

export function CorrelationHeatmap({ assets, matrix }: { assets: AssetClass[]; matrix: number[][] }) {
  return (
    <section className="panel chart-panel heatmap-panel">
      <div className="panel-heading chart-heading"><div><span className="micro-label">DIVERSIFICATION CHECK</span><h2>Correlation matrix</h2><p>Korelasi bulanan terannualisasi, dengan shrinkage constant-correlation 15%.</p></div><span className="engine-badge">ρ · {assets.length} × {assets.length}</span></div>
      <div className="heatmap-scroll"><table className="heatmap-table"><thead><tr><th scope="col">ASSET</th>{assets.map((asset) => <th scope="col" key={asset.id} title={asset.name}>{asset.ticker}</th>)}</tr></thead><tbody>{assets.map((asset, row) => <tr key={asset.id}><th scope="row" title={asset.name}>{asset.ticker}</th>{assets.map((columnAsset, column) => { const value = matrix[row]?.[column] ?? 0; return <td key={columnAsset.id} style={{ backgroundColor: colorFor(value) }} className="mono tabular-nums" title={`${asset.ticker} / ${columnAsset.ticker}: ${value.toFixed(3)}`}>{value.toFixed(2)}</td>; })}</tr>)}</tbody></table></div>
      <div className="heatmap-scale"><span>−1.00 · diversifikasi</span><span className="scale-gradient" aria-hidden="true" /><span>+1.00 · bergerak bersama</span></div>
    </section>
  );
}
