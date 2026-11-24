import { useMemo, useState } from "react";
import type { OptimizationResult, PortfolioPoint } from "@/types/quant";
import { formatPercent, formatRatio } from "@/lib/utils/formatters";
import { HelpTip } from "@/components/ui/HelpTip";

interface Props {
  result: OptimizationResult;
  riskFreeRate: number;
  shariaOnly?: boolean;
  currentPoint: PortfolioPoint;
  onSelectTarget: (annualReturn: number) => void;
}

interface HoveredInfo {
  title: string;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  topHoldings: string;
}

const width = 820;
const height = 366;
const margin = { left: 54, right: 32, top: 24, bottom: 46 };

export function EfficientFrontierChart({ result, riskFreeRate, shariaOnly = false, currentPoint, onSelectTarget }: Props) {
  const [hovered, setHovered] = useState<HoveredInfo | null>(null);
  const points = result.frontierPoints;
  const tickerById = useMemo(
    () => Object.fromEntries(result.assets.map((asset) => [asset.id, asset.ticker])),
    [result.assets],
  );
  const formatTopWeights = (weights: Record<string, number>) => {
    const top = Object.entries(weights)
      .filter(([, weight]) => weight >= 0.01)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, weight]) => `${tickerById[id] ?? id} ${formatPercent(weight)}`);
    return top.length > 0 ? top.join(" · ") : "Alokasi tersebar";
  };

  const defaultReadout: HoveredInfo = {
    title: "Rekomendasi Aktif",
    expectedReturn: result.optimal.expectedReturn,
    volatility: result.optimal.volatility,
    sharpeRatio: result.optimal.sharpeRatio,
    topHoldings: formatTopWeights(result.optimal.weights),
  };
  const activeReadout = hovered ?? defaultReadout;

  const domains = useMemo(() => {
    const allVol = [...points.map((point) => point.volatility), ...result.cloudPoints.map((point) => point.volatility), result.optimal.volatility, currentPoint.volatility];
    const allReturn = [...points.map((point) => point.expectedReturn), ...result.cloudPoints.map((point) => point.expectedReturn), result.optimal.expectedReturn, currentPoint.expectedReturn, riskFreeRate];
    const xMax = Math.max(0.08, Math.max(...allVol) * 1.16);
    const yMin = Math.min(0, Math.min(...allReturn) - 0.015);
    const yMax = Math.max(0.16, Math.max(...allReturn) + 0.02);
    return { xMax, yMin, yMax };
  }, [points, result.cloudPoints, result.optimal, currentPoint, riskFreeRate]);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const x = (value: number) => margin.left + (value / domains.xMax) * innerWidth;
  const y = (value: number) => margin.top + ((domains.yMax - value) / (domains.yMax - domains.yMin)) * innerHeight;
  const curve = points.map((point) => `${x(point.volatility)},${y(point.expectedReturn)}`).join(" ");
  const tangentX = Math.min(domains.xMax, result.maxSharpe.volatility * 1.35);
  const tangentY = riskFreeRate + ((result.maxSharpe.expectedReturn - riskFreeRate) / Math.max(result.maxSharpe.volatility, 1e-8)) * tangentX;
  const xTicks = Array.from({ length: 5 }, (_, index) => domains.xMax * index / 4);
  const yTicks = Array.from({ length: 5 }, (_, index) => domains.yMin + (domains.yMax - domains.yMin) * index / 4);
  const currentX = x(currentPoint.volatility);
  const currentY = y(currentPoint.expectedReturn);
  const optimalX = x(result.optimal.volatility);
  const optimalY = y(result.optimal.expectedReturn);

  return (
    <section className="panel chart-panel">
      <div className="panel-heading chart-heading">
        <div>
          <span className="micro-label">RISK / RETURN MAP</span>
          <h2>
            Efficient Frontier{" "}
            <HelpTip
              title="Kurva Efficient Frontier (Markowitz)"
              description="Menampilkan kombinasi portofolio optimal dengan imbal hasil maksimal pada tiap tingkat risiko. Titik-titik di bawah kurva adalah 300 portofolio acak yang tidak efisien. Klik titik di kurva untuk memilih target return."
            />
          </h2>
          <p>Risiko tahunan dan expected return dari portofolio long-only.</p>
        </div>
        <span className="engine-badge"><span className="status-dot" /> 40 titik efisien</span>
      </div>
      <div className="chart-scroll">
        <svg
          className="frontier-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Grafik efficient frontier dengan risiko di sumbu horizontal dan expected return di sumbu vertikal"
          onMouseLeave={() => setHovered(null)}
        >
          {xTicks.map((tick, index) => <g key={`x${index}`}><line x1={x(tick)} y1={margin.top} x2={x(tick)} y2={height - margin.bottom} className="chart-grid-line" /><text x={x(tick)} y={height - margin.bottom + 22} textAnchor="middle" className="chart-axis-label tabular-nums">{formatPercent(tick)}</text></g>)}
          {yTicks.map((tick, index) => <g key={`y${index}`}><line x1={margin.left} y1={y(tick)} x2={width - margin.right} y2={y(tick)} className="chart-grid-line" /><text x={margin.left - 10} y={y(tick) + 4} textAnchor="end" className="chart-axis-label tabular-nums">{formatPercent(tick)}</text></g>)}
          <text x={width / 2} y={height - 7} textAnchor="middle" className="chart-axis-title">ANNUAL VOLATILITY</text>
          <text x={15} y={height / 2} transform={`rotate(-90 15 ${height / 2})`} textAnchor="middle" className="chart-axis-title">EXPECTED RETURN</text>
          <line x1={x(0)} y1={y(riskFreeRate)} x2={x(tangentX)} y2={y(tangentY)} className="capital-line" />
          {result.cloudPoints.map((point, index) => <circle key={`cloud-${index}`} cx={x(point.volatility)} cy={y(point.expectedReturn)} r="2.2" className="cloud-point" aria-hidden="true"><title>Simulasi {index + 1}: {formatPercent(point.expectedReturn)} return, {formatPercent(point.volatility)} risiko</title></circle>)}
          {result.assets.map((asset, index) => {
            const volatility = Math.sqrt(Math.max(0, result.covarianceMatrix[index]?.[index] ?? 0));
            const expectedReturn = result.means[index] ?? asset.expectedAnnualReturn;
            const px = x(volatility);
            const py = y(expectedReturn);
            const isEligible = asset.active !== false && (!shariaOnly || asset.isSharia);
            const showLabel = index >= 4;
            const labelOffsetY = index % 2 === 0 ? -9 : 14;
            const assetSharpe = volatility > 1e-12 ? (expectedReturn - riskFreeRate) / volatility : 0;
            return (
              <g
                key={asset.id}
                className={`asset-node ${isEligible ? "" : "is-ineligible"}`}
                onMouseEnter={() =>
                  setHovered({
                    title: `${asset.ticker} (${asset.name})`,
                    expectedReturn,
                    volatility,
                    sharpeRatio: assetSharpe,
                    topHoldings: `${asset.isSharia ? "Syariah DPS" : "Konvensional"} · ${isEligible ? "Instrumen Aktif" : "Nonaktif / Terfilter"}`,
                  })
                }
              >
                <path d={`M ${px} ${py - 5} L ${px + 5} ${py} L ${px} ${py + 5} L ${px - 5} ${py} Z`} className="asset-diamond" />
                {showLabel && <text x={px + 7} y={py + labelOffsetY} className="asset-ticker-label">{asset.ticker}</text>}
                <title>{asset.ticker} · {formatPercent(expectedReturn)} / {formatPercent(volatility)}</title>
              </g>
            );
          })}
          <polyline points={curve} className="frontier-line" />
          {points.map((point, index) => (
            <circle
              key={`frontier-${index}`}
              cx={x(point.volatility)}
              cy={y(point.expectedReturn)}
              r="7"
              className="frontier-hit-area"
              onClick={() => onSelectTarget(point.expectedReturn)}
              onMouseEnter={() =>
                setHovered({
                  title: `Titik Frontier #${index + 1}`,
                  expectedReturn: point.expectedReturn,
                  volatility: point.volatility,
                  sharpeRatio: point.sharpeRatio,
                  topHoldings: formatTopWeights(point.weights),
                })
              }
              onFocus={() =>
                setHovered({
                  title: `Titik Frontier #${index + 1}`,
                  expectedReturn: point.expectedReturn,
                  volatility: point.volatility,
                  sharpeRatio: point.sharpeRatio,
                  topHoldings: formatTopWeights(point.weights),
                })
              }
              tabIndex={0}
              role="button"
              aria-label={`Pilih target return ${formatPercent(point.expectedReturn)}`}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectTarget(point.expectedReturn);
                }
              }}
            >
              <title>Pilih portofolio · return {formatPercent(point.expectedReturn)}, risiko {formatPercent(point.volatility)}</title>
            </circle>
          ))}
          <circle cx={x(result.minVolatility.volatility)} cy={y(result.minVolatility.expectedReturn)} r="5.5" className="marker-min" />
          <circle cx={x(result.maxSharpe.volatility)} cy={y(result.maxSharpe.expectedReturn)} r="6" className="marker-sharpe" />
          <line x1={currentX} y1={currentY} x2={optimalX} y2={optimalY} className="uplift-vector" />
          <circle cx={currentX} cy={currentY} r="6" className="marker-current"><title>Portofolio saat ini</title></circle>
          <circle cx={optimalX} cy={optimalY} r="9" className="marker-active"><title>Rekomendasi aktif</title></circle>
          <text x={x(result.maxSharpe.volatility) - 6} y={y(result.maxSharpe.expectedReturn) - 14} textAnchor="middle" className="marker-label">MAX SHARPE</text>
          <text x={x(result.minVolatility.volatility) + 12} y={y(result.minVolatility.expectedReturn) + 4} className="marker-label">MIN VOL</text>
        </svg>
      </div>
      <div className="monte-tooltip frontier-readout" aria-live="polite">
        <span>{activeReadout.title}</span>
        <span>Return <b className="tabular-nums">{formatPercent(activeReadout.expectedReturn)}</b></span>
        <span>Volatilitas <b className="tabular-nums">{formatPercent(activeReadout.volatility)}</b></span>
        <span>Sharpe <b className="tabular-nums">{formatRatio(activeReadout.sharpeRatio)}</b></span>
        <span>Komposisi utama <b className="tabular-nums">{activeReadout.topHoldings}</b></span>
      </div>
      <div className="chart-legend"><span><i className="legend-swatch frontier-swatch" />Frontier</span><span><i className="legend-swatch cloud-swatch" />Portofolio simulasi (300)</span><span><i className="legend-swatch gold-swatch" />Maximum Sharpe · {formatRatio(result.maxSharpe.sharpeRatio)}</span><span><i className="legend-swatch current-swatch" />Saat ini</span></div>
      <p className="chart-hint">Klik titik mana pun pada kurva untuk memilih target return. Garis singgung CAL ditarik dari risk-free rate {formatPercent(riskFreeRate)}.</p>
    </section>
  );
}
