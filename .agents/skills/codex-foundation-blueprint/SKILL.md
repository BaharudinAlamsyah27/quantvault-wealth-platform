---
name: codex-foundation-blueprint
description: Step-by-step execution runbook and architectural specification for Codex (ChatGPT) to build the complete foundation of the Robo-Advisor & Portfolio Optimization project, ready for Antigravity audit and polish.
---

# Codex Foundation Blueprint Skill

Dokumen ini adalah **panduan eksekusi langkah-demi-langkah untuk Codex (ChatGPT)** dalam membangun pondasi penuh proyek **Robo-Advisor & Optimalisasi Portofolio Investasi (Proyek #26)**.

---

## 1. Aturan Eksekusi untuk Codex

1. **Jangan Membuat Stub atau Placeholder Kosong:** Setiap file yang tercantum di bawah ini harus diimplementasikan secara lengkap, fungsional, dan bebas dari komentar `// TODO: implement later`.
2. **Patuhi Kontrak Tipe Data & Matematika:** Gunakan rumus eksak dari `.agents/skills/markowitz-quant-engine/SKILL.md` dan desain dari `.agents/skills/financial-ui-craft/SKILL.md`.
3. **Pastikan Zero-Config Build di Vercel:** Aplikasi harus bisa langsung dijalankan dengan `npm install && npm run build` dan `npm run test` tanpa memerlukan variabel lingkungan rahasia atau koneksi database eksternal.

---

## 2. Urutan Pembangunan File (Step-by-Step Build Order)

### Langkah 1: Konfigurasi Proyek & Dependensi (`package.json`, `tsconfig.json`, `vercel.json`)
- Gunakan **Next.js (App Router)**, **React**, **TypeScript**, **Tailwind CSS**, **Zod**, **Lucide React** (hanya untuk ikon SVG garis tipis), dan **Vitest** untuk unit testing.
- Pastikan skrip di `package.json` mencakup:
  - `"dev": "next dev"`
  - `"build": "next build"`
  - `"start": "next start"`
  - `"lint": "next lint"`
  - `"test": "vitest run"`

### Langkah 2: Tipe Domain & Dataset Pasar Terkalibrasi (`src/types/quant.ts`, `src/data/*`)
1. `src/types/quant.ts`:
   - Definisikan `AssetClass`, `OptimizationObjective` (`'RISK_MATCHED' | 'MAX_SHARPE' | 'MIN_VOLATILITY' | 'TARGET_RETURN'`), `OptimizationConstraints`, `PortfolioPoint`, `OptimizationResult`, `RebalanceInstruction`, `MonteCarloYearPoint`, `MacroScenarioImpact`, `RiskQuestion`, `RiskAssessmentResult`, dan `DemoPersona`.
2. `src/data/market-universe.ts`:
   - Sediakan 10 instrumen aset terkalibrasi (`MM_PUAS`, `MM_CONV`, `FI_SUKUK`, `FI_SBN`, `FI_CORP`, `EQ_JII`, `EQ_LQ45`, `EQ_DIV`, `EQ_TECH`, `CM_GOLD`) lengkap dengan metadata (`ticker`, `name`, `category`, `riskTier`, `isSharia`, `expenseRatio`, `minWeight`, `maxWeight`) serta **60 titik imbal hasil bulanan realistis (5 tahun)** yang menghasilkan return tahunan, volatilitas, dan korelasi lintas-aset sesuai tabel di `ARCHITECTURE.md` (termasuk peristiwa drawdown realistis sehingga *Maximum Drawdown* dan *Stress Test* bermakna).
3. `src/data/risk-questions.ts`:
   - Sediakan 8 pertanyaan asesmen profil risiko multi-dimensi (Horizon Waktu, Tujuan Utama, Rasio Dana Darurat, Stabilitas Pendapatan, Pengalaman Instrumen Pasar Modal, Reaksi terhadap Penurunan Portofolio -20%, Preferensi Likuiditas, dan Trade-off Imbal Hasil vs Kepastian) dengan skor $1 - 5$ per pertanyaan dan fungsi kalkulasi skor risiko ($1.0 - 10.0$) serta parameter *Risk Aversion* $\lambda \in [0.8, 7.5]$.
4. `src/data/demo-personas.ts`:
   - Sediakan 3 persona siap klik:
     1. **H. Rahmat (56 thn — Konservatif Syariah):** Modal awal Rp 250.000.000, DCA Rp 5.000.000/bln, Horizon 5 tahun, `shariaOnly: true`, skor risiko $2.8/10$ ($\lambda = 5.8$), portofolio saat ini 85% deposito/kas.
     2. **Budi Santoso (34 thn — Moderat Seimbang):** Modal awal Rp 100.000.000, DCA Rp 3.000.000/bln, Horizon 10 tahun, `shariaOnly: false`, skor risiko $5.6/10$ ($\lambda = 2.6$), portofolio saat ini terbagi kurang efisien di 3 aset.
     3. **Alya Putri (26 thn — Agresif Pertumbuhan):** Modal awal Rp 50.000.000, DCA Rp 2.500.000/bln, Horizon 15 tahun, `shariaOnly: false`, skor risiko $8.5/10$ ($\lambda = 1.1$), portofolio saat ini terlalu terkonsentrasi di 1 saham.

### Langkah 3: Mesin Kuantitatif TypeScript (`src/lib/quant/*`)
1. `src/lib/quant/statistics.ts`:
   - Kalkulasi vektor mean tahunan $\boldsymbol{\mu}$, matriks kovariansi sampel & *Ledoit-Wolf Shrinkage* $\boldsymbol{\Sigma}$, matriks korelasi $\boldsymbol{\rho}$, *Portfolio Return*, *Portfolio Volatility*, *Sharpe Ratio*, *Sortino Ratio*, *VaR 95%*, *CVaR 95%*, *Max Drawdown* dari seri 60 bulan, dan *Percentage Risk Contribution* ($\%RC_i$).
2. `src/lib/quant/markowitz.ts`:
   - Fungsi proyeksi ke simpleks terbatas $\sum w_i = 1, 0 \le w_i \le w_{\max}$ dengan bisection search eksak.
   - Solver optimasi untuk `MIN_VOLATILITY`, `MAX_SHARPE`, `RISK_MATCHED` (maksimisasi utilitas kuadratik $\mathbf{w}^T\boldsymbol{\mu} - \frac{\lambda}{2}\mathbf{w}^T\boldsymbol{\Sigma}\mathbf{w}$), dan `TARGET_RETURN`.
   - Generator kurva **Efficient Frontier** (40 titik terurut dari volatilitas terendah ke return tertinggi) dan generator **Random/Dirichlet Portfolio Cloud** (300 titik deterministik ber-seed untuk latar grafik).
3. `src/lib/quant/monte-carlo.ts`:
   - Simulasi 1.000 jalur *Geometric Brownian Motion* dengan PRNG deterministik (`mulberry32`), menghasilkan kuantil tahunan `p10`, `p25`, `p50`, `p75`, `p90`, dan `principal` serta probabilitas mencapai target dana.
4. `src/lib/quant/rebalancer.ts`:
   - Menghitung selisih antara `currentWeights` dan `optimalWeights`, efisiensi yang meningkat ($\Delta \mu_p$, $\Delta \sigma_p$, $\Delta SR$), daftar aksi `BUY` / `SELL` / `HOLD` dalam Rupiah, serta simulasi 3 skenario *Macro Stress Test* (*Guncangan Pandemi -18% Ekuitas*, *Lonjakan Suku Bunga +175bps*, *Stagflasi & Pelemahan Rupiah*).

### Langkah 4: Endpoint API & Python Quant Pipeline (`src/app/api/*`, `api/py/*`, `scripts/*`)
1. `src/app/api/market-data/route.ts` & `src/app/api/optimize/route.ts`:
   - Validasi input menggunakan Zod, jalankan optimasi, dan kembalikan payload JSON terstruktur disertai header rate-limit ringan.
2. `api/py/optimize.py` & `scripts/generate_market_snapshot.py`:
   - Implementasikan solver Python berbasis `numpy` & `scipy.optimize.minimize(method='SLSQP')` (serta dukungan `PyPortfolioOpt` pada skrip batch) yang memverifikasi bobot Markowitz secara identik dengan solver TypeScript.

### Langkah 5: Antarmuka Pengguna, 3 Peran Perbankan & Grafik SVG Presisi Tinggi (`src/components/*`, `src/app/page.tsx`)
Bangun seluruh komponen UI sesuai `.agents/skills/financial-ui-craft/SKILL.md`:
- `TopNavBar.tsx` dengan **1-Click Role Switcher** (`NASABAH / INVESTOR`, `WEALTH ADVISOR / RM`, `KOMITE RISIKO & AUDITOR`) & `PersonaQuickSelect.tsx`.
- **Komponen Peran 1 (`NASABAH / INVESTOR`):**
  - `RiskQuestionnaire.tsx` (panel interaktif 8 pertanyaan dengan live scoring)
  - `EfficientFrontierChart.tsx` (SVG interaktif dengan CAL, Frontier Curve, 300 Cloud Points, Asset Diamonds, Current vs Optimal Vector, dan klik titik pada kurva)
  - `AllocationTable.tsx` & `RebalanceCalculator.tsx` (dengan input bobot saat ini dan kalkulasi Rupiah otomatis)
  - `MonteCarloChart.tsx`, `HistoricalBacktestChart.tsx`, `CorrelationHeatmap.tsx`, dan `MacroStressTestCard.tsx`
  - `IpsReportModal.tsx` (laporan rekomendasi lengkap siap cetak PDF beserta status *Advisor Sign-Off*)
- **Komponen Peran 2 (`WEALTH ADVISOR / RM DESK` — `AdvisorDeskPanel.tsx`):**
  - Tabel & kartu *Client Book Overview* yang membandingkan ke-3 nasabah (H. Rahmat, Budi Santoso, Alya Putri) beserta sesi aktif: Total AUM (IDR), Skor Risiko, *Current Sharpe vs Optimal Sharpe*, *Drift Status* (`NEEDS REBALANCING` / `OPTIMAL`), tombol `Inspeksi ke Workspace`, dan tombol `Approve IPS Proposal` (yang mencatat persetujuan RM ke dalam Audit Log & laporan IPS).
- **Komponen Peran 3 (`KOMITE RISIKO & AUDITOR` — `RiskGovernancePanel.tsx`):**
  - Panel *Bank Investment Committee Guardrails*: kontrol *Risk-Free Rate* ($R_f$ BI-Rate/SBN), batas konsentrasi global & per tier risiko ($w_{\max}$), serta tabel manajemen *Asset Universe* (mengaktifkan/membekukan aset untuk simulasi kebijakan komite dan toggle status kepatuhan DPS Syariah).
  - Panel *Quantitative Solver & Compliance Audit*: menampilkan verifikasi matematis secara *real-time* ($\sum w_i = 100.0000\%$, kepatuhan batas *VaR 95%*, perbandingan bobot Client TS Solver vs Python SLSQP API) dan tabel *Governance Audit Trail Log* berstempel waktu.

### Langkah 6: Pengujian Otomatis (`tests/quant.test.ts`)
- Tulis rangkaian unit test Vitest yang menguji seluruh invariansi matematika Markowitz, filter Syariah, proyeksi Monte Carlo, dan kalkulator *Rebalancing*.
