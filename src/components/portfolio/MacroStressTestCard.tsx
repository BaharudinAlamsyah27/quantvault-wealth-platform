import type { AssetClass, MacroScenarioImpact } from "@/types/quant";
import { simulateMacroScenarios } from "@/lib/quant/rebalancer";
import { formatIdr, formatPercent } from "@/lib/utils/formatters";

export function MacroStressTestCard({ assets, weights, portfolioValueIdr }: { assets: AssetClass[]; weights: Record<string, number>; portfolioValueIdr: number }) {
  const scenarios: MacroScenarioImpact[] = simulateMacroScenarios(weights, portfolioValueIdr, assets);
  return (
    <section className="panel stress-panel">
      <div className="panel-heading chart-heading"><div><span className="micro-label">SCENARIO ANALYSIS</span><h2>Macro stress test</h2><p>Estimasi shock satu periode berdasarkan sensitivitas kelas aset.</p></div><span className="engine-badge">3 skenario</span></div>
      <div className="stress-list">{scenarios.map((scenario, index) => <article className="stress-row" key={scenario.id}><span className="stress-number">0{index + 1}</span><div className="stress-copy"><strong>{scenario.name}</strong><small>{scenario.description}</small></div><div className="stress-result"><strong className={`mono tabular-nums ${scenario.portfolioReturn < 0 ? "negative-value" : "positive-value"}`}>{formatPercent(scenario.portfolioReturn)}</strong><small className="mono tabular-nums">{formatIdr(scenario.estimatedLossIdr)}</small></div></article>)}</div>
      <p className="muted-note">Skenario ilustratif untuk uji sensitivitas; bukan estimasi kerugian aktual atau prediksi pasar.</p>
    </section>
  );
}
