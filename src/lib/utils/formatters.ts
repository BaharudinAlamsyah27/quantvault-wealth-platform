const idrFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const compactIdrFormatter = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });
const percentFormatter = new Intl.NumberFormat("id-ID", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatIdr(value: number): string {
  return idrFormatter.format(Number.isFinite(value) ? value : 0).replace("IDR", "Rp").replace(/\s+/g, " ");
}

export function formatCompactIdr(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  if (Math.abs(safeValue) >= 1_000_000_000) return `Rp ${compactIdrFormatter.format(safeValue / 1_000_000_000)} M`;
  if (Math.abs(safeValue) >= 1_000_000) return `Rp ${compactIdrFormatter.format(safeValue / 1_000_000)} Jt`;
  return formatIdr(safeValue);
}

export function formatPercent(value: number, fraction = true): string {
  return percentFormatter.format(Number.isFinite(value) ? (fraction ? value : value / 100) : 0);
}

export function formatRatio(value: number): string {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}

export function formatSignedIdr(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatIdr(Math.abs(value))}`;
}
