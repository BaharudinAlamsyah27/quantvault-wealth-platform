import { useState } from "react";
import type { MonteCarloResult } from "@/types/quant";
import { formatCompactIdr, formatIdr } from "@/lib/utils/formatters";
import { HelpTip } from "@/components/ui/HelpTip";

interface Props {
  result: MonteCarloResult;
  horizonYears: number;
  goalName: string;
  targetGoalIdr: number;
}

export function MonteCarloChart({ result, horizonYears, goalName, targetGoalIdr }: Props) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [realMode, setRealMode] = useState(false);

  const width = 760;
  const height = 290;
  const margin = { left: 74, right: 18, top: 18, bottom: 38 };

  const getVal = (point: MonteCarloResult["points"][number], band: "p10" | "p50" | "p90") => {
    if (!realMode) return point[band];
    if (band === "p10") return point.realP10;
    if (band === "p50") return point.realP50;
    return point.realP90;
  };

  const values = result.points.flatMap((point) => [getVal(point, "p10"), getVal(point, "p90"), point.principal]);
  const maximum = Math.max(...values, 1);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const px = (index: number) => margin.left + (index / Math.max(1, result.points.length - 1)) * innerWidth;
  const py = (value: number) => margin.top + innerHeight - (value / maximum) * innerHeight;
  const line = (key: "p10" | "p50" | "principal") =>
    result.points
      .map((point, index) => `${px(index)},${py(key === "principal" ? point.principal : getVal(point, key))}`)
      .join(" ");
  const bandPath = (lower: "p10" | "p25", upper: "p90" | "p75") => {
    const top = result.points.map((point, index) => {
      const val = upper === "p90" ? getVal(point, "p90") : realMode ? point.p75 * (point.realP50 / Math.max(1, point.p50)) : point.p75;
      return `${px(index)},${py(val)}`;
    });
    const bottom = result.points
      .map((point, index) => {
        const val = lower === "p10" ? getVal(point, "p10") : realMode ? point.p25 * (point.realP50 / Math.max(1, point.p50)) : point.p25;
        return `${px(index)},${py(val)}`;
      })
      .reverse();
    return `M ${top.join(" L ")} L ${bottom.join(" L ")} Z`;
  };
  const yearIndex = hoveredYear === null ? result.points.length - 1 : hoveredYear;
  const selected = result.points[yearIndex];
  const maxYears = Math.min(horizonYears, result.points.length - 1);

  return (
    <section className="panel chart-panel">
      <div className="panel-heading chart-heading">
        <div>
          <span className="micro-label">WEALTH PROJECTION · {result.paths.toLocaleString("id-ID")} PATHS</span>
          <h2>
            Monte Carlo — {goalName}{" "}
            <HelpTip
              title="Simulasi Monte Carlo (1.000 Jalur GBM)"
              description="Mensimulasikan 1.000 skenario pasar acak menggunakan Geometric Brownian Motion berdasarkan Net Return dan Volatilitas portofolio. P10 = skenario pasar buruk, P50 = median ekspektasi, P90 = skenario pasar bullish."
            />
          </h2>
          <p>
            Target dana <strong className="tabular-nums">{formatIdr(targetGoalIdr)}</strong> ·{" "}
            {realMode ? "Daya beli riil (koreksi inflasi 3%/thn)" : "Nilai nominal IDR"}
          </p>
        </div>
        <div className="mc-header-right">
          <button
            type="button"
            className="button-secondary mc-mode-btn"
            onClick={() => setRealMode(!realMode)}
          >
            {realMode ? "Mode: Riil (Inflasi 3%)" : "Mode: Nominal IDR"}
          </button>
          {result.probabilityOfTarget !== null && (
            <div className="probability-chip">
              <small>PELUANG TARGET</small>
              <strong className="tabular-nums">{(result.probabilityOfTarget * 100).toFixed(1)}%</strong>
            </div>
          )}
        </div>
      </div>

      {result.recommendedExtraDcaIdr > 0 && (
        <div className="goal-advice-banner">
          <span>
            Peluang mencapai target <strong>{goalName}</strong> masih di bawah 75%. Disarankan menambah DCA sebesar{" "}
            <strong className="tabular-nums">+{formatIdr(result.recommendedExtraDcaIdr)} / bulan</strong>.
          </span>
        </div>
      )}

      <div className="chart-scroll">
        <svg className="monte-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Rentang proyeksi kekayaan Monte Carlo">
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const value = maximum * fraction;
            return (
              <g key={fraction}>
                <line x1={margin.left} x2={width - margin.right} y1={py(value)} y2={py(value)} className="chart-grid-line" />
                <text x={margin.left - 9} y={py(value) + 4} textAnchor="end" className="chart-axis-label tabular-nums">
                  {formatCompactIdr(value)}
                </text>
              </g>
            );
          })}
          <path d={bandPath("p10", "p90")} className="fan-wide" />
          <path d={bandPath("p25", "p75")} className="fan-narrow" />
          <polyline points={line("principal")} className="principal-line" />
          <polyline points={line("p10")} className="p10-line" />
          <polyline points={line("p50")} className="p50-line" />
          {result.points.map((point, index) => (
            <g key={point.year} onMouseEnter={() => setHoveredYear(index)} onFocus={() => setHoveredYear(index)}>
              <rect x={px(index) - 13} y={margin.top} width="26" height={innerHeight} className="chart-hit-column" tabIndex={0} aria-label={`Tahun ${point.year}`} />
              <line x1={px(index)} x2={px(index)} y1={margin.top} y2={height - margin.bottom} className={`chart-hover-line ${yearIndex === index ? "is-visible" : ""}`} />
            </g>
          ))}
          <text x={margin.left} y={height - 8} className="chart-axis-label">TAHUN 0</text>
          <text x={width - margin.right} y={height - 8} textAnchor="end" className="chart-axis-label">TAHUN {maxYears}</text>
        </svg>
      </div>
      <div className="monte-tooltip">
        <span>Tahun {selected.year}</span>
        <span>Modal <b className="tabular-nums">{formatIdr(selected.principal)}</b></span>
        <span>P10 <b className="tabular-nums">{formatIdr(getVal(selected, "p10"))}</b></span>
        <span>P50 <b className="tabular-nums">{formatIdr(getVal(selected, "p50"))}</b></span>
        <span>P90 <b className="tabular-nums">{formatIdr(getVal(selected, "p90"))}</b></span>
      </div>
      <div className="chart-legend">
        <span><i className="legend-swatch p50-swatch" />P50 median</span>
        <span><i className="legend-swatch p10-swatch" />P10 stress</span>
        <span><i className="legend-swatch principal-swatch" />Total modal disetor</span>
        <span><i className="legend-swatch fan-swatch" />Rentang P10–P90</span>
      </div>
    </section>
  );
}
