import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatXOF, initials } from "@/lib/format";
import type { Tone } from "@/lib/business";
import { Icon, type IconName } from "./Icon";

/* ─────────────────────────────── Tonalités ─────────────────────────
   Les classes sont écrites en toutes lettres : Tailwind ne peut pas
   résoudre une classe construite dynamiquement.                       */

const BADGE_TONE: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand border-brand/15",
  gold: "bg-gold-soft text-gold border-gold/25",
  success: "bg-success-soft text-success border-success/15",
  warning: "bg-warning-soft text-warning border-warning/15",
  danger: "bg-danger-soft text-danger border-danger/15",
  violet: "bg-violet-soft text-violet border-violet/15",
  teal: "bg-teal-soft text-teal border-teal/15",
  neutral: "bg-surface-2 text-ink-3 border-line-2",
};

const DOT_TONE: Record<Tone, string> = {
  brand: "bg-brand", gold: "bg-gold-2", success: "bg-success",
  warning: "bg-warning", danger: "bg-danger", violet: "bg-violet",
  teal: "bg-teal", neutral: "bg-ink-4",
};

export function Badge({
  children, tone = "neutral", dot = false, className,
}: { children: ReactNode; tone?: Tone; dot?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium",
        BADGE_TONE[tone], className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_TONE[tone])} />}
      {children}
    </span>
  );
}

export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", DOT_TONE[tone])} />;
}

/* ──────────────────────────────── Boutons ───────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white border-brand hover:bg-brand-2 hover:border-brand-2",
  secondary: "bg-surface text-ink border-line-2 hover:bg-surface-2 hover:border-ink-4",
  ghost: "bg-transparent text-ink-2 border-transparent hover:bg-surface-2 hover:text-ink",
  danger: "bg-surface text-danger border-danger/30 hover:bg-danger-soft",
  gold: "bg-gold text-white border-gold hover:brightness-110",
};

const BUTTON_SIZE = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-3.5 text-base gap-2",
  lg: "h-11 px-5 text-md gap-2",
} as const;

const buttonClass = (
  variant: ButtonVariant = "primary",
  size: keyof typeof BUTTON_SIZE = "md",
  className?: string,
) =>
  cn(
    "inline-flex items-center justify-center rounded-md border font-medium",
    "transition-[background-color,border-color,color,opacity] duration-150 ease-out",
    "disabled:cursor-not-allowed disabled:opacity-50",
    BUTTON_VARIANT[variant], BUTTON_SIZE[size], className,
  );

export function Button({
  children, variant = "primary", size = "md", icon, className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; size?: keyof typeof BUTTON_SIZE; icon?: IconName;
}) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}

export function LinkButton({
  children, href, variant = "primary", size = "md", icon, className, target,
}: {
  children: ReactNode; href: string; variant?: ButtonVariant;
  size?: keyof typeof BUTTON_SIZE; icon?: IconName; className?: string; target?: string;
}) {
  return (
    <Link
      href={href} target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className={buttonClass(variant, size, className)}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
    </Link>
  );
}

/* ───────────────────────────────── Cartes ───────────────────────── */

export function Card({
  children, className, padded = true,
}: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("card", padded && "p-5", className)}>{children}</section>
  );
}

export function CardHeader({
  title, subtitle, action, icon,
}: { title: string; subtitle?: string; action?: ReactNode; icon?: IconName }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-md font-semibold text-ink">
          {icon && <Icon name={icon} size={17} className="text-ink-3" />}
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/* ───────────────────────────── Montants XOF ─────────────────────── */

export function Amount({
  value, className, compact, tone, sign,
}: {
  value: number; className?: string; compact?: boolean;
  tone?: "default" | "muted" | "success" | "danger"; sign?: boolean;
}) {
  const toneClass = {
    default: "text-ink", muted: "text-ink-3",
    success: "text-success", danger: "text-danger",
  }[tone ?? "default"];
  return (
    <span className={cn("font-mono tabular-nums", toneClass, className)}>
      {sign && value > 0 ? "+" : ""}
      {formatXOF(value, { compact })}
    </span>
  );
}

/* ───────────────────────────────── Avatar ───────────────────────── */

const AVATAR_TONE: Record<string, string> = {
  brand: "bg-brand-soft text-brand",
  violet: "bg-violet-soft text-violet",
  teal: "bg-teal-soft text-teal",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Avatar({
  name, accent = "brand", size = 32, className,
}: { name: string; accent?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        AVATAR_TONE[accent] ?? AVATAR_TONE.brand, className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

/* ──────────────────────────── En-tête de page ───────────────────── */

export function PageHeader({
  title, subtitle, action, breadcrumb,
}: { title: string; subtitle?: string; action?: ReactNode; breadcrumb?: ReactNode }) {
  return (
    <header className="mb-6">
      {breadcrumb}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 max-w-prose text-base text-ink-3">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
      </div>
    </header>
  );
}

/* ─────────────────────────────── État vide ──────────────────────── */

export function EmptyState({
  icon = "list", title, description, action,
}: { icon?: IconName; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-surface-2 text-ink-4">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-md font-medium text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-base text-ink-3">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ─────────────────────────── Barre de progression ───────────────── */

const BAR_TONE: Record<Tone, string> = {
  brand: "bg-brand", gold: "bg-gold-2", success: "bg-success",
  warning: "bg-warning", danger: "bg-danger", violet: "bg-violet",
  teal: "bg-teal", neutral: "bg-ink-4",
};

export function Progress({
  value, tone = "brand", className, height = 6,
}: { value: number; tone?: Tone; className?: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-surface-3", className)}
      style={{ height }}
      role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", BAR_TONE[tone])}
           style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ───────────────────────────────── Tables ───────────────────────── */

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-base">{children}</table>
      </div>
    </div>
  );
}

export function Th({
  children, align = "left", className,
}: { children?: ReactNode; align?: "left" | "right" | "center"; className?: string }) {
  return (
    <th
      className={cn(
        "eyebrow border-b border-line bg-surface-2 px-4 py-2.5 font-semibold",
        align === "right" && "text-right", align === "center" && "text-center",
        className,
      )}
      scope="col"
    >
      {children}
    </th>
  );
}

export function Td({
  children, align = "left", className,
}: { children?: ReactNode; align?: "left" | "right" | "center"; className?: string }) {
  return (
    <td
      className={cn(
        "border-b border-line px-4 py-3 align-middle text-ink-2",
        align === "right" && "text-right", align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children, href, className,
}: { children: ReactNode; href?: string; className?: string }) {
  return (
    <tr
      className={cn(
        "transition-colors duration-100 last:[&>td]:border-0",
        href && "cursor-pointer hover:bg-surface-2", className,
      )}
    >
      {children}
    </tr>
  );
}

/** Cellule dont tout le contenu est cliquable — évite les liens imbriqués. */
export function LinkCell({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="block font-medium text-ink hover:text-brand">
      {children}
    </Link>
  );
}

/* ─────────────────────────────── Champs ─────────────────────────── */

export function Label({
  children, htmlFor, hint, required,
}: { children: ReactNode; htmlFor?: string; hint?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block">
      <span className="text-sm font-medium text-ink-2">
        {children}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {hint && <span className="mt-0.5 block text-xs font-normal text-ink-4">{hint}</span>}
    </label>
  );
}

export function Field({
  label, hint, required, children, className,
}: { label?: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <Label hint={hint} required={required}>{label}</Label>}
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("field", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("field resize-y", props.className)} />;
}

export function Select({
  children, ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props} className={cn("field appearance-none pr-8", props.className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B655C' stroke-width='1.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        backgroundSize: "16px",
      }}
    >
      {children}
    </select>
  );
}

/* ────────────────────────────── Messages ────────────────────────── */

export function Callout({
  tone = "brand", title, children, icon,
}: { tone?: Tone; title?: string; children: ReactNode; icon?: IconName }) {
  return (
    <div className={cn("rounded-md border px-4 py-3 text-base", BADGE_TONE[tone])}>
      <div className="flex gap-2.5">
        {icon && <Icon name={icon} size={17} className="mt-0.5 shrink-0" />}
        <div className="min-w-0">
          {title && <p className="font-semibold">{title}</p>}
          <div className={cn(title && "mt-1", "leading-relaxed")}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Statistique de tête ──────────────────── */

export function StatCard({
  label, value, delta, hint, tone = "brand", icon, href,
}: {
  label: string; value: ReactNode; delta?: number; hint?: string;
  tone?: Tone; icon?: IconName; href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {icon && (
          <span className={cn("flex h-7 w-7 items-center justify-center rounded border", BADGE_TONE[tone])}>
            <Icon name={icon} size={15} />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              delta >= 0 ? "text-success" : "text-danger",
            )}
          >
            <Icon name={delta >= 0 ? "arrowUp" : "arrowDown"} size={12} />
            {Math.abs(delta).toFixed(1).replace(".0", "")} %
          </span>
        )}
        {hint && <span className="truncate text-xs text-ink-3">{hint}</span>}
      </div>
    </>
  );

  return href ? (
    <Link href={href} className="card block p-5 transition-colors duration-150 hover:border-line-2 hover:bg-surface-2/40">
      {body}
    </Link>
  ) : (
    <div className="card p-5">{body}</div>
  );
}

/* ─────────────────────────── Fil d'Ariane ───────────────────────── */

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-2 flex flex-wrap items-center gap-1 text-xs text-ink-3">
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <Icon name="chevronRight" size={12} className="text-ink-4" />}
          {it.href ? (
            <Link href={it.href} className="hover:text-brand">{it.label}</Link>
          ) : (
            <span className="text-ink-2">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ─────────────────── Ligne clé/valeur d'une fiche ───────────────── */

export function DefRow({
  label, children, mono,
}: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
      <dt className="shrink-0 text-sm text-ink-3">{label}</dt>
      <dd className={cn("min-w-0 text-right text-base text-ink", mono && "font-mono tabular-nums text-sm")}>
        {children}
      </dd>
    </div>
  );
}

export { Icon };
export type { IconName };
