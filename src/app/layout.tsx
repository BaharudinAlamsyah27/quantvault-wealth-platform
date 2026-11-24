import type { Metadata } from "next";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuantVault — Private Wealth, Robo-Advisor & Customer Intelligence",
  description:
    "Platform terpadu optimasi portofolio kuantitatif Markowitz (Dual-Engine TS & Python SLSQP), CRM Wealth Advisor, RFM K-Means, prediksi churn, uji A/B kampanye, dan tata kelola Komite Risiko & DPS Syariah.",
  applicationName: "QuantVault",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" data-theme="cream"><body>{children}</body></html>;
}
