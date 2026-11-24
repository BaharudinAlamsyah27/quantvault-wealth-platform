"use client";

import { useEffect, useState } from "react";
import { BookOpen, Sigma, X } from "lucide-react";

export function MethodologyDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="button-secondary methodology-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Sigma size={14} aria-hidden="true" />
        <span>Metodologi Kuantitatif</span>
      </button>

      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="ips-document methodology-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="methodology-title"
          >
            <div className="ips-toolbar">
              <span className="micro-label">
                QUANTVAULT // QUANTITATIVE SPECIFICATION &amp; GOVERNANCE
              </span>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label="Tutup spesifikasi metodologi"
              >
                <X size={17} />
              </button>
            </div>

            <div className="ips-content methodology-body">
              <div className="ips-overline">
                MODERN PORTFOLIO THEORY <span>·</span> MARKOWITZ &amp; LEDOIT-WOLF
              </div>
              <h2 id="methodology-title">
                Spesifikasi Matematika &amp; Arsitektur Solver
              </h2>
              <p className="ips-intro">
                Seluruh rekomendasi alokasi dihitung secara deterministik menggunakan
                kerangka Mean-Variance Optimization (Markowitz) dengan regularisasi
                matriks kovariansi dan proyeksi simpleks terbatas.
              </p>

              <div className="methodology-grid">
                <article className="methodology-block">
                  <span className="micro-label">01 / MEAN-VARIANCE OBJECTIVE</span>
                  <h3>Utilitas Kuadratik &amp; Efficient Frontier</h3>
                  <p>
                    Untuk vektor imbal hasil tahunan diharapkan μ dan matriks kovariansi
                    Σ, solver memaksimalkan fungsi utilitas yang disesuaikan dengan
                    tingkat penghindaran risiko nasabah (λ):
                  </p>
                  <code className="formula-box mono">
                    max U(w) = wᵀμ − (λ / 2) · wᵀΣw
                  </code>
                  <p>
                    Dengan kendala long-only tanpa leverage: Σwᵢ = 1.0000 dan 0 ≤ wᵢ ≤
                    w_max untuk seluruh instrumen aktif.
                  </p>
                </article>

                <article className="methodology-block">
                  <span className="micro-label">02 / COVARIANCE REGULARIZATION</span>
                  <h3>Ledoit-Wolf Constant-Correlation Shrinkage</h3>
                  <p>
                    Matriks kovariansi sampel murni (S) dari 60 observasi bulanan
                    rentan terhadap kesalahan estimasi ekstrem. Sistem menyusutkan S
                    sebesar δ = 15% menuju matriks target korelasi konstan (F):
                  </p>
                  <code className="formula-box mono">
                    Σ = (1 − δ) · S + δ · F
                  </code>
                  <p>
                    Menjamin matriks Σ selalu positif-definit dan menghasilkan bobot
                    alokasi yang terdiversifikasi secara stabil.
                  </p>
                </article>

                <article className="methodology-block">
                  <span className="micro-label">03 / RISK DECOMPOSITION &amp; TAIL RISK</span>
                  <h3>Kontribusi Risiko (%RC), VaR 95%, &amp; CVaR</h3>
                  <p>
                    Kontribusi risiko tiap aset mengukur porsi variansi portofolio
                    yang berasal dari instrumen ke-i beserta korelasinya:
                  </p>
                  <code className="formula-box mono">
                    %RCᵢ = (wᵢ · (Σw)ᵢ) / (wᵀΣw),  Σ %RCᵢ = 100%
                  </code>
                  <p>
                    Value at Risk (VaR 95%) tahunan dihitung secara parametrik
                    max(0, −(μₚ − 1.64485·σₚ)) dan dikomparasi dengan Max Drawdown
                    historis 60 bulan.
                  </p>
                </article>

                <article className="methodology-block">
                  <span className="micro-label">04 / WEALTH SIMULATION &amp; DUAL ENGINE</span>
                  <h3>Monte Carlo GBM (1.000 Jalur) &amp; Verifikasi SLSQP</h3>
                  <p>
                    Proyeksi kekayaan mensimulasikan 1.000 jalur Geometric Brownian
                    Motion bulanan dengan kontribusi rutin (DCA) dan generator bilangan
                    acak ber-seed (Mulberry32 + Box-Muller):
                  </p>
                  <code className="formula-box mono">
                    W_t = (W_&#123;t-1&#125; + DCA) · exp((μₚ − ½σₚ²)Δt + σₚ√Δt · Z_t)
                  </code>
                  <p>
                    Hasil solver TypeScript di browser dapat diverifikasi silang dengan
                    engine Python SciPy SLSQP di panel Komite Risiko &amp; Auditor.
                  </p>
                </article>
              </div>

              <div className="methodology-footer-note">
                <BookOpen size={15} aria-hidden="true" />
                <span>
                  Dataset mencakup 10 kelas aset pasar keuangan Indonesia &amp; global
                  (60 bulan data sintetis terkalibrasi). Tekan <b>Esc</b> untuk menutup
                  jendela ini.
                </span>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
