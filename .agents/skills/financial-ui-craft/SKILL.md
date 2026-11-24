---
name: financial-ui-craft
description: Institutional Swiss Financial Grid UI and Anti-AI-Slop design system guidelines for the Robo-Advisor & Portfolio Optimization web application. Covers color tokens, tabular typography, SVG financial charts, layout density, and WCAG AA accessibility.
---

# Financial UI Craft & Anti-AI-Slop Skill

Gunakan skill ini setiap kali merancang, membangun, atau memoles komponen antarmuka (`src/app/*`, `src/components/*`).

---

## 1. Prinsip Utama: "Swiss Financial Grid" (Anti-AI-Slop)

Aplikasi ini adalah **Terminal Manajemen Kekayaan & Optimasi Portofolio Kuantitatif**, bukan situs pemasaran kripto murahan.

### 1.1 Larangan Mutlak (Hard Bans)
- **JANGAN** gunakan latar gradasi ungu/indigo/magenta (`from-indigo-500 via-purple-500 to-pink-500`), bola cahaya blur di latar belakang, atau efek kaca buram (*heavy glassmorphism*).
- **JANGAN** gunakan karakter emoji (🚀, 💰, 📊, 🤖, 🛡️, ✨) di mana pun di dalam UI! Gunakan ikon SVG garis geometris bersih (`stroke-width="1.5"`) atau badge monospasi tegas seperti `[SHARIA-COMPLIANT]`, `[SLSQP-SOLVER]`, `[BUY]`, `[SELL]`.
- **JANGAN** menyembunyikan aplikasi di balik *landing page* kosong. Halaman utama (`/`) harus langsung memuat **Interactive Robo-Advisor Workspace** dengan data persona aktif sehingga pengunjung portofolio langsung terpukau dalam 3 detik pertama.

### 1.2 Tipografi & Presisi Angka Finansial
- **Font Sans-Serif (UI & Heading):** `Plus Jakarta Sans` atau `Inter` (`tracking-tight` pada judul, `leading-relaxed` pada teks penjelasan).
- **Font Monospace (Metrik, Harga IDR, Bobot %, Rasio Sharpe):** `JetBrains Mono` atau `Geist Mono`.
- **Aturan Wajib Angka:** Seluruh angka tabel, KPI card, badge persentase, slider, dan label grafik **wajib** memiliki kelas `tabular-nums` (`font-variant-numeric: tabular-nums`) agar saat pengguna menggeser *slider* secara *real-time*, angka tidak bergoyang ke kiri dan kanan.
- **Format Angka Standar Indonesia & Kuantitatif:**
  - Mata uang: `Rp 100.000.000` atau singkatan presisi `Rp 100,0 Jt` / `Rp 1,45 M` pada sumbu grafik.
  - Bobot & Imbal Hasil: `12,45%` (2 angka desimal).
  - Rasio Sharpe & Sortino: `1,42` (2 angka desimal).

---

## 2. Spesifikasi Visualisasi Grafik Kuantitatif (Custom SVG / Recharts)

Grafik adalah bintang utama dari proyek Robo-Advisor ini. Pastikan setiap grafik tampak seperti perangkat lunak riset institusional:

### 2.1 Interactive Efficient Frontier Chart (`EfficientFrontierChart.tsx`)
- **Sumbu X:** *Annualized Volatility / Risiko ($\sigma$)* dalam `%` (misal $0\% - 24\%$).
- **Sumbu Y:** *Expected Annual Return ($\mu$)* dalam `%` (misal $4\% - 17\%$).
- **Lapisan Visual (dari bawah ke atas):**
  1. **Grid Kisi Halus (`1px dashed`):** Garis horizontal dan vertikal dengan label monospasi rapi.
  2. **Capital Allocation Line (CAL):** Garis singgung lurus putus-putus dari titik *Risk-Free Rate* $(0\%, R_f)$ melewati titik **Maximum Sharpe Portfolio**.
  3. **Monte Carlo Random Portfolios Cloud (250–350 titik):** Titik-titik lingkaran kecil (`r="2.5"`, opasitas `0.28`) yang diwarnai berdasarkan tingkat Sharpe Ratio-nya, membuktikan secara visual bahwa semua portofolio acak berada di bawah/kanan kurva efisien.
  4. **Individual Asset Nodes (10 titik berlian/kotak):** Posisi masing-masing instrumen (`RDPU-SYA`, `PBS-SR01`, `IDX-JII70`, `GOLD-ANTM`, dll.) lengkap dengan label ticker di dekatnya.
  5. **Efficient Frontier Curve:** Garis kurva tebal (`strokeWidth="2.5"`, warna `--accent-primary` `#0F766E` / `#14B8A6`) yang menghubungkan 40 titik portofolio optimal dari *Minimum Volatility* hingga *Maximum Return*.
  6. **3 Penanda Utama (Interactive Markers):**
     - **Minimum Volatility Portfolio:** Lingkaran biru (`#1D4ED8` / `#38BDF8`) dengan ring luar.
     - **Maximum Sharpe Portfolio (Tangency):** Penanda emas (`#B45309` / `#F59E0B`) yang mencolok.
     - **Active Recommended / User Portfolio:** Lingkaran utama dengan efek *pulse ring* halus yang bergerak sepanjang kurva saat pengguna mengubah profil risiko atau mengklik titik di kurva!
     - **Current User Portfolio (Jika Mode Rebalancing Aktif):** Titik merah/abu-abu di bawah kurva dengan panah vektor vertikal/diagonal menuju titik *Optimal Portfolio* untuk memperlihatkan *Efficiency Uplift* ($\Delta \text{Return}$ & $\Delta \text{Risk}$).

### 2.2 Monte Carlo Wealth Projection Fan Chart (`MonteCarloChart.tsx`)
- Menampilkan proyeksi kekayaan dari Tahun 0 hingga Tahun $H$ ($1 - 20$ tahun).
- Area pita bergradasi tipis untuk rentang **P10–P90** (opasitas `0.12`) dan **P25–P75** (opasitas `0.22`).
- Garis tegas untuk **P50 (Median Expected Wealth)**, garis putus-putus untuk **P10 (Skenario Pasar Buruk / Stress)**, dan garis step/datar untuk **Total Modal Disetor (Cumulative Principal)**.
- Tooltip interaktif saat kursor digeser per tahun yang menampilkan: Tahun ke-$t$, Modal Disetor, Proyeksi Pesimis (P10), Median (P50), dan Optimis (P90) dalam Rupiah.

### 2.3 Correlation Matrix Heatmap (`CorrelationHeatmap.tsx`)
- Matriks $N \times N$ dengan sel persegi rapi dan nilai korelasi $\rho_{ij} \in [-1.00, +1.00]$ di setiap sel (misal `0.18`, `-0.12`, `1.00`).
- Skala warna terkalibrasi: korelasi rendah/negatif (bagus untuk diversifikasi) berwarna hijau/teal lembut, korelasi tinggi mendekati `1.00` berwarna amber/slate tegas.

---

## 3. Tata Letak Workspace, Multi-Role Switcher & Hierarki Informasi

Susun halaman utama (`/`) menjadi 4 bagian yang mengalir secara logis dan mendukung **3 Peran Perbankan (1-Click Role Switcher)**:
1. **Top Institutional Header Bar:**
   - Identitas Proyek: `QUANTVAULT // MARKOWITZ ROBO-ADVISOR` + Badge `[TRACKER #26 — ANALYTICS & WEALTH]`.
   - **1-Click Banking Role Switcher (Segmented Control Utama):**
     - `[01] NASABAH (Investor)` — Tampilan asesmen risiko, *Efficient Frontier*, *Monte Carlo*, & *Rebalancing* nasabah.
     - `[02] WEALTH ADVISOR (RM Desk)` — Tampilan *Client Book* (daftar portofolio H. Rahmat, Budi, Alya), analisis *Drift & Sharpe Uplift*, dan tombol *Approve Rebalance Proposal*.
     - `[03] KOMITE RISIKO & AUDITOR (Governance Admin)` — Tampilan pengaturan *Bank Guardrails* ($R_f$ BI-Rate, plafon bobot per aset $w_{\max}$, toggle aktif/nonaktif instrumen & verifikasi kepatuhan Syariah DPS), tabel *Quant Solver Audit Verification* ($\sum w_i = 1.0000$, Python vs TS check), serta *Governance Audit Trail Log*.
   - **Quick Persona Bar:** 3 tombol cepat (`Konservatif Syariah`, `Moderat Seimbang`, `Agresif Pertumbuhan`) + Tombol `Kuesioner Risiko (8 Soal)` + Toggle `Syariah Only` + Tombol `Reset Demo` + Toggle `Light/Dark`.
2. **Executive KPI Strip (5 Metrik Utama dengan Perbandingan vs. Current/Benchmark):**
   - `Profil Risiko & Skor (mis: Moderat • 6.2/10 • λ=2.4)`
   - `Expected Annual Return (μ_p)`
   - `Annualized Volatility (σ_p)`
   - `Sharpe Ratio & Sortino Ratio`
   - `Annual VaR (95%) & Max Historical Drawdown`
3. **Core Dual-Pane Workspace (Grid 12 Kolom):**
   - **Panel Kiri (4 Kolom — Advisory Controls & Risk Profiler):**
     - Tab/Accordion antara **Kuesioner Profil Risiko 8 Pertanyaan** dan **Parameter Kuantitatif** (Objektif Optimasi: *Risk-Matched*, *Max Sharpe*, *Min Volatility*, *Target Return*; Slider *Batas Maksimum per Aset* $15\% - 100\%$; Input *Modal Awal IDR* & *Investasi Bulanan IDR*; Slider *Horizon Waktu* $1 - 20$ Tahun).
   - **Panel Kanan (8 Kolom — Quantitative Visualizations & Actionable Allocation):**
     - **Kartu 1:** Grafik Interaktif *Efficient Frontier* (dengan klik-untuk-memilih titik di sepanjang kurva).
     - **Kartu 2:** Tabel Alokasi Bobot Optimal & Kalkulator *Rebalancing* (`Current Weight %` vs `Optimal Weight %`, `Risk Contribution %RC`, dan aksi `BUY / SELL / HOLD` dalam Rupiah).
     - **Kartu 3:** Tab Simulasi Proyeksi Kekayaan *Monte Carlo (1.000 Jalur)*, *Historical Backtest 5 Tahun*, *Macro Stress Test (3 Krisis)*, dan *Heatmap Matriks Korelasi*.
4. **Action Footer & IPS Report Generator:**
   - Tombol **"Buka & Cetak Laporan Investment Policy Statement (IPS)"** dan penjelasan metodologi singkat (Markowitz MPT + Ledoit-Wolf Shrinkage).
