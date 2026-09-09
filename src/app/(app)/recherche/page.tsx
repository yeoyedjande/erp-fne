import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { totalsOf } from "@/lib/invoices";
import { COMPANY_STATUS, INVOICE_STATUS, TICKET_STATUS } from "@/lib/business";
import { formatDate } from "@/lib/format";
import {
  Amount, Badge, Card, CardHeader, EmptyState, Icon, PageHeader,
} from "@/components/ui";

export const metadata = { title: "Recherche" };
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireCapability("crm.read");
  const { q = "" } = await searchParams;
  const term = q.trim();

  if (term.length < 2) {
    return (
      <>
        <PageHeader title="Recherche" subtitle="Saisissez au moins deux caractères." />
        <Card>
          <EmptyState
            icon="search"
            title="Recherche transverse"
            description="Sociétés, contacts, factures, devis, projets et tickets. La touche « / » place le curseur dans le champ de recherche."
          />
        </Card>
      </>
    );
  }

  const like = { contains: term, mode: "insensitive" as const };

  const [companies, contacts, invoices, quotes, projects, tickets] = await Promise.all([
    prisma.company.findMany({
      where: { OR: [{ name: like }, { legalName: like }, { ncc: like }] },
      take: 8,
    }),
    prisma.contact.findMany({
      where: { OR: [{ firstName: like }, { lastName: like }, { email: like }] },
      include: { company: { select: { id: true, name: true } } },
      take: 8,
    }),
    prisma.invoice.findMany({
      where: { OR: [{ number: like }, { title: like }, { fneReference: like }] },
      include: {
        lines: { include: { customTaxes: true } },
        customTaxes: true,
        company: { select: { name: true } },
      },
      take: 8,
    }),
    prisma.quote.findMany({
      where: { OR: [{ number: like }, { title: like }] },
      include: { company: { select: { name: true } } },
      take: 6,
    }),
    prisma.project.findMany({
      where: { OR: [{ name: like }, { code: like }] },
      include: { company: { select: { name: true } } },
      take: 6,
    }),
    prisma.ticket.findMany({
      where: { OR: [{ number: like }, { subject: like }] },
      include: { company: { select: { name: true } } },
      take: 6,
    }),
  ]);

  const total =
    companies.length + contacts.length + invoices.length +
    quotes.length + projects.length + tickets.length;

  return (
    <>
      <PageHeader
        title={`Résultats pour « ${term} »`}
        subtitle={`${total} correspondance${total > 1 ? "s" : ""} dans la plateforme.`}
      />

      {total === 0 ? (
        <Card>
          <EmptyState
            icon="search"
            title="Aucun résultat"
            description="Aucune société, aucun contact, aucune facture, aucun devis, aucun projet ni aucun ticket ne correspond à cette recherche. Essayez un terme plus court, ou une référence exacte."
          />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {companies.length > 0 && (
            <Card padded={false}>
              <div className="p-5 pb-3"><CardHeader title="Sociétés" icon="building" /></div>
              <ul className="divide-y divide-line border-t border-line">
                {companies.map((c) => (
                  <li key={c.id}>
                    <Link href={`/societes/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{c.name}</span>
                        <span className="block truncate text-xs text-ink-4">
                          {c.industry} · NCC {c.ncc ?? "—"}
                        </span>
                      </span>
                      <Badge tone={COMPANY_STATUS[c.status].tone}>{COMPANY_STATUS[c.status].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {invoices.length > 0 && (
            <Card padded={false}>
              <div className="p-5 pb-3"><CardHeader title="Factures" icon="invoice" /></div>
              <ul className="divide-y divide-line border-t border-line">
                {invoices.map((inv) => (
                  <li key={inv.id}>
                    <Link href={`/factures/${inv.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block font-mono text-sm font-medium text-ink">{inv.number}</span>
                        <span className="block truncate text-xs text-ink-4">
                          {inv.company.name}
                          {inv.fneReference && (
                            <>
                              {" · "}
                              <span className="text-gold">{inv.fneReference}</span>
                            </>
                          )}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Amount value={totalsOf(inv as never).total} compact className="text-sm" />
                        <Badge tone={INVOICE_STATUS[inv.status].tone} dot>
                          {INVOICE_STATUS[inv.status].label}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {contacts.length > 0 && (
            <Card padded={false}>
              <div className="p-5 pb-3"><CardHeader title="Contacts" icon="users" /></div>
              <ul className="divide-y divide-line border-t border-line">
                {contacts.map((c) => (
                  <li key={c.id} className="px-5 py-3">
                    <p className="font-medium text-ink">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-ink-4">
                      {c.jobTitle ?? "—"} ·{" "}
                      <Link href={`/societes/${c.company.id}`} className="hover:text-brand">
                        {c.company.name}
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {quotes.length > 0 && (
            <Card padded={false}>
              <div className="p-5 pb-3"><CardHeader title="Devis" icon="quote" /></div>
              <ul className="divide-y divide-line border-t border-line">
                {quotes.map((qt) => (
                  <li key={qt.id}>
                    <Link href={`/devis/${qt.id}`} className="block px-5 py-3 transition-colors hover:bg-surface-2">
                      <span className="block font-mono text-sm font-medium text-ink">{qt.number}</span>
                      <span className="block truncate text-xs text-ink-4">
                        {qt.title} · {qt.company.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {projects.length > 0 && (
            <Card padded={false}>
              <div className="p-5 pb-3"><CardHeader title="Projets" icon="folder" /></div>
              <ul className="divide-y divide-line border-t border-line">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projets/${p.id}`} className="block px-5 py-3 transition-colors hover:bg-surface-2">
                      <span className="block font-medium text-ink">{p.name}</span>
                      <span className="block text-xs text-ink-4">
                        {p.code} · {p.company.name} · {p.progress} %
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {tickets.length > 0 && (
            <Card padded={false}>
              <div className="p-5 pb-3"><CardHeader title="Tickets" icon="lifebuoy" /></div>
              <ul className="divide-y divide-line border-t border-line">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tickets/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block truncate text-base text-ink">{t.subject}</span>
                        <span className="block text-xs text-ink-4">{t.number} · {t.company.name}</span>
                      </span>
                      <Badge tone={TICKET_STATUS[t.status].tone} dot>{TICKET_STATUS[t.status].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
