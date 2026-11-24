---
name: markowitz-quant-engine
description: Quantitative portfolio optimization mathematical specification and implementation guide for Markowitz Mean-Variance Optimization, Ledoit-Wolf covariance shrinkage, Sharpe/Sortino/VaR/CVaR metrics, Efficient Frontier generation, and Monte Carlo wealth simulation in TypeScript and Python.
---

# Markowitz Quantitative Engine Skill

Gunakan skill ini saat membangun, memverifikasi, atau mengaudit mesin perhitungan kuantitatif (`src/lib/quant/*`, `api/py/optimize.py`, dan `scripts/generate_market_snapshot.py`).

---

## 1. Spesifikasi Matematis & Notasi

Misalkan terdapat $N$ aset aktif (setelah difilter oleh preferensi pengguna, misalnya *Semua Instrumen* $N=10$ atau *Khusus Syariah* $N=6$):
- Vektor ekspektasi imbal hasil tahunan: $\boldsymbol{\mu} \in \mathbb{R}^N$
- Matriks kovariansi tahunan ($N \times N$, simetris positif-definit): $\boldsymbol{\Sigma} \in \mathbb{R}^{N \times N}$
- Vektor bobot alokasi portofolio: $\mathbf{w} = [w_1, w_2, \dots, w_N]^T$
- Suku bunga bebas risiko tahunan (*Risk-Free Rate*): $R_f$ (default: $0.0625$ atau $6.25\%$)
- Batas bobot maksimum per aset: $w_{\max} \in [1/N, 1.0]$ (default: $0.35$ atau $35\%$)

### 1.1 Estimasi Return & Kovariansi dari Data Bulanan (60 Bulan)
Jika diberikan matriks imbal hasil bulanan $R_{t, i}$ untuk $t = 1 \dots T$ ($T = 60$):
1. **Annualized Mean Return ($\mu_i$):**
   $$\bar{r}_i = \frac{1}{T}\sum_{t=1}^{T} R_{t,i}, \qquad \mu_i = (1 + \bar{r}_i)^{12} - 1 \quad \text{(atau } 12 \cdot \bar{r}_i \text{ untuk konsistensi aditif Markowitz)}$$
2. **Sample Covariance Matrix ($S$) & Ledoit-Wolf Constant-Correlation Shrinkage ($\boldsymbol{\Sigma}$):**
   $$S_{ij} = \frac{12}{T - 1} \sum_{t=1}^{T} (R_{t,i} - \bar{r}_i)(R_{t,j} - \bar{r}_j)$$
   Untuk menstabilkan inversi matriks kovariansi agar bobot Markowitz tidak ekstrem (sebagaimana `PyPortfolioOpt` `CovarianceShrinkage.ledoit_wolf()`), terapkan penyusutan (*shrinkage*) dengan koefisien $\delta \in [0.10, 0.25]$ (default $\delta = 0.15$) menuju matriks diagonal/target $F$:
   $$\boldsymbol{\Sigma} = (1 - \delta) S + \delta F, \qquad F_{ii} = S_{ii}, \quad F_{ij} = \bar{\rho}\sqrt{S_{ii}S_{jj}} \ (i \neq j)$$

---

## 2. Algoritma Solver Quadratic Programming (TypeScript & Python)

Karena kita membutuhkan eksekusi deterministik $< 10\text{ ms}$ di browser (`src/lib/quant/markowitz.ts`) maupun di endpoint Python (`api/py/optimize.py`), gunakan algoritma berikut:

### 2.1 Proyeksi ke Bounded Simplex ($\mathcal{S} = \{ \mathbf{w} \in \mathbb{R}^N \mid \sum w_i = 1, \ 0 \le w_i \le w_{\max} \}$)
Setiap iterasi optimasi wajib memproyeksikan vektor $\mathbf{v} \in \mathbb{R}^N$ ke himpunan fisibel $\mathcal{S}$ secara eksak:
1. Pertama, pastikan $w_{\max} \ge \frac{1}{N} + 10^{-6}$. Jika $N \cdot w_{\max} < 1$, naikkan $w_{\max} = \min(1.0, \frac{1.05}{N})$.
2. Cari skalar Lagrange $\theta \in [\min(\mathbf{v}) - 1, \max(\mathbf{v})]$ menggunakan *Bisection Search* (60 iterasi memberikan presisi $< 10^{-15}$) sedemikian sehingga:
   $$w_i(\theta) = \min\big(w_{\max}, \max(0, v_i - \theta)\big), \qquad \sum_{i=1}^{N} w_i(\theta) = 1.0$$

### 2.2 Tiga Objektif Optimasi Utama
Gunakan **Projected Gradient Ascent/Descent with Nesterov Momentum & Line Search** (di TypeScript, 400 iterasi, waktu $< 2\text{ ms}$ untuk $N=10$) dan **`scipy.optimize.minimize(method='SLSQP')`** (di Python):

1. **Minimum Volatility (`MIN_VOLATILITY`):**
   $$\min_{\mathbf{w} \in \mathcal{S}} \quad f(\mathbf{w}) = \frac{1}{2} \mathbf{w}^T \boldsymbol{\Sigma} \mathbf{w}, \qquad \nabla f(\mathbf{w}) = \boldsymbol{\Sigma} \mathbf{w}$$
2. **Target Return pada Efficient Frontier (`TARGET_RETURN` dengan target $\mu^*$):**
   Untuk setiap titik $\mu^* \in [\mu_{\min\_\text{vol}}, \mu_{\max\_\text{feasible}}]$:
   $$\min_{\mathbf{w} \in \mathcal{S}} \quad \frac{1}{2} \mathbf{w}^T \boldsymbol{\Sigma} \mathbf{w} + \frac{\gamma}{2} \big(\mathbf{w}^T \boldsymbol{\mu} - \mu^*\big)^2$$
   Atau gunakan sapuan parameter *Risk Aversion* $\lambda \in [0.1, 50.0]$ dalam skala logaritmik (40 titik):
   $$\max_{\mathbf{w} \in \mathcal{S}} \quad U(\mathbf{w}) = \mathbf{w}^T \boldsymbol{\mu} - \frac{\lambda}{2} \mathbf{w}^T \boldsymbol{\Sigma} \mathbf{w}, \qquad \nabla U(\mathbf{w}) = \boldsymbol{\mu} - \lambda \boldsymbol{\Sigma} \mathbf{w}$$
3. **Maximum Sharpe Ratio (`MAX_SHARPE`):**
   - Evaluasi seluruh 50 titik pada kurva *Efficient Frontier* hasil sapuan $\lambda$, ambil titik dengan $SR(\mathbf{w}) = \frac{\mathbf{w}^T\boldsymbol{\mu} - R_f}{\sqrt{\mathbf{w}^T\boldsymbol{\Sigma}\mathbf{w}}}$ tertinggi sebagai titik awal, lalu jalankan *Projected Gradient Ascent* langsung pada fungsi objektif $SR(\mathbf{w})$ dengan gradien analitik:
     $$\nabla SR(\mathbf{w}) = \frac{\boldsymbol{\mu} \cdot \sigma_p - (\mu_p - R_f) \frac{\boldsymbol{\Sigma}\mathbf{w}}{\sigma_p}}{\sigma_p^2}$$

---

## 3. Metrik Risiko Lanjutan & Dekomposisi Risiko

Setiap portofolio optimal wajib mengembalikan metrik berikut:
1. **Expected Annual Return ($\mu_p$)** & **Annual Volatility ($\sigma_p$)**
2. **Sharpe Ratio:** $(\mu_p - R_f) / \sigma_p$
3. **Sortino Ratio:** $(\mu_p - R_f) / \sigma_{\text{downside}}$, di mana $\sigma_{\text{downside}}$ dihitung dari seri imbal hasil historis 60 bulan portofolio $\mathbf{r}_p = \mathbf{R}\mathbf{w}$ yang berada di bawah target bulanan $R_f / 12$.
4. **Parametric & Historical Value at Risk (VaR 95%) dan Conditional VaR (CVaR 95%):**
   $$\text{VaR}_{95\%} = \max\big(0, -(\mu_p - 1.64485 \cdot \sigma_p)\big)$$
   $$\text{CVaR}_{95\%} = \max\big(0, -(\mu_p - 2.06271 \cdot \sigma_p)\big)$$
5. **Maximum Drawdown ($MDD$):** Dihitung dari kurva ekuitas kumulatif historis 60 bulan:
   $$V_t = V_{t-1}(1 + r_{p,t}), \qquad DD_t = \frac{V_t - \max_{s \le t} V_s}{\max_{s \le t} V_s}, \qquad MDD = \min_t DD_t$$
6. **Risk Contribution per Asset ($\%RC_i$):**
   $$\%RC_i = \frac{w_i (\boldsymbol{\Sigma}\mathbf{w})_i}{\mathbf{w}^T \boldsymbol{\Sigma}\mathbf{w}}$$

---

## 4. Simulasi Proyeksi Kekayaan Monte Carlo (`src/lib/quant/monte-carlo.ts`)

- Gunakan **Seeded Pseudo-Random Number Generator (PRNG)** (misalnya *Mulberry32* + transformasi *Box-Muller*) agar hasil simulasi deterministik, stabil saat di-render, dan dapat diuji dengan unit test.
- Simulasikan $M = 1.000$ jalur selama $H$ tahun ($12 \times H$ langkah bulanan) menggunakan *Geometric Brownian Motion (GBM)* dengan kontribusi bulanan rutin ($C_{\text{monthly}}$):
  $$W_{t} = (W_{t-1} + C_{\text{monthly}}) \cdot \exp\left( \left(\mu_p - \frac{1}{2}\sigma_p^2\right)\Delta t + \sigma_p \sqrt{\Delta t} Z_t \right), \qquad \Delta t = \frac{1}{12}, \quad Z_t \sim \mathcal{N}(0, 1)$$
- Pada setiap akhir tahun (atau bulan), ekstrak kuantil:
  - **P10 (Pesimis / Pasar Buruk - Persentil ke-10)**
  - **P25 (Konservatif - Persentil ke-25)**
  - **P50 (Median Ekspektasi - Persentil ke-50)**
  - **P75 (Optimis Moderat - Persentil ke-75)**
  - **P90 (Optimis / Pasar Bullish - Persentil ke-90)**
  - **Total Modal Disetor (Principal Invested):** $W_0 + 12 \cdot t \cdot C_{\text{monthly}}$

---

## 5. Invariansi Unit Test (`tests/quant.test.ts`)

Wajib ada pengujian otomatis yang memverifikasi:
1. $\left|\sum_{i=1}^N w_i - 1.0\right| < 10^{-6}$ untuk semua objektif (`MAX_SHARPE`, `MIN_VOLATILITY`, `TARGET_RETURN`, `RISK_MATCHED`).
2. Tidak ada bobot negatif ($w_i \ge -10^{-7}$) dan tidak ada bobot yang melanggar batas atas ($w_i \le w_{\max} + 10^{-6}$).
3. Ketika `shariaOnly = true`, seluruh aset non-syariah memiliki bobot tepat $0\%$.
4. Portofolio `MIN_VOLATILITY` memiliki $\sigma_p$ lebih kecil atau sama dengan semua titik lain di *Efficient Frontier*.
5. Portofolio `MAX_SHARPE` memiliki rasio Sharpe lebih besar atau sama dengan semua titik lain di *Efficient Frontier*.
6. Jumlah kontribusi risiko $\sum_{i=1}^N \%RC_i = 1.0 \pm 10^{-5}$.
