# AGENTS.md — Master Architectural Directives & Execution Playbook (Antigravity + Codex)

> **Project:** #26 — Robo-Advisor & Optimalisasi Portofolio Investasi (*QuantVault Robo-Advisor*)  
> **Lead Architect, Auditor & Finisher:** Antigravity (Google DeepMind)  
> **Foundation Builder:** Codex (ChatGPT)  
> **Prompt & Context Origin:** Claude & User Portfolio Tracker  

Dokumen `AGENTS.md` ini adalah **kontrak kerja teknis dan sumber kebenaran tunggal (Single Source of Truth)** bagi seluruh agen AI (**Codex** maupun **Antigravity**) yang bekerja di repositori ini. Setiap baris kode yang ditulis wajib mematuhi spesifikasi matematika, arsitektur, dan estetika desain di dalam dokumen ini serta [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 1. Pembagian Peran Kolaborasi Multi-Agen

1. **Antigravity (Senior Software Architect, Quant Auditor & UI Finisher):**
   - Menyusun dokumen arsitektur ([`ARCHITECTURE.md`](./ARCHITECTURE.md)), aturan sistem (`AGENTS.md`), dan modul *skills* di `.agents/skills/`.
   - Memberikan arahan teknis lengkap (*Blueprints & Prompts*) kepada **Codex** agar Codex membangun pondasi sistem secara utuh.
   - Melakukan **Audit Menyeluruh (Code, Math, & UI Audit)** atas pekerjaan Codex: memverifikasi rumus optimasi Markowitz, memperbaiki *edge cases*, memoles kualitas visual (*Anti-AI-Slop Polish*), dan memastikan `next build` serta `vitest` lulus 100% sebelum deploy ke Vercel.
2. **Codex / ChatGPT (Foundation System Builder):**
   - Membaca `AGENTS.md`, `ARCHITECTURE.md`, dan seluruh `SKILL.md` di dalam `.agents/skills/` sebelum menulis kode.
   - Membangun pondasi proyek secara lengkap dari Fase 1 hingga Fase 3 sesuai struktur folder dan spesifikasi tipe data tanpa meninggalkan *placeholder* kosong (`TODO` atau komponen palsu).

---

## 2. Daftar Skills Proyek (Wajib Dibaca Agen)

Repositori ini dilengkapi dengan 3 *workspace skills* khusus di dalam folder `.agents/skills/`:

1. **[`.agents/skills/markowitz-quant-engine/SKILL.md`](./.agents/skills/markowitz-quant-engine/SKILL.md)**  
   Berisi spesifikasi algoritma kuantitatif: *Mean-Variance Optimization (Markowitz)*, *Ledoit-Wolf Covariance Shrinkage*, solver *Quadratic Programming / Projected Gradient & SLSQP*, simulasi *Monte Carlo Geometric Brownian Motion*, dan invariansi pengujian matematika.
2. **[`.agents/skills/financial-ui-craft/SKILL.md`](./.agents/skills/financial-ui-craft/SKILL.md)**  
   Berisi standar desain **Swiss Financial Grid & Anti-AI-Slop**: aturan tipografi `tabular-nums`, larangan keras gradasi ungu/emoji/glassmorphism, desain grafik SVG *Efficient Frontier* & *Monte Carlo Fan Chart*, serta kepatuhan WCAG AA.
3. **[`.agents/skills/codex-foundation-blueprint/SKILL.md`](./.agents/skills/codex-foundation-blueprint/SKILL.md)**  
   Berisi daftar tugas berurutan (*step-by-step execution checklist*) untuk **Codex** dalam membangun seluruh file proyek, kontrak API, dan kriteria kelulusan audit (*Definition of Done*).

---

## 3. Hukum Arsitektur & Batasan Wajib (Hard Constraints)

### 3.1 100% Free-Tier, Zero-Friction Public Demo & 3 Peran Perbankan (Role-Based Mode)
- **DILARANG** menambahkan dependensi layanan berbayar, API yang mewajibkan API key berbayar, atau database yang mengharuskan form login sebelum pengunjung bisa melihat dan mencoba aplikasi.
- Begitu halaman utama (`/`) dibuka, aplikasi **wajib langsung menampilkan workspace Robo-Advisor interaktif** yang terisi dengan persona default (*Moderat — Balanced Growth*) dan langsung menggambar kurva *Efficient Frontier* beserta rekomendasi alokasi portofolio.
- Wajib menyediakan **1-Click Role Switcher (3 Peran Operasional Perbankan)** di bilah navigasi utama:
  1. **`NASABAH (Investor Workspace)`:** Asesmen risiko 8 pertanyaan, eksplorasi *Efficient Frontier*, simulasi *Monte Carlo*, kalkulator *Rebalancing* IDR, dan cetak *Investment Policy Statement (IPS)*.
  2. **`WEALTH ADVISOR (RM Desk)`:** Dasbor portofolio nasabah kelolaan (*Client Book*: H. Rahmat, Budi Santoso, Alya Putri), analisis *Portfolio Drift & Efficiency Uplift*, serta tombol persetujuan rekomendasi (*Advisor Sign-off*).
  3. **`KOMITE RISIKO & AUDITOR (Admin & Sharia Governance)`:** Panel kebijakan investasi bank (*Risk-Free Rate* $R_f$, batas konsentrasi maksimum per aset $w_{\max}$, status aktif/kepatuhan DPS Syariah tiap instrumen di *Asset Universe*), pemeriksaan invariansi solver (*Quant Solver Audit Check*), dan *Governance Audit Log* yang langsung memengaruhi perhitungan di tampilan Nasabah & Advisor.
- Wajib menyediakan **3 Persona Demo 1-Klik** (*Konservatif Syariah*, *Moderat Keluarga*, *Agresif Pertumbuhan*), toggle **Filter Khusus Syariah**, dan tombol **Reset Demo**.

### 3.2 Dual-Engine Quant Architecture (Vercel Hobby Safe)
- **Client-Side TypeScript Quant Engine (`src/lib/quant/`):** Wajib mengimplementasikan solver optimasi Markowitz deterministik penuh di TypeScript sehingga perubahan slider (*Risk Aversion*, *Max Weight per Asset*, *Target Return*, *Sharia Filter*, *Modal Awal IDR*) langsung memperbarui kurva *Efficient Frontier* dan tabel alokasi dalam $< 15\text{ ms}$.
- **Server-Side Python & Node API (`api/py/optimize.py` & `src/app/api/optimize/route.ts`):** Menyediakan endpoint komputasi backend dan skrip pipeline `scripts/generate_market_snapshot.py` berbasis `PyPortfolioOpt` untuk pembaruan data via GitHub Actions. Jangan memasukkan paket raksasa yang membuat ukuran bundle serverless melampaui batas 250 MB Vercel Hobby.

### 3.3 Keamanan Data & Kepatuhan Etika Perbankan
- **WAJIB 100% Data Sintetis/Publik Terkalibrasi:** Jangan pernah menggunakan data nasabah nyata, nama BPRS Sragen di dalam data transaksi/portofolio, atau menyalin sistem internal bank mana pun.
- Cantumkan badge/disclaimer edukatif yang rapi di footer aplikasi dan `README.md`:  
  *"Simulasi Kuantitatif untuk Portofolio Pembelajaran & Demonstrasi Teknis — Menggunakan Data Pasar Sintetis Terkalibrasi."*

---

## 4. Kontrak Matematika Kuantitatif (Singkat)

Detail lengkap ada pada [`.agents/skills/markowitz-quant-engine/SKILL.md`](./.agents/skills/markowitz-quant-engine/SKILL.md). Setiap solver baik di Python maupun TypeScript wajib memenuhi persamaan dasar berikut:

1. **Expected Portfolio Return ($\mu_p$):**
   $$\mu_p = \mathbf{w}^T \boldsymbol{\mu} = \sum_{i=1}^{N} w_i \mu_i$$
2. **Portfolio Volatility ($\sigma_p$):**
   $$\sigma_p = \sqrt{\mathbf{w}^T \boldsymbol{\Sigma} \mathbf{w}} = \sqrt{\sum_{i=1}^{N}\sum_{j=1}^{N} w_i w_j \sigma_{ij}}$$
3. **Sharpe Ratio ($SR$):**
   $$SR = \frac{\mu_p - R_f}{\sigma_p}$$
   dengan $R_f$ adalah suku bunga bebas risiko tahunan (default $6.25\%$ merepresentasikan kupon SBN/BI-Rate).
4. **Risk-Adjusted Utility Objective (Markowitz Mean-Variance):**
   $$\max_{\mathbf{w}} \quad \mathbf{w}^T \boldsymbol{\mu} - \frac{\lambda}{2} \mathbf{w}^T \boldsymbol{\Sigma} \mathbf{w}$$
   dengan kendala (*constraints*):
   $$\sum_{i=1}^{N} w_i = 1, \qquad 0 \le w_i \le w_{\max} \quad \forall i \in \{1, \dots, N\}$$
5. **Contribution to Risk ($\%RC_i$):**
   $$\text{MRC}_i = \frac{(\boldsymbol{\Sigma} \mathbf{w})_i}{\sigma_p}, \qquad \%RC_i = \frac{w_i \cdot \text{MRC}_i}{\sigma_p}$$
   (Jumlah seluruh $\%RC_i$ wajib sama dengan $100\%$).

---

## 5. Daftar Periksa Audit Antigravity (Checklist Pemeriksaan Setelah Codex Selesai)

Ketika Codex selesai membangun pondasi kode, Antigravity akan mengaudit repositori dengan kriteria ketat berikut:
1. **Keakuratan Matematika:** Apakah jumlah bobot optimal selalu $100.00\%$ (toleransi $< 10^{-6}$)? Apakah titik *Maximum Sharpe* benar-benar memiliki nilai Sharpe Ratio tertinggi dibandingkan seluruh titik lain di *Efficient Frontier* dan awan Monte Carlo?
2. **Kualitas Visual Anti-AI-Slop:** Apakah bebas dari emoji, bebas dari gradasi neon ungu, memakai `tabular-nums` pada setiap angka finansial, dan memiliki garis grid `1px` yang tajam di mode Terang maupun Gelap?
3. **Kelengkapan Interaksi:** Apakah kuesioner 8 pertanyaan mengubah skor risiko dan langsung menggeser titik rekomendasi di kurva *Efficient Frontier*? Apakah kalkulator *Rebalancing* menghitung nominal Rupiah `BUY` / `SELL` secara akurat?
4. **Kesiapan Build & Test:** Apakah `npm run test` (Vitest) dan `npm run build` (Next.js production build) berjalan tanpa satu pun error atau warning tipe data?
