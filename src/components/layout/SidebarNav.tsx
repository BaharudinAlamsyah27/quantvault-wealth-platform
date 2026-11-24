"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  Briefcase,
  Calculator,
  Grid,
  Landmark,
  Megaphone,
  Menu,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { BankingRole, DemoPersona } from "@/types/quant";
import type { IntelligenceTab } from "@/components/analytics/CustomerIntelligencePanel";
import { MethodologyDrawer } from "@/components/layout/MethodologyDrawer";

export type InvestorTab = "frontier" | "rebalance" | "simulation" | "correlation";
export type AppTheme = "light" | "cream" | "dark";

interface Props {
  role: BankingRole;
  investorTab: InvestorTab;
  intelligenceTab: IntelligenceTab;
  onNavigate: (role: BankingRole, subTab?: InvestorTab | IntelligenceTab) => void;
  persona: DemoPersona;
  clients: DemoPersona[];
  onSelectClient: (persona: DemoPersona) => void;
  totalClients: number;
  shariaOnly: boolean;
  onShariaChange: (value: boolean) => void;
  onReset: () => void;
  theme: AppTheme;
  onThemeChange: (value: AppTheme) => void;
}

export function SidebarNav(props: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (role: BankingRole, subTab?: InvestorTab | IntelligenceTab) => {
    props.onNavigate(role, subTab);
    setMobileOpen(false);
  };

  return (
    <>
      <div className="mobile-topbar">
        <button
          type="button"
          className="icon-button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Buka menu navigasi"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="mobile-brand">
          <Landmark size={16} />
          <strong>QuantVault</strong>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => props.onThemeChange(props.theme === "light" ? "cream" : props.theme === "cream" ? "dark" : "light")}
          aria-label="Ganti tema tampilan"
        >
          {props.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${mobileOpen ? "is-open" : ""}`} aria-label="Navigasi utama">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Landmark size={18} strokeWidth={1.75} />
          </div>
          <div>
            <strong>QuantVault</strong>
            <span>Private Wealth Platform</span>
          </div>
        </div>

        <Link href="/" className="sidebar-portal-link">
          <ArrowLeft size={13} />
          <span>Kembali ke Portal Beranda</span>
        </Link>

        <div className="sidebar-scroll">
          <div className="sidebar-section">
            <span className="sidebar-label">Wealth Advisory</span>
            <nav className="sidebar-nav-list">
              <button type="button" className={`sidebar-nav-compact ${props.role === "investor" && props.investorTab === "frontier" ? "is-active" : ""}`} onClick={() => go("investor", "frontier")}>
                <TrendingUp size={15} /><span>Efficient Frontier &amp; Alokasi</span>
              </button>
              <button type="button" className={`sidebar-nav-compact ${props.role === "investor" && props.investorTab === "rebalance" ? "is-active" : ""}`} onClick={() => go("investor", "rebalance")}>
                <Calculator size={15} /><span>Kalkulator &amp; Order Rebalance</span>
              </button>
              <button type="button" className={`sidebar-nav-compact ${props.role === "investor" && props.investorTab === "simulation" ? "is-active" : ""}`} onClick={() => go("investor", "simulation")}>
                <Activity size={15} /><span>Monte Carlo &amp; Stress Test</span>
              </button>
              <button type="button" className={`sidebar-nav-compact ${props.role === "investor" && props.investorTab === "correlation" ? "is-active" : ""}`} onClick={() => go("investor", "correlation")}>
                <Grid size={15} /><span>Matriks Korelasi Aset</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-section">
            <span className="sidebar-label">Wealth Advisor (RM Desk)</span>
            <nav className="sidebar-nav-list">
              <button type="button" className={`sidebar-nav-compact ${props.role === "advisor" ? "is-active" : ""}`} onClick={() => go("advisor")}>
                <Briefcase size={15} /><span>Direktori CRM ({props.totalClients} CIF)</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-section">
            <span className="sidebar-label">Customer Intelligence</span>
            <nav className="sidebar-nav-list">
              <button type="button" className={`sidebar-nav-compact ${props.role === "intelligence" && props.intelligenceTab === "rfm" ? "is-active" : ""}`} onClick={() => go("intelligence", "rfm")}>
                <Users size={15} /><span>Segmentasi RFM &amp; K-Means</span>
              </button>
              <button type="button" className={`sidebar-nav-compact ${props.role === "intelligence" && props.intelligenceTab === "churn" ? "is-active" : ""}`} onClick={() => go("intelligence", "churn")}>
                <AlertTriangle size={15} /><span>Prediksi Churn &amp; Retensi</span>
              </button>
              <button type="button" className={`sidebar-nav-compact ${props.role === "intelligence" && props.intelligenceTab === "campaign" ? "is-active" : ""}`} onClick={() => go("intelligence", "campaign")}>
                <Megaphone size={15} /><span>Kampanye &amp; A/B Test</span>
              </button>
              <button type="button" className={`sidebar-nav-compact ${props.role === "intelligence" && props.intelligenceTab === "loyalty" ? "is-active" : ""}`} onClick={() => go("intelligence", "loyalty")}>
                <Award size={15} /><span>Program Loyalitas &amp; ROI</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-section">
            <span className="sidebar-label">Komite Risiko &amp; Auditor</span>
            <nav className="sidebar-nav-list">
              <button type="button" className={`sidebar-nav-compact ${props.role === "committee" ? "is-active" : ""}`} onClick={() => go("committee")}>
                <ShieldCheck size={15} /><span>Guardrails, Pasar &amp; SLSQP</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-section">
            <span className="sidebar-label">Konteks Nasabah Aktif</span>
            <div className="sidebar-active-client">
              <div className="sidebar-client-top">
                <span className="mono">{props.persona.cif ?? "CIF-1000"}</span>
                <span className="tabular-nums">{props.persona.riskScore.toFixed(1)}/10</span>
              </div>
              <strong>{props.persona.name}</strong>
              <small>{props.persona.label}</small>
              <select
                aria-label="Ganti nasabah aktif"
                className="sidebar-client-select"
                value={props.persona.id}
                onChange={(event) => {
                  const found = props.clients.find((c) => c.id === event.target.value);
                  if (found) props.onSelectClient(found);
                }}
              >
                {props.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.cif ?? c.id)} · {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sidebar-section">
            <label className="sidebar-toggle">
              <div>
                <strong>Filter Syariah (DPS)</strong>
                <small>Hanya instrumen syariah</small>
              </div>
              <input
                type="checkbox"
                checked={props.shariaOnly}
                onChange={(event) => props.onShariaChange(event.target.checked)}
              />
              <span className="switch" aria-hidden="true" />
            </label>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="theme-pill-group" role="group" aria-label="Pilih tema warna">
            <button type="button" className={`theme-pill-btn ${props.theme === "light" ? "is-active" : ""}`} onClick={() => props.onThemeChange("light")}>
              Terang
            </button>
            <button type="button" className={`theme-pill-btn ${props.theme === "cream" ? "is-active" : ""}`} onClick={() => props.onThemeChange("cream")}>
              Cream
            </button>
            <button type="button" className={`theme-pill-btn ${props.theme === "dark" ? "is-active" : ""}`} onClick={() => props.onThemeChange("dark")}>
              Gelap
            </button>
          </div>
          <MethodologyDrawer />
          <div className="sidebar-footer-row">
            <button type="button" className="button-secondary sidebar-action-btn" onClick={props.onReset}>
              <RotateCcw size={14} />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
