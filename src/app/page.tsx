import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatXOF } from "@/lib/format";
import { totalsOf } from "@/lib/invoices";
import { Icon } from "@/components/ui/Icon";
import { FneSticker } from "@/components/FneSticker";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

export const dynamic = "force-dynamic";

const ICONS = {
  "expertise-ingenierie": "code",
  "expertise-conformite": "seal",
  "expertise-infogerance": "cloud",
  "expertise-cybersecurite": "shield",
} as const;

export default async function HomePage() {
  const [expertises, org, certifiedCount, clientCount, lastCertified] = await Promise.all([
    prisma.contentPage.findMany({
      where: { section: "expertise", published: true },
      orderBy: { position: "asc" },
    }),
    prisma.organization.findUnique({ where: { id: "org" } }),
    prisma.invoice.count({ where: { fneStatus: { in: ["CERTIFIEE", "AVOIR_EMIS"] } } }),
    prisma.company.count({ where: { status: { in: ["CLIENT", "PARTENAIRE"] } } }),
    prisma.invoice.findFirst({
      where: { fneReference: { not: null } },
      orderBy: { fneCertifiedAt: "desc" },
      include: { lines: { include: { customTaxes: true } }, customTaxes: true },
    }),
  ]);

  const references = await prisma.company.findMany({
    where: { status: { in: ["CLIENT", "PARTENAIRE"] } },
    orderBy: { tier: "asc" },
    take: 8,
    select: { id: true, name: true, industry: true },
  });

  return (
    <>
      <PublicHeader />

      <main>
        {/* ── Héros ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-line">
          {/* Voile unique autorisé par la fiche de design */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(1100px 500px at 78% -8%, var(--brand-soft) 0%, transparent 62%)",
            }}
          />
          <div className="relative mx-auto grid max-w-content items-center gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold-2/30 bg-gold-soft px-3 py-1 text-xs font-medium text-gold">
                <Icon name="seal" size={13} />
                Interfaçage API certifié — plateforme FNE de la DGI
              </span>

              <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] text-ink sm:text-5xl">
                Vos factures en règle.
                <br />
                <span className="text-brand">Vos systèmes en marche.</span>
              </h1>

              <p className="mt-5 max-w-prose text-md leading-relaxed text-ink-2">
                Markel Technology conçoit, intègre et exploite les systèmes d&apos;information
                des banques, opérateurs et institutions de Côte d&apos;Ivoire — et met votre
                chaîne de facturation en conformité avec la facture normalisée électronique.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/connexion"
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-brand bg-brand px-5 text-md font-medium text-white transition-colors hover:bg-brand-2"
                >
                  Accéder à la plateforme
                  <Icon name="arrowRight" size={17} />
                </Link>
                <Link
                  href="#fne"
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-line-2 bg-surface px-5 text-md font-medium text-ink transition-colors hover:bg-surface-2"
                >
                  Comprendre la FNE
                </Link>
              </div>

              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-7">
                {[
                  { k: "Factures certifiées", v: String(certifiedCount) },
                  { k: "Clients accompagnés", v: String(clientCount) },
                  { k: "Depuis", v: "2018" },
                ].map((s) => (
                  <div key={s.k}>
                    <dd className="font-display text-2xl font-semibold tabular-nums text-ink">{s.v}</dd>
                    <dt className="mt-1 text-sm text-ink-3">{s.k}</dt>
                  </div>
                ))}
              </dl>
            </div>

            {/* Aperçu produit : une vraie facture certifiée, tirée de la base */}
            <div className="rise lg:pl-4">
              <div className="rounded-lg border border-line bg-surface p-5 shadow-3">
                <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <p className="eyebrow">Facture</p>
                    <p className="mt-1 font-mono text-md font-semibold tabular-nums text-ink">
                      {lastCertified?.number ?? "MT-F-2026-0001"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded border border-success/15 bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                    <Icon name="check" size={12} />
                    Certifiée
                  </span>
                </div>

                <dl className="py-4 text-base">
                  <div className="flex justify-between border-b border-line py-2">
                    <dt className="text-ink-3">Client</dt>
                    <dd className="max-w-[58%] truncate text-right text-ink">
                      {lastCertified?.clientCompanyName ?? "NSIA BANQUE CÔTE D'IVOIRE SA"}
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-line py-2">
                    <dt className="text-ink-3">Régime</dt>
                    <dd className="text-ink">TVA 18 % — {lastCertified?.fneTemplate ?? "B2B"}</dd>
                  </div>
                  <div className="flex items-baseline justify-between py-2">
                    <dt className="text-ink-3">Total TTC</dt>
                    <dd className="font-mono text-lg font-semibold tabular-nums text-ink">
                      {lastCertified ? formatXOF(totalsOf(lastCertified as never).total) : "—"}
                    </dd>
                  </div>
                </dl>

                {lastCertified?.fneReference && lastCertified.fneVerificationUrl && (
                  <FneSticker
                    reference={lastCertified.fneReference}
                    verificationUrl={lastCertified.fneVerificationUrl}
                    ncc={org?.ncc ?? "2418562M"}
                    certifiedAt={lastCertified.fneCertifiedAt}
                  />
                )}
              </div>

              <p className="mt-3 text-center text-xs text-ink-4">
                Sticker électronique réel, généré par la plateforme — QR code vérifiable.
              </p>
            </div>
          </div>
        </section>

        {/* ── Expertises ────────────────────────────────────────── */}
        <section id="expertises" className="border-b border-line">
          <div className="mx-auto max-w-content px-4 py-16 sm:px-8 lg:py-20">
            <div className="max-w-prose">
              <p className="eyebrow">Ce que nous faisons</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-ink">
                Quatre métiers, un seul interlocuteur
              </h2>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {expertises.map((e) => (
                <article
                  key={e.id}
                  className="flex flex-col rounded-md border border-line bg-surface p-6 transition-colors duration-200 hover:border-line-2"
                >
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-brand/15 bg-brand-soft text-brand">
                    <Icon name={(ICONS[e.slug as keyof typeof ICONS] ?? "box") as never} size={19} />
                  </span>
                  <h3 className="font-display text-lg font-semibold text-ink">{e.title}</h3>
                  {e.subtitle && <p className="mt-1 text-sm font-medium text-brand">{e.subtitle}</p>}
                  <p className="mt-3 text-base leading-relaxed text-ink-3">{e.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Conformité FNE ────────────────────────────────────── */}
        <section id="fne" className="border-b border-line bg-surface">
          <div className="mx-auto max-w-content px-4 py-16 sm:px-8 lg:py-20">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="eyebrow text-gold">Obligation légale — loi de finances 2025</p>
                <h2 className="mt-3 font-display text-3xl font-semibold text-ink">
                  La facture normalisée électronique, sans rupture dans vos processus
                </h2>
                <p className="mt-5 text-md leading-relaxed text-ink-2">
                  Les articles 384 et suivants du Code général des impôts imposent désormais
                  la délivrance d&apos;une facture normalisée électronique. Plutôt que de
                  ressaisir vos factures sur le portail de la DGI, nous interfaçons votre
                  système existant à la plateforme FNE par API.
                </p>

                <ul className="mt-7 space-y-3.5">
                  {[
                    "Certification des factures de vente, des avoirs et des bordereaux d'achat de produits agricoles.",
                    "Gestion des quatre régimes de TVA : normal 18 %, réduit 9 %, exonérations conventionnelle et légale.",
                    "Taxes spécifiques prises en charge à la ligne comme au pied de facture : AIRSI, GRA, DTD.",
                    "Suivi du stock de stickers électroniques et alerte avant rupture.",
                    "Journal intégral des échanges avec la DGI, exploitable en cas de contrôle.",
                  ].map((t) => (
                    <li key={t} className="flex gap-3 text-base leading-relaxed text-ink-2">
                      <Icon name="check" size={16} className="mt-1 shrink-0 text-gold" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="rounded-lg border border-gold-2/30 bg-gold-soft/50 p-6">
                  <p className="eyebrow text-gold">La signature électronique en trois éléments</p>
                  <p className="mt-2 text-base text-ink-2">
                    La DGI impose que chaque facture certifiée porte trois marques
                    indissociables. Les voici, telles que la plateforme les appose :
                  </p>

                  <ol className="mt-6 space-y-5">
                    {[
                      { n: "1", t: "Le QR Code", d: "Il renvoie à la page de vérification publique de la DGI. N'importe qui peut contrôler l'authenticité de la facture en le scannant." },
                      { n: "2", t: "Le visuel FNE", d: "La mention « Facture normalisée électronique » et la référence à la Direction Générale des Impôts." },
                      { n: "3", t: "Le format de numérotation", d: "Une série annuelle ininterrompue, préfixée du NCC de l'émetteur, délivrée par la plateforme et jamais par nous." },
                    ].map((s) => (
                      <li key={s.n} className="flex gap-4">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-2/40 bg-surface font-mono text-xs font-semibold text-gold">
                          {s.n}
                        </span>
                        <div>
                          <p className="font-medium text-ink">{s.t}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-ink-3">{s.d}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-5 rounded-md border border-line bg-surface p-5">
                  <p className="text-sm text-ink-3">
                    <Icon name="info" size={14} className="mr-1.5 inline align-[-2px] text-ink-4" />
                    Vous avez reçu une facture de Markel Technology ?{" "}
                    <Link href="/verification" className="font-medium text-brand hover:underline">
                      Vérifiez son authenticité
                    </Link>{" "}
                    à partir de son code de vérification.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Références ────────────────────────────────────────── */}
        <section id="references" className="border-b border-line">
          <div className="mx-auto max-w-content px-4 py-16 sm:px-8">
            <p className="eyebrow">Ils nous font confiance</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink">
              Des systèmes critiques, tenus au quotidien
            </h2>

            <div className="mt-9 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {references.map((r) => (
                <div key={r.id} className="bg-surface p-5">
                  <p className="font-display text-md font-semibold text-ink">{r.name}</p>
                  <p className="mt-1 text-sm text-ink-3">{r.industry}</p>
                </div>
              ))}
            </div>

            <figure className="mt-10 max-w-prose">
              <blockquote className="font-display text-xl leading-relaxed text-ink">
                « Nous avons basculé toute notre chaîne de facturation sur la plateforme FNE
                en six semaines, sans interrompre un seul jour l&apos;activité de nos
                soixante-quatre points de vente. »
              </blockquote>
              <figcaption className="mt-4 text-base text-ink-3">
                Jean-Claude Beugré — Directeur Informatique, Prosuma
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── Appel à l'action ──────────────────────────────────── */}
        <section className="bg-brand-2">
          <div className="mx-auto flex max-w-content flex-col items-start gap-8 px-4 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl font-semibold text-white">
                Parlons de votre chaîne de facturation
              </h2>
              <p className="mt-3 text-md leading-relaxed text-white/70">
                Un échange de trente minutes suffit pour situer votre niveau de conformité
                et chiffrer l&apos;interfaçage. Nos équipes interviennent depuis Abidjan.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={`mailto:${org?.email ?? ""}`}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-md font-medium text-brand-2 transition-colors hover:bg-white/90"
              >
                <Icon name="mail" size={17} />
                Nous écrire
              </a>
              <a
                href={`tel:${(org?.phone ?? "").replace(/\s/g, "")}`}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-white/25 px-5 text-md font-medium text-white transition-colors hover:bg-white/10"
              >
                <Icon name="phone" size={17} />
                {org?.phone ?? ""}
              </a>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
