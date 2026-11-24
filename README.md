# QuantVault — Private Wealth, Robo-Advisor & Customer Intelligence Suite

**QuantVault** adalah platform *wealth management* dan analitik perbankan terpadu yang menggabungkan **optimasi portofolio kuantitatif Markowitz**, **CRM Relationship Manager**, **analitik pelanggan (RFM, Churn, A/B Campaign, Loyalitas)**, serta **tata kelola Komite Risiko & DPS Syariah** dalam satu aplikasi web modern yang 100% *free-tier* dan siap di-deploy ke Vercel.

---

## Kapabilitas & Modul Utama

| Domain | Modul | Kapabilitas Utama |
| :--- | :--- | :--- |
| **Wealth Advisory** | **Robo-Advisor & Optimasi Markowitz** | Mean-Variance Optimization (*long-only bounded simplex*), *Ledoit-Wolf Shrinkage 15%*, *POJK Suitability cap*, *Efficient Frontier*, *Strategy Benchmarking* (Markowitz vs Risk Parity vs Equal Weight), *Monte Carlo 1.000 jalur* (Nominal & Riil Inflasi 3%), *Order Ticket Rebalance IDR*, cetak *IPS PDF*, & verifikasi silang **Python SciPy SLSQP**. |
| **Customer Analytics** | **Segmentasi Nasabah (RFM + K-Means)** | Klasterisasi K-Means (`K=4`) pada fitur *Recency*, *Frequency*, & *Monetary* seluruh nasabah CRM (*VIP Accumulator*, *Core Growth*, *Yield Seeker*, *At-Risk Dormant*) lengkap dengan peta sebaran klaster SVG. |
| **Retention Engine** | **Prediksi Churn & Faktor Penyebab** | Model probabilitas logistik *explainable* yang menghitung risiko penarikan dana berdasarkan ketidakaktifan, *drift*, *Sharpe gap*, dan *POJK Breach*, lengkap dengan ekspor **Call-List CSV**. |
| **Growth & Marketing** | **Kampanye Tertarget & Uji A/B Z-Test** | Simulator kampanye per segmen dengan *Two-Proportion Z-Test* (`p-value < 0,05`), proyeksi skala populasi bank, *Incremental AUM*, *Net ROI*, dan integrasi langsung ke *Audit Trail* serta penurunan skor churn. |
| **Loyalty Economics** | **Analisis Program Loyalitas & ROI** | Evaluasi biaya reward tier *Platinum / Gold / Silver* dengan perbandingan mode **All-Client** vs **Targeted Retention** terhadap retensi AUM. |

---

## Arsitektur Portal & Akses Peran (Role-Based Access)

- **`/` (Executive Landing & Product Brochure):** Penjelasan produk, keunggulan utama, alur kerja 4 tahap, rincian 5 modul, dan gerbang masuk 1-klik ke 4 peran operasional.
- **`/workspace` (10-Module Banking Terminal):**
  - **Nasabah / Investor:** Kuesioner profil risiko 8 pertanyaan (2 dimensi: Kapasitas & Toleransi), kurva *Efficient Frontier*, *Monte Carlo*, *Order Ticket Rebalance IDR*, dan cetak *IPS PDF*.
  - **Wealth Advisor (RM Desk):** Direktori CRM **24+ CIF** dengan pencarian, filter POJK, paginasi, tambah nasabah manual (+ kalkulator skor otomatis), impor/ekspor CSV massal, dan *Advisor Sign-off*.
  - **Customer Intelligence:** Ruang analitik penuh untuk RFM K-Means, Prediksi Churn, Kampanye A/B Z-Test, dan Program Loyalitas ROI.
  - **Komite Risiko & Auditor DPS:** Kontrol kebijakan bank ($R_f$, plafon bobot aset), kalibrasi manual *Return* ($\mu$), *Volatilitas* ($\sigma$), & *TER*, verifikasi status DPS Syariah, uji silang Python SLSQP, serta *Governance Audit Trail*.

---

## Teknologi

- **Frontend & App Framework:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, `Plus Jakarta Sans` (`tabular-nums`).
- **Dual-Engine Quant Solver:** Client-side TypeScript Projected Gradient (`< 15 ms`) + Server-side Python SciPy SLSQP (`api/py/optimize.py`).
- **Pengujian Otomatis:** Vitest (15 *unit tests* invariansi matematika & model analitik).

---

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

Pengujian kualitas & *production build*:

```bash
npm run typecheck
npm run test
npm run build
```

---

> **Disclaimer:** Simulasi Kuantitatif untuk Portofolio Pembelajaran & Demonstrasi Teknis — Menggunakan Data Pasar & Nasabah Sintetis Terkalibrasi.
