import Link from "next/link";
import { Icon } from "./ui/Icon";

export function Wordmark({ tone = "ink" }: { tone?: "ink" | "invert" }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5">
      <span
        className={
          tone === "invert"
            ? "flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white ring-1 ring-white/20"
            : "flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white"
        }
      >
        <Icon name="code" size={16} strokeWidth={2} />
      </span>
      <span className="leading-tight">
        <span
          className={
            tone === "invert"
              ? "block font-display text-md font-semibold text-white"
              : "block font-display text-md font-semibold text-ink"
          }
        >
          Markel
        </span>
        <span
          className={
            tone === "invert"
              ? "block text-2xs uppercase tracking-[0.14em] text-white/60"
              : "block text-2xs uppercase tracking-[0.14em] text-ink-4"
          }
        >
          Technology
        </span>
      </span>
    </Link>
  );
}

export function PublicHeader() {
  const links = [
    { href: "/#expertises", label: "Expertises" },
    { href: "/#fne", label: "Conformité FNE" },
    { href: "/#references", label: "Références" },
    { href: "/#contact", label: "Contact" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-6 px-4 sm:px-8">
        <Wordmark />
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-base text-ink-2 transition-colors hover:text-brand">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/portail"
            className="hidden h-9 items-center rounded-md border border-line-2 px-3.5 text-base font-medium text-ink transition-colors hover:bg-surface-2 sm:inline-flex"
          >
            Espace client
          </Link>
          <Link
            href="/connexion"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-brand bg-brand px-3.5 text-base font-medium text-white transition-colors hover:bg-brand-2"
          >
            <Icon name="lock" size={14} />
            Connexion
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer id="contact" className="border-t border-line bg-surface">
      <div className="mx-auto max-w-content px-4 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-base leading-relaxed text-ink-3">
              Ingénierie logicielle, intégration et conformité fiscale électronique
              pour les entreprises et institutions ivoiriennes.
            </p>
          </div>

          <div>
            <p className="eyebrow mb-3">Expertises</p>
            <ul className="space-y-2 text-base text-ink-3">
              <li>Ingénierie logicielle</li>
              <li>Conformité FNE</li>
              <li>Infogérance & cloud</li>
              <li>Cybersécurité</li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3">Plateforme</p>
            <ul className="space-y-2 text-base text-ink-3">
              <li><Link href="/connexion" className="hover:text-brand">Connexion</Link></li>
              <li><Link href="/portail" className="hover:text-brand">Espace client</Link></li>
              <li><Link href="/verification" className="hover:text-brand">Vérifier une facture</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3">Nous joindre</p>
            <ul className="space-y-2.5 text-base text-ink-3">
              <li className="flex items-start gap-2">
                <Icon name="pin" size={15} className="mt-0.5 shrink-0 text-ink-4" />
                <span>Immeuble Alpha 2000, 12e étage<br />Rue du Commerce, Plateau — Abidjan</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="phone" size={15} className="shrink-0 text-ink-4" />
                <span className="font-mono text-sm tabular-nums">+225 27 20 31 45 60</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="mail" size={15} className="shrink-0 text-ink-4" />
                <a href="mailto:contact@markel-technology.ci" className="hover:text-brand">
                  contact@markel-technology.ci
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-sm text-ink-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Markel Technology SARL — Tous droits réservés.</p>
          <p className="font-mono text-xs tabular-nums">
            NCC 2418562M · RCCM CI-ABJ-2018-B-14237
          </p>
        </div>
      </div>
    </footer>
  );
}
