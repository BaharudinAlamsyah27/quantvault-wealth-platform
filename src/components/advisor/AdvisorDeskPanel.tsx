"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Download, Eye, Plus, Search, Upload, UserPlus, X } from "lucide-react";
import type { DemoPersona, PortfolioPoint } from "@/types/quant";
import { assessRisk, RISK_QUESTIONS } from "@/data/risk-questions";
import { formatIdr, formatPercent } from "@/lib/utils/formatters";
import { HelpTip } from "@/components/ui/HelpTip";

export interface AdvisorClientSummary {
  persona: DemoPersona;
  current: PortfolioPoint;
  optimal: PortfolioPoint;
  suitabilityStatus: "SUITABLE" | "BREACH";
}

interface Props {
  clients: AdvisorClientSummary[];
  activePersonaId: string;
  approvedIds: string[];
  onSelect: (persona: DemoPersona) => void;
  onInspect: (persona: DemoPersona) => void;
  onApprove: (persona: DemoPersona) => void;
  onAddClient: (client: DemoPersona) => void;
  onImportClients: (imported: DemoPersona[]) => void;
}

const PAGE_SIZE = 8;

export function AdvisorDeskPanel({ clients, activePersonaId, approvedIds, onSelect, onInspect, onApprove, onAddClient, onImportClients }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "DRIFT" | "BREACH" | "SHARIA">("ALL");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  // Manual Client Creation Form State
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState(32);
  const [newCapital, setNewCapital] = useState(150_000_000);
  const [newDca, setNewDca] = useState(3_500_000);
  const [newHorizon, setNewHorizon] = useState(10);
  const [newRiskMode, setNewRiskMode] = useState<"quiz" | "manual">("quiz");
  const [newRiskScore, setNewRiskScore] = useState(5.5);
  const [newAnswers, setNewAnswers] = useState<Record<string, number>>(
    Object.fromEntries(RISK_QUESTIONS.map((q) => [q.id, 3])),
  );
  const [newSharia, setNewSharia] = useState(false);
  const newAssessment = useMemo(() => assessRisk(newAnswers), [newAnswers]);

  const totalAum = clients.reduce((sum, item) => sum + item.persona.initialCapitalIdr, 0);
  const needsRebalanceCount = clients.filter(({ current, optimal }) => {
    const drift = Object.keys(optimal.weights).reduce((sum, id) => sum + Math.abs((optimal.weights[id] ?? 0) - (current.weights[id] ?? 0)), 0) / 2;
    return drift > 0.08;
  }).length;
  const breachCount = clients.filter((c) => c.suitabilityStatus === "BREACH").length;
  const avgSharpeUplift = clients.reduce((sum, { current, optimal }) => sum + (optimal.sharpeRatio - current.sharpeRatio), 0) / Math.max(1, clients.length);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((item) => {
      const matchesSearch =
        !query ||
        item.persona.name.toLowerCase().includes(query) ||
        (item.persona.cif ?? "").toLowerCase().includes(query) ||
        item.persona.label.toLowerCase().includes(query);
      if (!matchesSearch) return false;
      const drift = Object.keys(item.optimal.weights).reduce((sum, id) => sum + Math.abs((item.optimal.weights[id] ?? 0) - (item.current.weights[id] ?? 0)), 0) / 2;
      if (filterMode === "DRIFT") return drift > 0.08;
      if (filterMode === "BREACH") return item.suitabilityStatus === "BREACH";
      if (filterMode === "SHARIA") return item.persona.shariaOnly;
      return true;
    });
  }, [clients, search, filterMode]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedClients = filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCreateClient = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;
    const score = newRiskMode === "quiz" ? newAssessment.score : Math.min(10, Math.max(1, newRiskScore));
    const lambda = newRiskMode === "quiz"
      ? Number(newAssessment.riskAversion.toFixed(2))
      : Number(Math.min(7.5, Math.max(0.8, 7.5 - ((score - 1) / 9) * 6.7)).toFixed(2));
    const baseLabel = newRiskMode === "quiz"
      ? newAssessment.category
      : score < 3.5 ? "Konservatif" : score < 6.5 ? "Moderat" : "Agresif";
    const optVal = score < 3.5 ? 2 : score < 6.5 ? 3 : 5;
    const id = `custom-${Date.now()}`;
    const cif = `CIF-${1000 + clients.length + 1}`;
    const created: DemoPersona = {
      id,
      cif,
      name: newName.trim(),
      age: newAge,
      label: newSharia ? `${baseLabel} Syariah` : baseLabel,
      description: "Nasabah ditambahkan melalui RM Desk.",
      initialCapitalIdr: newCapital,
      monthlyContributionIdr: newDca,
      horizonYears: newHorizon,
      shariaOnly: newSharia,
      riskScore: score,
      riskAversion: lambda,
      presetAnswers: newRiskMode === "quiz" ? { ...newAnswers } : {
        horizon: optVal, goal: optVal, liquidity: 3, income: 3,
        experience: optVal, drawdown: optVal, liquidityPreference: optVal, tradeoff: optVal,
      },
      currentWeights: newSharia
        ? { MM_PUAS: 0.7, FI_SUKUK: 0.3 }
        : { MM_CONV: 0.6, FI_SBN: 0.25, EQ_LQ45: 0.15 },
    };
    onAddClient(created);
    setNewName("");
    setModalOpen(false);
    setPage(1);
  };

  const downloadTemplateCsv = () => {
    const sample = [
      "Nama,Usia,Modal_IDR,DCA_Bulanan_IDR,Horizon_Tahun,Skor_Risiko,Syariah",
      "Ahmad Fauzi,38,200000000,4000000,10,5.5,Ya",
      "Clara Wijaya,29,120000000,3000000,15,7.8,Tidak",
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template-impor-nasabah-quantvault.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setImportNotice("File CSV kosong atau tidak memiliki baris data.");
        return;
      }
      const imported: DemoPersona[] = [];
      for (let i = 1; i < lines.length; i += 1) {
        const cols = lines[i].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
        const name = cols[0];
        if (!name) continue;
        const age = Math.min(90, Math.max(18, Number(cols[1]) || 35));
        const capitalIdr = Math.max(1_000_000, Number(cols[2]) || 100_000_000);
        const dcaIdr = Math.max(0, Number(cols[3]) || 2_000_000);
        const horizon = Math.min(30, Math.max(1, Number(cols[4]) || 8));
        const score = Math.min(10, Math.max(1, Number(cols[5]) || 5.0));
        const isSharia = /^(ya|yes|true|1|syariah)$/i.test(cols[6] ?? "");
        const lambda = Number(Math.min(7.5, Math.max(0.8, 7.5 - ((score - 1) / 9) * 6.7)).toFixed(2));
        const baseLabel = score < 3.5 ? "Konservatif" : score < 6.5 ? "Moderat" : "Agresif";
        const optVal = score < 3.5 ? 2 : score < 6.5 ? 3 : 5;
        imported.push({
          id: `csv-${Date.now()}-${i}`,
          cif: `CIF-${1000 + clients.length + imported.length + 1}`,
          name,
          age,
          label: isSharia ? `${baseLabel} Syariah` : baseLabel,
          description: `Diimpor dari file CSV (${file.name}).`,
          initialCapitalIdr: capitalIdr,
          monthlyContributionIdr: dcaIdr,
          horizonYears: horizon,
          shariaOnly: isSharia,
          riskScore: score,
          riskAversion: lambda,
          presetAnswers: {
            horizon: optVal, goal: optVal, liquidity: 3, income: 3,
            experience: optVal, drawdown: optVal, liquidityPreference: optVal, tradeoff: optVal,
          },
          currentWeights: isSharia
            ? { MM_PUAS: 0.65, FI_SUKUK: 0.35 }
            : { MM_CONV: 0.5, FI_SBN: 0.3, EQ_LQ45: 0.2 },
        });
      }
      if (imported.length === 0) {
        setImportNotice("Tidak ada baris nasabah valid yang terbaca dari CSV.");
      } else {
        onImportClients(imported);
        setImportNotice(`Berhasil mengimpor ${imported.length} nasabah baru dari ${file.name}.`);
        setPage(1);
      }
    } catch {
      setImportNotice("Gagal membaca file CSV. Pastikan format sesuai template.");
    } finally {
      event.target.value = "";
    }
  };

  const exportClientsCsv = () => {
    const header = ["CIF", "Nama", "Usia", "Profil Risiko", "Skor", "AUM_IDR", "Drift_Pct", "Sharpe_Current", "Sharpe_Optimal", "POJK_Status"];
    const rows = filteredClients.map(({ persona, current, optimal, suitabilityStatus }) => {
      const drift = Object.keys(optimal.weights).reduce((sum, id) => sum + Math.abs((optimal.weights[id] ?? 0) - (current.weights[id] ?? 0)), 0) / 2;
      return [
        persona.cif ?? persona.id,
        `"${persona.name}"`,
        persona.age,
        `"${persona.label}"`,
        persona.riskScore.toFixed(1),
        persona.initialCapitalIdr,
        (drift * 100).toFixed(2),
        current.sharpeRatio.toFixed(2),
        optimal.sharpeRatio.toFixed(2),
        suitabilityStatus,
      ].join(",");
    });
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quantvault-client-book.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="role-workspace advisor-workspace">
      <div className="role-authority-banner has-media">
        <img
          src="/images/advisor-consultation.jpg"
          alt="Sesi konsultasi Wealth Advisor bersama nasabah"
          width={76}
          height={52}
          className="banner-thumb"
        />
        <div>
          <strong>Peran Aktif: Wealth Advisor / Relationship Manager (RM Desk)</strong>
          <span>
            Wewenang: Mengelola direktori nasabah (skala 1.000+ CIF dengan pencarian &amp; paginasi), menambah nasabah manual, meninjau drift portofolio, dan menyetujui usulan IPS. Tidak dapat mengubah kebijakan suku bunga atau daftar aset bank.
          </span>
        </div>
      </div>

      <div className="workspace-title-row">
        <div>
          <span className="micro-label">RELATIONSHIP MANAGEMENT · SCALABLE CLIENT BOOK</span>
          <h1>Direktori &amp; Meja Kerja Wealth Advisor</h1>
          <p>Pencarian cepat, filter kepatuhan POJK, paginasi tabel nasabah, dan input nasabah manual.</p>
        </div>
        <div className="rebalance-btn-group">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={handleCsvUpload}
          />
          <button type="button" className="button-secondary" onClick={downloadTemplateCsv} title="Unduh contoh format CSV">
            <Download size={14} />
            <span>Template CSV</span>
          </button>
          <button type="button" className="button-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            <span>Impor CSV</span>
          </button>
          <button type="button" className="button-secondary" onClick={exportClientsCsv}>
            <Download size={14} />
            <span>Ekspor CSV</span>
          </button>
          <button type="button" className="button-primary" onClick={() => setModalOpen(true)}>
            <UserPlus size={16} />
            <span>Tambah Nasabah Baru</span>
          </button>
        </div>
      </div>
      {importNotice && (
        <div className="notice-banner" style={{ marginBottom: 16 }}>
          <span>{importNotice}</span>
        </div>
      )}

      <div className="advisor-summary-strip">
        <article className="kpi-card">
          <div className="kpi-title">
            <span>TOTAL KELOLAAN (AUM)</span>
            <HelpTip title="Total Managed AUM" description="Akumulasi seluruh dana kelolaan dari seluruh nasabah terdaftar di Client Book." />
          </div>
          <strong className="kpi-value tabular-nums">{formatIdr(totalAum)}</strong>
          <small>{clients.length} nasabah terdaftar</small>
        </article>
        <article className="kpi-card">
          <div className="kpi-title">
            <span>PERLU REBALANCE / BREACH</span>
            <HelpTip title="Deteksi Drift & POJK Breach" description="Menghitung jumlah nasabah yang bobot portofolionya menyimpang > 8% dari target optimal atau melanggar batas risiko POJK." />
          </div>
          <strong className="kpi-value tabular-nums">{needsRebalanceCount} drift · {breachCount} breach</strong>
          <small>Ambang drift &gt; 8,00%</small>
        </article>
        <article className="kpi-card">
          <div className="kpi-title">
            <span>RATA-RATA SHARPE UPLIFT</span>
            <HelpTip title="Efficiency Uplift" description="Rata-rata peningkatan rasio imbal hasil terhadap risiko (Sharpe Ratio) jika portofolio nasabah di-rebalance ke kurva Markowitz." />
          </div>
          <strong className="kpi-value tabular-nums positive-value">+{avgSharpeUplift.toFixed(2)}</strong>
          <small>Potensi perbaikan efisiensi</small>
        </article>
      </div>

      <section className="panel crm-panel">
        <div className="crm-toolbar">
          <div className="crm-search">
            <Search size={15} />
            <input
              type="search"
              placeholder="Cari nama nasabah, nomor CIF, atau profil risiko..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Cari nasabah"
            />
          </div>
          <div className="crm-filters" role="group" aria-label="Filter status nasabah">
            <button type="button" className={`crm-filter-btn ${filterMode === "ALL" ? "is-active" : ""}`} onClick={() => { setFilterMode("ALL"); setPage(1); }}>
              Semua ({clients.length})
            </button>
            <button type="button" className={`crm-filter-btn ${filterMode === "DRIFT" ? "is-active" : ""}`} onClick={() => { setFilterMode("DRIFT"); setPage(1); }}>
              Perlu Rebalance ({needsRebalanceCount})
            </button>
            <button type="button" className={`crm-filter-btn ${filterMode === "BREACH" ? "is-active" : ""}`} onClick={() => { setFilterMode("BREACH"); setPage(1); }}>
              POJK Breach ({breachCount})
            </button>
            <button type="button" className={`crm-filter-btn ${filterMode === "SHARIA" ? "is-active" : ""}`} onClick={() => { setFilterMode("SHARIA"); setPage(1); }}>
              Khusus Syariah
            </button>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table crm-table">
            <thead>
              <tr>
                <th>CIF &amp; Nasabah</th>
                <th>Profil Risiko</th>
                <th>AUM (IDR)</th>
                <th>Drift</th>
                <th>Sharpe (Kini → Target)</th>
                <th>POJK Status</th>
                <th>Aksi RM</th>
              </tr>
            </thead>
            <tbody>
              {pagedClients.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "28px" }}>
                    Tidak ada nasabah yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                pagedClients.map(({ persona, current, optimal, suitabilityStatus }) => {
                  const isActive = persona.id === activePersonaId;
                  const drift = Object.keys(optimal.weights).reduce((sum, id) => sum + Math.abs((optimal.weights[id] ?? 0) - (current.weights[id] ?? 0)), 0) / 2;
                  const approved = approvedIds.includes(persona.id);
                  return (
                    <tr
                      key={persona.id}
                      className={isActive ? "benchmark-highlight" : ""}
                      style={{ cursor: "pointer" }}
                      onClick={() => onSelect(persona)}
                    >
                      <th scope="row">
                        <span className="ticker-cell">{persona.cif ?? "CIF-DEMO"} · {persona.name}</span>
                        <small>{persona.age} thn · Horizon {persona.horizonYears} thn</small>
                      </th>
                      <td>
                        <span className="tabular-nums"><strong>{persona.riskScore.toFixed(1)}</strong>/10</span>
                        <small style={{ display: "block", color: "var(--soft-muted)" }}>{persona.label}</small>
                      </td>
                      <td className="tabular-nums">{formatIdr(persona.initialCapitalIdr)}</td>
                      <td className="tabular-nums">
                        <span className={drift > 0.08 ? "negative-value" : "positive-value"}>
                          <strong>{formatPercent(drift)}</strong>
                        </span>
                      </td>
                      <td className="tabular-nums">
                        {current.sharpeRatio.toFixed(2)} → <strong>{optimal.sharpeRatio.toFixed(2)}</strong>
                      </td>
                      <td>
                        <span className={`suitability-pill ${suitabilityStatus === "BREACH" ? "is-breach" : "is-suitable"}`}>
                          {suitabilityStatus}
                        </span>
                      </td>
                      <td>
                        <div className="crm-row-actions">
                          <button type="button" className="button-secondary crm-btn" onClick={() => onInspect(persona)}>
                            <Eye size={13} />
                            <span>Buka</span>
                          </button>
                          <button
                            type="button"
                            className={`button-primary crm-btn ${approved ? "button-approved" : ""}`}
                            onClick={() => onApprove(persona)}
                            disabled={approved}
                          >
                            {approved ? <Check size={13} /> : <ClipboardCheck size={13} />}
                            <span>{approved ? "Approved" : "Sign-off"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="crm-pagination">
          <span>
            Menampilkan {filteredClients.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredClients.length)} dari {filteredClients.length} nasabah
          </span>
          <div className="crm-page-btns">
            <button type="button" className="button-secondary crm-btn" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={14} /> Sebelumnya
            </button>
            <span className="tabular-nums">Hal {currentPage} / {totalPages}</span>
            <button type="button" className="button-secondary crm-btn" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Berikutnya <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section className="ips-document quiz-modal" role="dialog" aria-modal="true" aria-labelledby="add-client-title">
            <div className="ips-toolbar">
              <div>
                <span className="micro-label">ONBOARDING NASABAH MANUAL</span>
                <strong id="add-client-title" className="quiz-modal-heading">Tambah Data Nasabah Baru</strong>
              </div>
              <button type="button" className="icon-button" onClick={() => setModalOpen(false)} aria-label="Tutup form">
                <X size={17} />
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="add-client-form">
              <div className="add-client-grid">
                <label className="field-label">
                  Nama Lengkap Nasabah
                  <input type="text" required placeholder="Contoh: Hendra Wijaya" value={newName} onChange={(e) => setNewName(e.target.value)} className="text-input" />
                </label>
                <label className="field-label">
                  Usia (Tahun)
                  <input type="number" min="18" max="90" value={newAge} onChange={(e) => setNewAge(Number(e.target.value) || 30)} className="text-input tabular-nums" />
                </label>
                <label className="field-label">
                  Modal Awal (IDR)
                  <input type="number" min="1000000" step="5000000" value={newCapital} onChange={(e) => setNewCapital(Number(e.target.value) || 10000000)} className="text-input tabular-nums" />
                </label>
                <label className="field-label">
                  Investasi Rutin / Bulan (IDR)
                  <input type="number" min="0" step="500000" value={newDca} onChange={(e) => setNewDca(Number(e.target.value) || 0)} className="text-input tabular-nums" />
                </label>
                <label className="field-label">
                  Horizon Investasi (Tahun)
                  <input type="number" min="1" max="30" value={newHorizon} onChange={(e) => setNewHorizon(Number(e.target.value) || 5)} className="text-input tabular-nums" />
                </label>
                <label className="field-label">
                  Metode Penentuan Profil Risiko
                  <select value={newRiskMode} onChange={(e) => setNewRiskMode(e.target.value as "quiz" | "manual")}>
                    <option value="quiz">Hitung Otomatis via Kuesioner 8 Soal ({newAssessment.score.toFixed(1)}/10 · {newAssessment.category})</option>
                    <option value="manual">Input Skor Manual (1.0 – 10.0)</option>
                  </select>
                </label>
              </div>
              {newRiskMode === "manual" ? (
                <label className="field-label" style={{ marginBottom: 14 }}>
                  Skor Profil Risiko Manual (1.0 – 10.0)
                  <input type="number" min="1" max="10" step="0.1" value={newRiskScore} onChange={(e) => setNewRiskScore(Number(e.target.value) || 5)} className="text-input tabular-nums" />
                </label>
              ) : (
                <div className="onboarding-quiz-box">
                  <div className="risk-formula-box" style={{ marginBottom: 10 }}>
                    <div><small>SKOR PROFIL</small><strong className="tabular-nums">{newAssessment.score.toFixed(1)} / 10</strong></div>
                    <div><small>KATEGORI</small><strong>{newAssessment.category}</strong></div>
                    <div><small>LAMBDA (λ)</small><strong className="tabular-nums">{newAssessment.riskAversion.toFixed(2)}</strong></div>
                    <div><small>BATAS EKUITAS</small><strong className="tabular-nums">{(newAssessment.maxRiskyWeight * 100).toFixed(0)}%</strong></div>
                  </div>
                  <div className="onboarding-quiz-list">
                    {RISK_QUESTIONS.map((q, idx) => (
                      <label key={q.id} className="field-label">
                        <span>{idx + 1}. {q.dimension} — {q.prompt}</span>
                        <select
                          value={newAnswers[q.id] ?? 3}
                          onChange={(e) => setNewAnswers((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}
                        >
                          {q.options.map((opt) => (
                            <option key={opt.score} value={opt.score}>[{opt.score}/5] {opt.label}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <label className="checkbox-inline">
                <input type="checkbox" checked={newSharia} onChange={(e) => setNewSharia(e.target.checked)} />
                <span>Wajib Portofolio Khusus Syariah (DPS Compliant)</span>
              </label>
              <div className="quiz-modal-footer">
                <span className="muted-note" style={{ margin: 0 }}>Nasabah baru langsung tersimpan di sesi lokal dan siap dioptimasi.</span>
                <button type="submit" className="button-primary"><Plus size={15} /> Simpan &amp; Tambahkan</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
