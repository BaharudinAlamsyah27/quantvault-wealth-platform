"use client";

import { useEffect, useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { RISK_QUESTIONS } from "@/data/risk-questions";
import type { RiskAssessmentResult } from "@/types/quant";

interface Props {
  answers: Record<string, number>;
  assessment: RiskAssessmentResult;
  displayScore: number;
  displayCategory: string;
  displayLambda: number;
  onChange: (answers: Record<string, number>) => void;
}

export function RiskQuestionnaire({
  answers,
  assessment,
  displayScore,
  displayCategory,
  displayLambda,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <section className="panel risk-summary-card" id="risk-questionnaire">
        <div className="panel-heading">
          <div>
            <span className="micro-label">Profil Risiko Nasabah</span>
            <h2>{displayCategory}</h2>
          </div>
          <span className="risk-score-pill mono tabular-nums">
            {displayScore.toFixed(1)} / 10
          </span>
        </div>
        <div className="risk-summary-body">
          <div className="risk-bar-track">
            <div
              className="risk-bar-fill"
              style={{ width: `${Math.min(100, Math.max(8, displayScore * 10))}%` }}
            />
          </div>
          <div className="risk-meta-row">
            <span>
              Kapasitas Finansial: <strong className="tabular-nums">{assessment.capacityScore.toFixed(1)}/10</strong> · Toleransi: <strong className="tabular-nums">{assessment.toleranceScore.toFixed(1)}/10</strong>
            </span>
            <span>
              Risk Aversion (λ): <strong className="tabular-nums">{displayLambda.toFixed(2)}</strong> · Plafon Ekuitas POJK: <strong className="tabular-nums">{(assessment.maxRiskyWeight * 100).toFixed(0)}%</strong>
            </span>
          </div>
          <button
            type="button"
            className="button-secondary full-width-btn"
            onClick={() => setOpen(true)}
          >
            <ClipboardList size={15} />
            <span>Ubah Jawaban Asesmen (8 Soal)</span>
          </button>
        </div>
      </section>

      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="ips-document quiz-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-modal-title"
          >
            <div className="ips-toolbar">
              <div>
                <span className="micro-label">ASESMEN PROFIL RISIKO · 8 PERTANYAAN</span>
                <strong id="quiz-modal-title" className="quiz-modal-heading">
                  Skor: {assessment.score.toFixed(1)}/10 ({assessment.category} · λ {assessment.riskAversion.toFixed(2)})
                </strong>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label="Tutup asesmen"
              >
                <X size={17} />
              </button>
            </div>
            <div className="quiz-modal-body">
              <div className="risk-formula-box">
                <div>
                  <small>POIN MENTAH</small>
                  <strong className="tabular-nums">{assessment.rawScore} / 40</strong>
                </div>
                <div>
                  <small>KAPASITAS FINANSIAL</small>
                  <strong className="tabular-nums">{assessment.capacityScore.toFixed(1)} / 10</strong>
                </div>
                <div>
                  <small>TOLERANSI PSIKOLOGIS</small>
                  <strong className="tabular-nums">{assessment.toleranceScore.toFixed(1)} / 10</strong>
                </div>
                <div>
                  <small>PLAFON EKUITAS POJK</small>
                  <strong className="tabular-nums">{(assessment.maxRiskyWeight * 100).toFixed(0)}%</strong>
                </div>
              </div>
              {RISK_QUESTIONS.map((question, questionIndex) => (
                <fieldset key={question.id} className="question-item">
                  <legend>
                    <span className="question-number">
                      {String(questionIndex + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <small>{question.dimension}</small>
                      {question.prompt}
                    </span>
                  </legend>
                  <div className="answer-list">
                    {question.options.map((option) => (
                      <label
                        key={option.score}
                        className={`answer-option ${answers[question.id] === option.score ? "is-selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option.score}
                          checked={answers[question.id] === option.score}
                          onChange={() => onChange({ ...answers, [question.id]: option.score })}
                        />
                        <span className="answer-dot" />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="quiz-modal-footer">
              <span className="muted-note" style={{ margin: 0 }}>
                Perubahan jawaban langsung memperbarui optimasi portofolio.
              </span>
              <button
                type="button"
                className="button-primary"
                onClick={() => setOpen(false)}
              >
                Terapkan Profil Risiko
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
