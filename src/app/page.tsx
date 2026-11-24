import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Cpu,
  FileSpreadsheet,
  Landmark,
  Layers,
  Lock,
  Megaphone,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { LandingEnhancer } from "@/components/landing/LandingEnhancer";

const platformStats = [
  { value: "5 Modul", label: "Terpadu dalam 1 Platform", detail: "Advisory, RFM, Churn, A/B, Loyalitas" },
  { value: "10 Aset", label: "Instrumen Pasar Terkalibrasi", detail: "Pasar Uang, SBN, Sukuk, Ekuitas, Emas" },
  { value: "24+ CIF", label: "Direktori Nasabah CRM", detail: "Tambah Manual, Impor & Ekspor CSV" },
  { value: "1.000", label: "Jalur Simulasi Monte Carlo", detail: "Proyeksi Nominal & Daya Beli Riil" },
];

const keyAdvantages = [
  {
    icon: Cpu,
    title: "Dual-Engine Kuantitatif (< 15 ms + SLSQP)",
    desc: "Perhitungan Markowitz Mean-Variance berjalan instan di browser via TypeScript sekaligus diverifikasi silang dengan solver ilmiah Python SciPy SLSQP.",
  },
  {
    icon: Lock,
    title: "Kepatuhan POJK & DPS Syariah Terintegrasi",
    desc: "Batas maksimum kelas aset berisiko (Suitability Cap) dan penyaringan instrumen halal DPS langsung terkunci di dalam algoritma optimasi.",
  },
  {
    icon: Layers,
    title: "Ekosistem Data Tertutup (Closed-Loop CRM)",
    desc: "Satu sumber data untuk semua divisi: mengeksekusi rebalance portofolio otomatis menurunkan skor risiko churn dan tercatat di Audit Trail.",
  },
  {
    icon: FileSpreadsheet,
    title: "Siap Operasional: CSV, Kalkulator & IPS PDF",
    desc: "Dilengkapi onboarding nasabah manual + kalkulator skor 8 pertanyaan, unggah portofolio massal (CSV), order ticket Rupiah, dan cetak IPS resmi.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Profiling & Onboarding",
    desc: "Hitung skor profil risiko nasabah dari 2 dimensi (Kapasitas Finansial & Toleransi Psikologis) atau unggah data nasabah massal via CSV.",
  },
  {
    step: "02",
    title: "Optimasi & Stress Test",
    desc: "Bentuk portofolio optimal di kurva Efficient Frontier, bandingkan dengan Risk Parity & Equal Weight, lalu uji ketahanan lewat Monte Carlo & simulasi krisis.",
  },
  {
    step: "03",
    title: "Analitik Retensi & Pertumbuhan",
    desc: "Kelompokkan nasabah dengan RFM K-Means, deteksi potensi churn sedini mungkin, rancang kampanye uji A/B Z-Test, dan hitung ROI program loyalitas.",
  },
  {
    step: "04",
    title: "Eksekusi & Pengawasan",
    desc: "Terbitkan Order Ticket Rebalance IDR, lakukan Advisor Sign-off & cetak IPS PDF, di bawah parameter pasar yang dikontrol Komite Risiko & Auditor.",
  },
];

const coreModules = [
  {
    code: "WEALTH ADVISORY",
    title: "Robo-Advisor & Optimasi Markowitz",
    desc: "Mesin alokasi aset berbasis Modern Portfolio Theory dengan penyusutan kovarians Ledoit-Wolf 15% untuk mencegah konsentrasi ekstrem.",
    bullets: [
      "Kurva Efficient Frontier interaktif + titik Optimal & Min-Variance",
      "Perbandingan strategi: Markowitz vs Risk Parity vs Equal Weight",
      "Simulasi Monte Carlo 1.000 jalur (Nominal & Riil Inflasi 3%)",
      "Order Ticket Rebalance IDR, Stress Test Makro, & Cetak IPS PDF",
    ],
    icon: TrendingUp,
    href: "/workspace?role=investor",
  },
  {
    code: "CUSTOMER ANALYTICS",
    title: "Segmentasi Nasabah (RFM + K-Means)",
    desc: "Klasterisasi otomatis seluruh basis nasabah CRM berdasarkan Recency, Frequency, dan Monetary menjadi 4 segmen strategis.",
    bullets: [
      "4 Klaster: VIP Accumulator, Core Growth, Yield Seeker, At-Risk Dormant",
      "Peta sebaran klaster SVG interaktif (Recency vs AUM)",
      "Ringkasan total kelolaan AUM dan karakteristik tiap segmen",
    ],
    icon: Users,
    href: "/workspace?role=intelligence&tab=rfm",
  },
  {
    code: "RETENTION ENGINE",
    title: "Prediksi Churn & Faktor Penyebab",
    desc: "Model probabilitas logistik yang transparan (explainable) untuk mengidentifikasi nasabah berisiko tinggi menarik dana kelolaan.",
    bullets: [
      "Deteksi pemicu: lama tidak aktif, drift portofolio, Sharpe gap, & POJK breach",
      "Kalkulasi otomatis Total AUM Berisiko (At-Risk AUM)",
      "Ekspor langsung daftar prioritas telepon (Call-List CSV) untuk RM",
    ],
    icon: AlertTriangle,
    href: "/workspace?role=intelligence&tab=churn",
  },
  {
    code: "GROWTH & MARKETING",
    title: "Kampanye Tertarget & Uji A/B Z-Test",
    desc: "Simulator eksperimen pemasaran per segmen dengan pengujian hipotesis statistik sebelum anggaran kampanye dieksekusi.",
    bullets: [
      "Uji signifikansi Two-Proportion Z-Test (Z-Score & p-value < 0,05)",
      "Proyeksi skala populasi bank, Incremental AUM, & Net ROI",
      "Eksekusi kampanye langsung menurunkan risiko churn & masuk Audit Log",
    ],
    icon: Megaphone,
    href: "/workspace?role=intelligence&tab=campaign",
  },
  {
    code: "LOYALTY ECONOMICS",
    title: "Analisis Program Loyalitas & ROI",
    desc: "Evaluasi kelayakan finansial insentif tier nasabah agar biaya reward tidak menggerus margin fee pengelolaan aset bank.",
    bullets: [
      "Simulasi 3 tier: Platinum, Gold, dan Silver berbasis ambang AUM",
      "Perbandingan mode All-Client vs Targeted Retention (fokus retensi)",
      "Perhitungan Fee Revenue, Total Biaya Reward, & Net ROI Loyalitas",
    ],
    icon: Award,
    href: "/workspace?role=intelligence&tab=loyalty",
  },
];

const rolePortals = [
  {
    badge: "CLIENT PORTAL",
    title: "Nasabah & Investor",
    authority:
      "Asesmen risiko 8 soal (Kapasitas & Toleransi), Efficient Frontier, Order Ticket Rebalance IDR, Monte Carlo Riil/Nominal, dan Cetak IPS.",
    href: "/workspace?role=investor",
    icon: UserCheck,
    cta: "Masuk sebagai Nasabah",
  },
  {
    badge: "RM DESK ACCESS",
    title: "Wealth Advisor (RM)",
    authority:
      "Direktori CRM 24+ CIF (pencarian, filter POJK, paginasi), tambah nasabah manual, impor/ekspor CSV massal, dan Advisor Sign-off IPS.",
    href: "/workspace?role=advisor",
    icon: Briefcase,
    cta: "Masuk ke Meja RM",
  },
  {
    badge: "ANALYTICS ACCESS",
    title: "Customer Intelligence",
    authority:
      "Akses penuh 4 modul analitik pelanggan: RFM K-Means, Prediksi Churn + Call-List, Kampanye A/B Z-Test, dan Program Loyalitas ROI.",
    href: "/workspace?role=intelligence",
    icon: BarChart3,
    cta: "Buka Customer Intelligence",
  },
  {
    badge: "ADMIN & AUDITOR DPS",
    title: "Komite Risiko & Auditor",
    authority:
      "Kontrol kebijakan bank (Rf BI-Rate, plafon bobot), edit manual Return/Volatilitas/TER, verifikasi DPS Syariah, uji silang Python SLSQP, & Audit Trail.",
    href: "/workspace?role=committee",
    icon: ShieldCheck,
    cta: "Masuk sebagai Komite / Auditor",
  },
];

export default function LandingPage() {
  return (
    <div className="landing-shell">
      <LandingEnhancer />
      <header className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <Link href="/" className="landing-brand">
            <span className="sidebar-brand-icon">
              <Landmark size={18} strokeWidth={1.75} />
            </span>
            <div>
              <strong>QuantVault</strong>
              <span>Private Wealth &amp; Customer Intelligence Suite</span>
            </div>
          </Link>
          <nav className="landing-links" aria-label="Navigasi beranda">
            <a href="#brochure">Tentang &amp; Keunggulan</a>
            <a href="#workflow">Alur Kerja</a>
            <a href="#modules">Fungsi &amp; Modul</a>
            <a href="#portals">Akses Peran</a>
            <Link href="/workspace?role=investor" className="button-primary">
              <span>Buka Workspace</span>
              <ArrowRight size={15} />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-container landing-hero-grid">
            <div>
              <span className="landing-eyebrow">
                PRIVATE WEALTH &amp; QUANTITATIVE BANKING PLATFORM
              </span>
              <h1>
                Platform Robo-Advisor, CRM Wealth, dan Customer Intelligence dalam Satu Sistem.
              </h1>
              <p className="landing-lead">
                Menggabungkan optimasi portofolio kuantitatif Markowitz (Dual-Engine TypeScript &amp; Python SciPy SLSQP) dengan klasterisasi nasabah RFM K-Means, prediksi churn logistik, uji statistik A/B kampanye, dan tata kelola Komite Risiko &amp; DPS Syariah.
              </p>
              <div className="landing-cta-row">
                <Link href="/workspace?role=investor" className="button-primary landing-cta-main">
                  <span>Mulai Simulasi Portofolio</span>
                  <ArrowRight size={16} />
                </Link>
                <a href="#brochure" className="button-secondary landing-cta-sub">
                  Pelajari Keunggulan &amp; Fungsi
                </a>
              </div>
            </div>

            <aside className="landing-editorial-frame">
              <div className="editorial-hero-media">
                <Image
                  src="/images/quant-analyst.jpg"
                  alt="Analis kuantitatif meninjau grafik optimasi portofolio di ruang riset perbankan"
                  width={640}
                  height={440}
                  className="editorial-img"
                  priority
                />
                <div className="editorial-caption">
                  <span className="micro-label">DUAL-ENGINE QUANTITATIVE DESK</span>
                  <strong>TypeScript Instant Solver + Python SciPy SLSQP</strong>
                </div>
              </div>
              <div className="landing-spec-card">
                <ul className="landing-spec-list">
                  <li>
                    <CheckCircle2 size={15} />
                    <span><strong>10 Instrumen Pasar</strong> + Edit Manual μ, σ, TER</span>
                  </li>
                  <li>
                    <CheckCircle2 size={15} />
                    <span><strong>24+ Direktori CRM</strong> (Impor/Ekspor CSV &amp; Kalkulator Skor)</span>
                  </li>
                  <li>
                    <CheckCircle2 size={15} />
                    <span><strong>POJK Suitability &amp; DPS Syariah</strong> terkunci di solver</span>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </section>

        <section className="brochure-metrics-strip" aria-label="Ringkasan spesifikasi sistem">
          <div className="landing-container brochure-metrics-grid">
            {platformStats.map((item, idx) => (
              <div
                key={item.label}
                className="brochure-metric-cell reveal-on-scroll"
                style={{ transitionDelay: `${idx * 60}ms` }}
              >
                <strong className="tabular-nums">{item.value}</strong>
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        </section>

        <section id="brochure" className="landing-section">
          <div className="landing-container">
            <div className="brochure-overview-grid">
              <div className="panel brochure-manifesto reveal-on-scroll">
                <span className="micro-label scroll-glide" style={{ color: "var(--teal)" }}>
                  EXECUTIVE PRODUCT BRIEF · MENGAPA QUANTVAULT?
                </span>
                <h2>Menjawab 4 Tantangan Utama Layanan Wealth Management Perbankan</h2>
                <p>
                  Di banyak institusi keuangan, proses alokasi investasi nasabah, pemantauan risiko penarikan dana (<em>churn</em>), pengujian efektivitas kampanye, dan pengawasan kepatuhan sering berjalan terpisah di spreadsheet yang berbeda.
                </p>
                <p>
                  <strong>QuantVault</strong> menyatukan seluruh rantai kerja tersebut ke dalam satu meja kerja perbankan yang terukur secara matematis. Nasabah mendapatkan rekomendasi portofolio yang transparan sesuai profil risikonya, Relationship Manager (RM) memperoleh peringatan dini dan daftar prioritas retensi, sementara Komite Risiko &amp; Auditor DPS memegang kendali penuh atas parameter pasar serta jejak audit.
                </p>
                <div className="brochure-highlight-note">
                  <strong>100% Terbuka untuk Demonstrasi &amp; Pembelajaran:</strong> Seluruh kalkulasi berjalan langsung di browser tanpa form login berbayar, menggunakan data pasar &amp; nasabah sintetis terkalibrasi.
                </div>
              </div>

              <div className="brochure-pillars-grid">
                {keyAdvantages.map((adv, idx) => {
                  const Icon = adv.icon;
                  return (
                    <article
                      key={adv.title}
                      className="panel brochure-pillar-card reveal-on-scroll"
                      style={{ transitionDelay: `${(idx + 1) * 70}ms` }}
                    >
                      <span className="role-portal-icon">
                        <Icon size={17} />
                      </span>
                      <h3>{adv.title}</h3>
                      <p>{adv.desc}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-editorial-strip">
          <div className="landing-container">
            <div className="editorial-trio-grid">
              <article className="panel editorial-story-card">
                <div className="editorial-story-media">
                  <Image
                    src="/images/investor-wealth.jpg"
                    alt="Nasabah private banking meninjau alokasi portofolio investasi secara digital"
                    width={520}
                    height={320}
                    className="editorial-img editorial-img-top"
                  />
                </div>
                <div className="editorial-story-body">
                  <span className="micro-label">HUMAN-CENTERED WEALTH</span>
                  <h3>Transparansi Alokasi untuk Nasabah</h3>
                  <p>Asesmen profil risiko yang ramah, proyeksi daya beli riil setelah inflasi, dan cetak laporan IPS resmi.</p>
                </div>
              </article>

              <article className="panel editorial-story-card">
                <div className="editorial-story-media">
                  <Image
                    src="/images/advisor-consultation.jpg"
                    alt="Relationship Manager berdiskusi dengan nasabah mengenai strategi portofolio"
                    width={520}
                    height={320}
                    className="editorial-img"
                  />
                </div>
                <div className="editorial-story-body">
                  <span className="micro-label">ADVISORY &amp; RETENTION DESK</span>
                  <h3>Kolaborasi RM &amp; Customer Intelligence</h3>
                  <p>Deteksi dini risiko churn, klasterisasi RFM K-Means, serta uji statistik A/B kampanye dan simulasi loyalitas nasabah.</p>
                </div>
              </article>

              <article className="panel editorial-story-card">
                <div className="editorial-story-media">
                  <Image
                    src="/images/quant-analyst.jpg"
                    alt="Komite risiko memantau kepatuhan dan parameter pasar kuantitatif"
                    width={520}
                    height={320}
                    className="editorial-img editorial-img-top"
                  />
                </div>
                <div className="editorial-story-body">
                  <span className="micro-label">RISK &amp; DPS GOVERNANCE</span>
                  <h3>Kontrol Ketat Komite Risiko &amp; Auditor</h3>
                  <p>Pengaturan suku bunga acuan, plafon konsentrasi aset, status DPS Syariah, dan jejak audit tersentralisasi.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="workflow" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-head reveal-on-scroll">
              <span className="micro-label scroll-glide">END-TO-END BANKING WORKFLOW</span>
              <h2>Bagaimana QuantVault Bekerja dari Awal hingga Eksekusi</h2>
              <p>
                Alur kerja 4 tahap yang menghubungkan proses pengenalan nasabah (KYC/Profiling), optimasi kuantitatif, analitik retensi, hingga persetujuan tata kelola bank.
              </p>
            </div>

            <div className="workflow-grid">
              {workflowSteps.map((item, idx) => (
                <article
                  key={item.step}
                  className="panel workflow-card reveal-on-scroll"
                  style={{ transitionDelay: `${idx * 70}ms` }}
                >
                  <span className="workflow-step-num tabular-nums">{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="modules" className="landing-section landing-section-alt">
          <div className="landing-container">
            <div className="landing-section-head reveal-on-scroll">
              <span className="micro-label scroll-glide">INTEGRATED CAPABILITIES &amp; FUNCTIONS</span>
              <h2>Rincian Fungsi &amp; 5 Modul Utama Platform</h2>
              <p>
                Seluruh modul berbagi satu basis data nasabah dan portofolio yang sama — setiap tindakan di satu modul langsung tercermin secara real-time di modul lainnya.
              </p>
            </div>

            <div className="landing-modules-grid">
              {coreModules.map((mod, idx) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.code}
                    href={mod.href}
                    className="panel landing-module-card reveal-on-scroll"
                    style={{ transitionDelay: `${idx * 60}ms` }}
                  >
                    <div className="role-portal-top">
                      <span className="micro-label" style={{ color: "var(--teal)" }}>{mod.code}</span>
                      <Icon size={16} style={{ color: "var(--teal)" }} />
                    </div>
                    <h3>{mod.title}</h3>
                    <p>{mod.desc}</p>
                    <ul className="module-bullet-list">
                      {mod.bullets.map((bullet) => (
                        <li key={bullet}>
                          <CheckCircle2 size={13} />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <span className="module-open-link">
                      Buka modul ini <ArrowRight size={13} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section id="portals" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-head reveal-on-scroll">
              <span className="micro-label scroll-glide">ROLE-BASED ACCESS GATEWAY</span>
              <h2>Pilih Portal Akses Berdasarkan Peran Operasional</h2>
              <p>
                Setiap peran memiliki batasan wewenang dan ruang kerja khusus yang saling terhubung melalui satu basis data sesi &amp; Governance Audit Log.
              </p>
            </div>

            <div className="landing-roles-grid">
              {rolePortals.map((portal, idx) => {
                const Icon = portal.icon;
                return (
                  <article
                    key={portal.badge}
                    className="panel role-portal-card reveal-on-scroll"
                    style={{ transitionDelay: `${idx * 65}ms` }}
                  >
                    <div className="role-portal-top">
                      <span className="role-portal-icon">
                        <Icon size={18} />
                      </span>
                      <span className="micro-label">{portal.badge}</span>
                    </div>
                    <h3>{portal.title}</h3>
                    <p>{portal.authority}</p>
                    <Link href={portal.href} className="button-secondary full-width-btn">
                      <span>{portal.cta}</span>
                      <ArrowRight size={14} />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <strong>QUANTVAULT · PRIVATE WEALTH &amp; ANALYTICS PLATFORM</strong>
          <p>
            Simulasi Kuantitatif untuk Portofolio Pembelajaran &amp; Demonstrasi Teknis — Menggunakan Data Pasar &amp; Nasabah Sintetis Terkalibrasi.
          </p>
        </div>
      </footer>
    </div>
  );
}
