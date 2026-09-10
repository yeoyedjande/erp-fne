import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Icon } from "./ui/Icon";
import { Wordmark } from "./Logo";

export { Wordmark };

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

export async function PublicFooter() {
  const org = await prisma.organization.findUnique({ where: { id: "org" } });

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
                <span>
                  {org?.addressLine ?? "—"}
                  <br />
                  {org?.city ?? "Abidjan"}, {org?.country ?? "Côte d'Ivoire"}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="phone" size={15} className="shrink-0 text-ink-4" />
                <span className="font-mono text-sm tabular-nums">{org?.phone ?? ""}</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="mail" size={15} className="shrink-0 text-ink-4" />
                <a href={`mailto:${org?.email ?? ""}`} className="hover:text-brand">
                  {org?.email ?? ""}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-sm text-ink-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {org?.legalName ?? "Markel Technology"} — Tous droits réservés.</p>
          <p className="font-mono text-xs tabular-nums">
            NCC {org?.ncc ?? "—"} · RCCM {org?.rccm ?? "—"}
          </p>
        </div>
      </div>
    </footer>
  );
}
