import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/auth-guard";
import { totalsOf } from "@/lib/invoices";
import { INVOICE_STATUS, PROJECT_STATUS, TICKET_STATUS } from "@/lib/business";
import { formatDate, formatRelative, formatXOF } from "@/lib/format";
import {
  Amount, Badge, Card, CardHeader, Callout, EmptyState, Icon,
  LinkButton, PageHeader, Progress, StatCard,
} from "@/components/ui";
import { FneChip } from "@/components/FneSticker";

export const metadata = { title: "Espace client" };
export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const user = await requirePortalUser();

  const [company, invoices, tickets, projects, org] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: user.clientCompanyId } }),
    prisma.invoice.findMany({
      // Le portail ne montre jamais un brouillon interne.
      where: { companyId: user.clientCompanyId, status: { notIn: ["BROUILLON", "ANNULEE"] } },
      include: { lines: { include: { customTaxes: true } }, customTaxes: true },
      orderBy: { issueDate: "desc" },
    }),
    prisma.ticket.findMany({
      where: { companyId: user.clientCompanyId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.project.findMany({
      where: { companyId: user.clientCompanyId, status: { notIn: ["ANNULE"] } },
      orderBy: { endDate: "asc" },
    }),
    prisma.organization.findUnique({ where: { id: "org" } }),
  ]);

  const withTotals = invoices.map((i) => ({ inv: i, total: totalsOf(i as never).total }));
  const billed = withTotals.reduce((s, x) => s + x.total, 0);
  const paid = withTotals.reduce((s, x) => s + x.inv.paidAmount, 0);
  const due = billed - paid;
  const overdue = withTotals.filter((x) => x.inv.status === "EN_RETARD");
  const openTickets = tickets.filter((t) => !["RESOLU", "CLOS"].includes(t.status));

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.name.split(" ")[0]}`}
        subtitle={`Voici l'état de votre relation avec Markel Technology, pour ${company.name}.`}
      />

      {overdue.length > 0 && (
        <div className="mb-6">
          <Callout tone="warning" icon="warning" title="Factures échues">
            {overdue.length} facture{overdue.length > 1 ? "s" : ""} a
            {overdue.length > 1 ? "rrivent" : "rrive"} à échéance dépassée, pour un reste
            dû de {formatXOF(overdue.reduce((s, x) => s + (x.total - x.inv.paidAmount), 0))}.
          </Callout>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total facturé" value={formatXOF(billed, { compact: true })} icon="invoice" tone="brand" />
        <StatCard label="Déjà réglé" value={formatXOF(paid, { compact: true })} icon="check" tone="success" />
        <StatCard label="Reste dû" value={formatXOF(due, { compact: true })} icon="clock" tone={due > 0 ? "warning" : "neutral"} />
        <StatCard label="Demandes ouvertes" value={String(openTickets.length)} icon="lifebuoy" tone={openTickets.length ? "violet" : "neutral"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader
              title="Vos dernières factures"
              subtitle="Chaque facture certifiée porte un sticker électronique de la DGI"
              icon="invoice"
              action={<LinkButton href="/portail/factures" variant="ghost" size="sm">Toutes</LinkButton>}
            />
          </div>
          {withTotals.length === 0 ? (
            <EmptyState icon="invoice" title="Aucune facture" description="Vous n'avez encore reçu aucune facture." />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {withTotals.slice(0, 6).map(({ inv, total }) => (
                <li key={inv.id}>
                  <Link href={`/portail/factures/${inv.id}`} className="block px-5 py-3.5 transition-colors hover:bg-surface-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-sm font-medium text-ink">{inv.number}</span>
                      <Amount value={total} className="text-sm" />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge tone={INVOICE_STATUS[inv.status].tone} dot>
                        {INVOICE_STATUS[inv.status].label}
                      </Badge>
                      {inv.fneReference && <FneChip reference={inv.fneReference} />}
                      <span className="text-xs text-ink-4">
                        échéance {formatDate(inv.dueDate)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader title="Vos demandes" icon="lifebuoy" />
            </div>
            {tickets.length === 0 ? (
              <EmptyState icon="check" title="Aucune demande" />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link href={`/portail/tickets/${t.id}`} className="block px-5 py-3 transition-colors hover:bg-surface-2">
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

          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader title="Vos projets" icon="folder" />
            </div>
            {projects.length === 0 ? (
              <EmptyState icon="folder" title="Aucun projet en cours" />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {projects.map((p) => (
                  <li key={p.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-base font-medium text-ink">{p.name}</span>
                      <span className="shrink-0 font-mono text-sm tabular-nums text-ink-2">{p.progress} %</span>
                    </div>
                    <Progress value={p.progress} tone="brand" className="mt-2" />
                    <p className="mt-1.5 flex items-center gap-2 text-xs text-ink-4">
                      <Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge>
                      <span>livraison prévue le {formatDate(p.endDate)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Votre contact" icon="users" />
            <p className="text-base text-ink-2">
              Une question sur une facture ou un projet ? Écrivez à{" "}
              <a href={`mailto:${org?.email ?? ""}`} className="text-brand hover:underline">
                {org?.email ?? ""}
              </a>{" "}
              ou appelez le{" "}
              <span className="font-mono text-sm tabular-nums">{org?.phone ?? ""}</span>.
            </p>
            <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-ink-3">
              <Icon name="seal" size={14} className="mt-0.5 shrink-0 text-gold" />
              Toutes nos factures sont certifiées par la plateforme FNE de la Direction
              Générale des Impôts. Vous pouvez en vérifier l&apos;authenticité à tout
              moment en scannant le QR code.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
