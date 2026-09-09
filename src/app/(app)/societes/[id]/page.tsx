import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { totalsOf } from "@/lib/invoices";
import {
  COMPANY_STATUS, INVOICE_STATUS, OPPORTUNITY_STATUS,
  PROJECT_STATUS, QUOTE_STATUS, TICKET_STATUS,
} from "@/lib/business";
import { TEMPLATE_HINTS, TEMPLATE_LABELS } from "@/lib/fne/constants";
import { formatDate, formatRelative, formatXOF } from "@/lib/format";
import {
  Amount, Avatar, Badge, Breadcrumb, Callout, Card, CardHeader, DefRow,
  EmptyState, Icon, LinkButton, PageHeader, StatCard, Td, Th, Tr,
} from "@/components/ui";
import { FneChip } from "@/components/FneSticker";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.company.findUnique({ where: { id }, select: { name: true } });
  return { title: c?.name ?? "Société" };
}

export default async function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("crm.read");
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, accentToken: true, jobTitle: true } },
      contacts: { orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }] },
      opportunities: {
        orderBy: { expectedCloseDate: "asc" },
        include: { owner: { select: { name: true } } },
      },
      quotes: { orderBy: { issueDate: "desc" }, take: 8 },
      invoices: {
        orderBy: { issueDate: "desc" },
        include: { lines: { include: { customTaxes: true } }, customTaxes: true },
      },
      projects: { orderBy: { endDate: "desc" } },
      tickets: { orderBy: { createdAt: "desc" }, take: 8 },
      activities: {
        orderBy: { dueAt: "desc" },
        take: 10,
        include: { owner: { select: { name: true, accentToken: true } } },
      },
    },
  });
  if (!company) notFound();

  const billed = company.invoices
    .filter((i) => i.status !== "BROUILLON" && i.status !== "ANNULEE")
    .reduce((s, i) => s + totalsOf(i as never).total, 0);
  const collected = company.invoices.reduce((s, i) => s + i.paidAmount, 0);
  const openOpps = company.opportunities.filter(
    (o) => o.stage !== "GAGNE" && o.stage !== "PERDU",
  );
  const openTickets = company.tickets.filter(
    (t) => t.status !== "RESOLU" && t.status !== "CLOS",
  );

  const missingNcc = company.fneTemplate === "B2B" && !company.ncc;

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb items={[{ label: "Sociétés", href: "/societes" }, { label: company.name }]} />
        }
        title={company.name}
        subtitle={company.legalName ?? undefined}
        action={
          <>
            {company.website && (
              <LinkButton href={company.website} target="_blank" variant="secondary" icon="external">
                Site web
              </LinkButton>
            )}
            <LinkButton href={`/contacts?societe=${company.id}`} variant="secondary" icon="users">
              Contacts
            </LinkButton>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={COMPANY_STATUS[company.status].tone} dot>
          {COMPANY_STATUS[company.status].label}
        </Badge>
        <Badge tone="neutral">{company.industry}</Badge>
        <Badge tone="neutral">{company.size}</Badge>
        <Badge tone="neutral">{TEMPLATE_LABELS[company.fneTemplate]}</Badge>
        {company.tags.map((t) => (
          <Badge key={t} tone="brand">{t}</Badge>
        ))}
      </div>

      {missingNcc && (
        <div className="mb-6">
          <Callout tone="danger" icon="warning" title="NCC manquant">
            Cette société est déclarée en régime B2B mais n&apos;a pas de numéro de compte
            contribuable. La plateforme FNE refusera toute certification de facture à son
            nom tant que le NCC n&apos;est pas renseigné.
          </Callout>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Facturé" value={formatXOF(billed, { compact: true })} icon="invoice" tone="brand" />
        <StatCard
          label="Encaissé" value={formatXOF(collected, { compact: true })}
          hint={billed > 0 ? `${Math.round((collected / billed) * 100)} % du facturé` : undefined}
          icon="check" tone="success"
        />
        <StatCard
          label="Affaires ouvertes" value={String(openOpps.length)}
          hint={formatXOF(openOpps.reduce((s, o) => s + o.amount, 0), { compact: true })}
          icon="target" tone="violet"
        />
        <StatCard
          label="Tickets ouverts" value={String(openTickets.length)}
          icon="lifebuoy" tone={openTickets.length > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Opportunités */}
          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader title="Pipeline" subtitle={`${company.opportunities.length} affaire(s)`} icon="target" />
            </div>
            {company.opportunities.length === 0 ? (
              <EmptyState icon="target" title="Aucune affaire" />
            ) : (
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full min-w-[600px] border-collapse text-base">
                  <thead>
                    <tr>
                      <Th>Affaire</Th>
                      <Th>Étape</Th>
                      <Th>Échéance</Th>
                      <Th align="right">Montant</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.opportunities.map((o) => (
                      <Tr key={o.id}>
                        <Td>
                          <span className="block font-medium text-ink">{o.title}</span>
                          <span className="mt-0.5 block font-mono text-xs text-ink-4">{o.reference}</span>
                        </Td>
                        <Td>
                          <Badge tone={OPPORTUNITY_STATUS[o.stage].tone} dot>
                            {OPPORTUNITY_STATUS[o.stage].label}
                          </Badge>
                        </Td>
                        <Td className="text-sm text-ink-3">{formatDate(o.expectedCloseDate)}</Td>
                        <Td align="right"><Amount value={o.amount} compact /></Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Factures */}
          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader
                title="Factures"
                subtitle="Règlement et certification FNE"
                icon="invoice"
                action={
                  <LinkButton href={`/factures?q=${encodeURIComponent(company.name)}`} variant="ghost" size="sm">
                    Toutes
                  </LinkButton>
                }
              />
            </div>
            {company.invoices.length === 0 ? (
              <EmptyState icon="invoice" title="Aucune facture" />
            ) : (
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full min-w-[640px] border-collapse text-base">
                  <thead>
                    <tr>
                      <Th>Numéro</Th>
                      <Th>Émission</Th>
                      <Th align="right">Total TTC</Th>
                      <Th>Règlement</Th>
                      <Th>FNE</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.invoices.slice(0, 8).map((inv) => (
                      <Tr key={inv.id} href={`/factures/${inv.id}`}>
                        <Td>
                          <Link href={`/factures/${inv.id}`} className="font-mono text-sm font-medium text-ink hover:text-brand">
                            {inv.number}
                          </Link>
                        </Td>
                        <Td className="text-sm text-ink-3">{formatDate(inv.issueDate)}</Td>
                        <Td align="right"><Amount value={totalsOf(inv as never).total} /></Td>
                        <Td>
                          <Badge tone={INVOICE_STATUS[inv.status].tone} dot>
                            {INVOICE_STATUS[inv.status].label}
                          </Badge>
                        </Td>
                        <Td>
                          {inv.fneReference ? (
                            <FneChip reference={inv.fneReference} />
                          ) : (
                            <span className="text-xs text-ink-4">—</span>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Projets et tickets */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Card padded={false}>
              <div className="p-5 pb-4">
                <CardHeader title="Projets" icon="folder" />
              </div>
              {company.projects.length === 0 ? (
                <EmptyState icon="folder" title="Aucun projet" />
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {company.projects.map((p) => (
                    <li key={p.id}>
                      <Link href={`/projets/${p.id}`} className="block px-5 py-3 transition-colors hover:bg-surface-2">
                        <span className="block text-base font-medium text-ink">{p.name}</span>
                        <span className="mt-1 flex items-center gap-2">
                          <Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge>
                          <span className="font-mono text-xs tabular-nums text-ink-4">{p.progress} %</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card padded={false}>
              <div className="p-5 pb-4">
                <CardHeader title="Tickets" icon="lifebuoy" />
              </div>
              {company.tickets.length === 0 ? (
                <EmptyState icon="check" title="Aucun ticket" />
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {company.tickets.map((t) => (
                    <li key={t.id}>
                      <Link href={`/tickets/${t.id}`} className="block px-5 py-3 transition-colors hover:bg-surface-2">
                        <span className="block truncate text-base text-ink">{t.subject}</span>
                        <span className="mt-1 flex items-center gap-2">
                          <Badge tone={TICKET_STATUS[t.status].tone} dot>
                            {TICKET_STATUS[t.status].label}
                          </Badge>
                          <span className="text-xs text-ink-4">{formatRelative(t.createdAt)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Identification" icon="building" />
            <dl className="text-base">
              <DefRow label="NCC" mono>{company.ncc ?? "Non renseigné"}</DefRow>
              <DefRow label="RCCM" mono>{company.rccm ?? "—"}</DefRow>
              <DefRow label="Régime FNE">{company.fneTemplate}</DefRow>
              <DefRow label="Adresse">{company.addressLine ?? "—"}</DefRow>
              <DefRow label="Ville">{company.city}, {company.country}</DefRow>
              {company.phone && <DefRow label="Téléphone" mono>{company.phone}</DefRow>}
              {company.email && <DefRow label="E-mail">{company.email}</DefRow>}
              <DefRow label="Origine">{company.source ?? "—"}</DefRow>
            </dl>
            <p className="mt-3 rounded border border-line bg-surface-2/60 p-2.5 text-xs leading-relaxed text-ink-3">
              <Icon name="info" size={12} className="mr-1 inline align-[-2px]" />
              {TEMPLATE_HINTS[company.fneTemplate]}
            </p>
          </Card>

          <Card>
            <CardHeader title="Responsable de compte" icon="users" />
            {company.owner ? (
              <div className="flex items-center gap-3">
                <Avatar name={company.owner.name} accent={company.owner.accentToken} size={38} />
                <div>
                  <p className="font-medium text-ink">{company.owner.name}</p>
                  <p className="text-sm text-ink-3">{company.owner.jobTitle ?? "—"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-3">Aucun responsable attribué.</p>
            )}
          </Card>

          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader title="Contacts" subtitle={`${company.contacts.length} interlocuteur(s)`} icon="users" />
            </div>
            {company.contacts.length === 0 ? (
              <EmptyState icon="users" title="Aucun contact" />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {company.contacts.map((c) => (
                  <li key={c.id} className="flex items-start gap-2.5 px-5 py-3">
                    <Avatar name={`${c.firstName} ${c.lastName}`} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-base font-medium text-ink">
                        {c.firstName} {c.lastName}
                        {c.isPrimary && <Icon name="check" size={12} className="text-brand" />}
                      </p>
                      <p className="truncate text-sm text-ink-3">{c.jobTitle ?? "—"}</p>
                      <a href={`mailto:${c.email}`} className="truncate text-xs text-brand hover:underline">
                        {c.email}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader title="Dernières interactions" icon="calendar" />
            </div>
            {company.activities.length === 0 ? (
              <EmptyState icon="calendar" title="Aucune interaction" />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {company.activities.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <p className="text-base text-ink">{a.subject}</p>
                    <p className="mt-0.5 text-xs text-ink-4">
                      {a.type.toLowerCase()} · {a.owner?.name ?? "—"} · {formatRelative(a.dueAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {company.quotes.length > 0 && (
            <Card padded={false}>
              <div className="p-5 pb-4">
                <CardHeader title="Devis" icon="quote" />
              </div>
              <ul className="divide-y divide-line border-t border-line">
                {company.quotes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/devis/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block font-mono text-sm text-ink">{q.number}</span>
                        <span className="block truncate text-xs text-ink-4">{q.title}</span>
                      </span>
                      <Badge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
