import type { DemoPersona } from "@/types/quant";

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "rahmat",
    cif: "CIF-1001",
    name: "H. Rahmat",
    age: 56,
    label: "Konservatif Syariah",
    description: "Prioritas pada kestabilan dan kepatuhan syariah.",
    initialCapitalIdr: 250_000_000,
    monthlyContributionIdr: 5_000_000,
    horizonYears: 5,
    shariaOnly: true,
    riskScore: 2.8,
    riskAversion: 5.8,
    presetAnswers: { horizon: 2, goal: 1, liquidity: 3, income: 2, experience: 2, drawdown: 1, liquidityPreference: 2, tradeoff: 1 },
    currentWeights: { MM_PUAS: 0.85, FI_SUKUK: 0.15 },
  },
  {
    id: "budi",
    cif: "CIF-1002",
    name: "Budi Santoso",
    age: 34,
    label: "Moderat Seimbang",
    description: "Pertumbuhan jangka menengah dengan diversifikasi lintas kelas aset.",
    initialCapitalIdr: 100_000_000,
    monthlyContributionIdr: 3_000_000,
    horizonYears: 10,
    shariaOnly: false,
    riskScore: 5.6,
    riskAversion: 2.6,
    presetAnswers: { horizon: 3, goal: 3, liquidity: 4, income: 3, experience: 3, drawdown: 3, liquidityPreference: 3, tradeoff: 3 },
    currentWeights: { MM_CONV: 0.35, FI_SBN: 0.35, EQ_LQ45: 0.3 },
  },
  {
    id: "alya",
    cif: "CIF-1003",
    name: "Alya Putri",
    age: 26,
    label: "Agresif Pertumbuhan",
    description: "Horizon panjang dengan ruang toleransi risiko lebih tinggi.",
    initialCapitalIdr: 50_000_000,
    monthlyContributionIdr: 2_500_000,
    horizonYears: 15,
    shariaOnly: false,
    riskScore: 8.5,
    riskAversion: 1.1,
    presetAnswers: { horizon: 5, goal: 5, liquidity: 4, income: 4, experience: 4, drawdown: 5, liquidityPreference: 5, tradeoff: 5 },
    currentWeights: { EQ_DIV: 0.72, EQ_LQ45: 0.18, MM_CONV: 0.1 },
  },
];

const EXTRA_NAMES = [
  "Siti Nurhaliza", "Andi Wijaya", "Dewi Lestari", "Rudi Hartono",
  "Nadia Kusuma", "Fajar Pratama", "Rina Marlina", "Hendra Gunawan",
  "Tari Wulandari", "Bagus Setiawan", "Lina Permata", "Dimas Anggara",
  "Yusuf Mansyur", "Maya Sari", "Reza Pahlevi", "Kartika Putri",
  "Agus Salim", "Indah Cahyani", "Taufik Hidayat", "Ratna Sari",
  "Bayu Nugroho",
];

export const INITIAL_CLIENT_BOOK: DemoPersona[] = [
  ...DEMO_PERSONAS,
  ...EXTRA_NAMES.map((name, idx): DemoPersona => {
    const num = idx + 4;
    const tier = idx % 3;
    const shariaOnly = idx % 2 === 0;
    const riskScore = tier === 0 ? 2.5 + (idx % 3) * 0.4 : tier === 1 ? 5.2 + (idx % 3) * 0.5 : 7.8 + (idx % 3) * 0.4;
    const riskAversion = Number(Math.min(7.5, Math.max(0.8, 7.5 - ((riskScore - 1) / 9) * 6.7)).toFixed(2));
    const label = riskScore < 3.5 ? "Konservatif" : riskScore < 6.5 ? "Moderat" : "Agresif";
    const scoreOpt = riskScore < 3.5 ? 2 : riskScore < 6.5 ? 3 : 5;
    return {
      id: `client-${num}`,
      cif: `CIF-${1000 + num}`,
      name,
      age: 24 + ((idx * 5) % 38),
      label: shariaOnly ? `${label} Syariah` : label,
      description: `Nasabah terdaftar (${shariaOnly ? "Syariah" : "Konvensional"}) — data sintetis untuk simulasi skala CRM.`,
      initialCapitalIdr: (50 + ((idx * 35) % 450)) * 1_000_000,
      monthlyContributionIdr: (1 + (idx % 6)) * 1_000_000,
      horizonYears: tier === 0 ? 4 : tier === 1 ? 8 : 14,
      shariaOnly,
      riskScore: Number(riskScore.toFixed(1)),
      riskAversion,
      presetAnswers: {
        horizon: scoreOpt,
        goal: scoreOpt,
        liquidity: 3,
        income: 3,
        experience: scoreOpt,
        drawdown: scoreOpt,
        liquidityPreference: scoreOpt,
        tradeoff: scoreOpt,
      },
      currentWeights: shariaOnly
        ? { MM_PUAS: 0.55, FI_SUKUK: 0.3, EQ_JII: 0.15 }
        : { MM_CONV: 0.4, FI_SBN: 0.3, EQ_LQ45: 0.3 },
    };
  }),
];

export const DEFAULT_PERSONA = DEMO_PERSONAS[1];
