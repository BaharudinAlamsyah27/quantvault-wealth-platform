import type { RiskAssessmentResult, RiskQuestion } from "@/types/quant";

const options = (labels: string[]) => labels.map((label, index) => ({ label, score: index + 1 }));

export const RISK_QUESTIONS: RiskQuestion[] = [
  { id: "horizon", dimension: "Horizon waktu", prompt: "Kapan dana ini kemungkinan besar akan digunakan?", options: options(["Dalam 1–2 tahun", "Dalam 3–4 tahun", "Dalam 5–7 tahun", "Dalam 8–10 tahun", "Lebih dari 10 tahun"]) },
  { id: "goal", dimension: "Tujuan investasi", prompt: "Tujuan utama investasi ini?", options: options(["Menjaga nilai dan likuiditas", "Melengkapi dana darurat", "Mendanai kebutuhan 5–7 tahun", "Membangun kekayaan jangka panjang", "Pertumbuhan aset jangka panjang"]) },
  { id: "liquidity", dimension: "Dana darurat", prompt: "Berapa bulan kebutuhan hidup yang sudah tersedia di luar portofolio ini?", options: options(["Belum tersedia", "Kurang dari 3 bulan", "3–5 bulan", "6–11 bulan", "12 bulan atau lebih"]) },
  { id: "income", dimension: "Stabilitas pendapatan", prompt: "Bagaimana kestabilan pendapatan rumah tangga Anda?", options: options(["Tidak menentu", "Cukup berfluktuasi", "Relatif stabil", "Stabil dengan cadangan memadai", "Stabil dari beberapa sumber"]) },
  { id: "experience", dimension: "Pengalaman investasi", prompt: "Seberapa sering Anda berinvestasi pada instrumen pasar modal?", options: options(["Belum pernah", "Pernah sekali dua kali", "Sesekali dalam beberapa tahun", "Rutin selama 3–5 tahun", "Rutin lebih dari 5 tahun"]) },
  { id: "drawdown", dimension: "Toleransi penurunan", prompt: "Jika nilai portofolio turun 20% dalam beberapa bulan, apa yang paling mungkin Anda lakukan?", options: options(["Menjual sebagian besar", "Mengurangi risiko dengan cepat", "Menunggu dan mengevaluasi", "Tetap berinvestasi sesuai rencana", "Menambah investasi bertahap"]) },
  { id: "liquidityPreference", dimension: "Preferensi likuiditas", prompt: "Berapa bagian investasi yang perlu mudah dicairkan dalam waktu dekat?", options: options(["Hampir seluruhnya", "Sekitar tiga perempat", "Sekitar setengah", "Sekitar seperempat", "Sangat sedikit"]) },
  { id: "tradeoff", dimension: "Imbal hasil vs kepastian", prompt: "Pilihan mana yang paling sesuai dengan kenyamanan Anda?", options: options(["Imbal hasil rendah, nilai relatif stabil", "Sedikit fluktuasi untuk hasil lebih baik", "Keseimbangan pertumbuhan dan stabilitas", "Fluktuasi cukup besar demi pertumbuhan", "Fluktuasi tinggi untuk potensi jangka panjang"]) },
];

const CAPACITY_IDS = new Set(["horizon", "liquidity", "income", "liquidityPreference"]);

export function assessRisk(answers: Record<string, number>): RiskAssessmentResult {
  const scores = RISK_QUESTIONS.map((question) => Math.min(5, Math.max(1, answers[question.id] ?? 3)));
  const rawScore = scores.reduce((sum, value) => sum + value, 0);
  const capacityRaw = RISK_QUESTIONS.reduce(
    (sum, q, idx) => sum + (CAPACITY_IDS.has(q.id) ? scores[idx] : 0),
    0,
  );
  const toleranceRaw = rawScore - capacityRaw;
  const capacityScore = Math.round((1 + ((capacityRaw - 4) / 16) * 9) * 10) / 10;
  const toleranceScore = Math.round((1 + ((toleranceRaw - 4) / 16) * 9) * 10) / 10;
  const score = Math.round((1 + ((rawScore - 8) / 32) * 9) * 10) / 10;
  const riskAversion = Math.min(7.5, Math.max(0.8, 7.5 - ((score - 1) / 9) * 6.7));
  const category = score < 3 ? "Konservatif" : score < 4.5 ? "Moderat-Konservatif" : score < 6.2 ? "Moderat" : score < 7.8 ? "Moderat-Agresif" : "Agresif";
  const maxRiskyWeight = Math.min(0.9, Math.max(0.2, 0.18 + score * 0.075));
  return { rawScore, score, capacityScore, toleranceScore, category, riskAversion, maxRiskyWeight };
}
