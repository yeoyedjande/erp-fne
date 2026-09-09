/** Formatage — le franc CFA n'a pas de décimale, et les chiffres s'alignent. */

const NBSP = " "; // espace fine insécable

export function formatXOF(amount: number, opts?: { compact?: boolean; symbol?: boolean }) {
  const n = Math.round(amount || 0);
  if (opts?.compact) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".0", "")} Md`;
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(".0", "")} M`;
    if (abs >= 1_000) return `${Math.round(n / 1_000)} k`;
    return String(n);
  }
  const body = n.toLocaleString("fr-FR").replace(/ |\s/g, NBSP);
  return opts?.symbol === false ? body : `${body}${NBSP}F`;
}

export function formatNumber(n: number, digits = 0) {
  return (n ?? 0).toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(n: number, digits = 0) {
  return `${formatNumber(n ?? 0, digits)}${NBSP}%`;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const dateLongFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export const formatDate = (d: Date | string | null | undefined) =>
  d ? dateFmt.format(new Date(d)) : "—";
export const formatDateLong = (d: Date | string | null | undefined) =>
  d ? dateLongFmt.format(new Date(d)) : "—";
export const formatDateTime = (d: Date | string | null | undefined) =>
  d ? dateTimeFmt.format(new Date(d)) : "—";

export function formatRelative(d: Date | string | null | undefined) {
  if (!d) return "—";
  const then = new Date(d).getTime();
  const diff = then - Date.now();
  const abs = Math.abs(diff);
  const min = 60_000, hour = 3_600_000, day = 86_400_000;
  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
  if (abs < hour) return rtf.format(Math.round(diff / min), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  if (abs < day * 30) return rtf.format(Math.round(diff / day), "day");
  if (abs < day * 365) return rtf.format(Math.round(diff / (day * 30)), "month");
  return rtf.format(Math.round(diff / (day * 365)), "year");
}

export function daysBetween(a: Date | string, b: Date | string = new Date()) {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** « Développement d'une application » → « developpement-d-une-application » */
export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Découpe une référence FNE pour la rendre lisible : 9606123E 25 000000019 */
export function formatFneReference(ref: string | null | undefined) {
  if (!ref) return "—";
  const m = ref.match(/^(A?)([A-Z0-9]{8})(\d{2})(\d+)$/);
  if (!m) return ref;
  return `${m[1]}${m[2]}${NBSP}${m[3]}${NBSP}${m[4]}`;
}
