import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { totalsOf } from "@/lib/invoices";
import { QUOTE_STATUS, QUOTE_VALIDITY_DAYS } from "@/lib/business";
import { daysBetween, formatDate, formatXOF } from "@/lib/format";
import {
  Amount, Badge, Card, EmptyState, PageHeader, StatCard,
  TableShell, Td, Th, Tr,
} from "@/components/ui";
import { Filters } from "@/components/Filters";

export const metadata = { title: "Devis" };
export const dynamic = "force-dynamic";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string }>;
}) {
  await requireCapability("quotes.read");
  const { q = "", statut = "" } = await searchParams;

  const where: Prisma.QuoteWhereInput = {
    ...(statut ? { status: statut as never } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const quotes = await prisma.quote.findMany({
    where,
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { name: true } },
      lines: { orderBy: { position: "asc" } },
      invoices: { select: { id: true, number: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  const withTotals = quotes.map((qt) => ({
    q: qt,
    total: totalsOf({
      discount: qt.discount,
      lines: qt.lines.map((l) => ({ ...l, customTaxes: [] })) as never,
      customTaxes: [],
    }).total,
  }));

  const sent = withTotals.filter((x) => x.q.status === "ENVOYE");
  const accepted = withTotals.filter((x) => x.q.status === "ACCEPTE");
  const decided = withTotals.filter((x) => ["ACCEPTE", "REFUSE"].includes(x.q.status));
  const winRate = decided.length ? Math.round((accepted.length / decided.length) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Devis"
        subtitle={`Propositions commerciales. Validité par défaut : ${QUOTE_VALIDITY_DAYS} jours.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="En attente de réponse" value={String(sent.length)}
          hint={formatXOF(sent.reduce((s, x) => s + x.total, 0), { compact: true })}
          icon="clock" tone="warning"
        />
        <StatCard
          label="Acceptés" value={String(accepted.length)}
          hint={formatXOF(accepted.reduce((s, x) => s + x.total, 0), { compact: true })}
          icon="check" tone="success"
        />
        <StatCard label="Taux d'acceptation" value={`${winRate} %`} icon="trend" tone="brand" />
        <StatCard
          label="Montant total proposé"
          value={formatXOF(withTotals.reduce((s, x) => s + x.total, 0), { compact: true })}
          icon="quote" tone="violet"
        />
      </div>

      <Suspense fallback={<div className="mb-5 h-9" />}>
        <Filters
          searchPlaceholder="Numéro, objet, client…"
          selects={[
            {
              name: "statut", label: "Tous les statuts",
              options: Object.entries(QUOTE_STATUS).map(([value, m]) => ({ value, label: m.label })),
            },
          ]}
        />
      </Suspense>

      {withTotals.length === 0 ? (
        <Card>
          <EmptyState icon="quote" title="Aucun devis ne correspond" />
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Numéro</Th>
              <Th>Client</Th>
              <Th>Objet</Th>
              <Th>Validité</Th>
              <Th align="right">Total TTC</Th>
              <Th>Statut</Th>
              <Th>Suite</Th>
            </tr>
          </thead>
          <tbody>
            {withTotals.map(({ q: qt, total }) => {
              const days = daysBetween(qt.validUntil);
              const expiring = qt.status === "ENVOYE" && days <= 7;
              return (
                <Tr key={qt.id} href={`/devis/${qt.id}`}>
                  <Td>
                    <Link href={`/devis/${qt.id}`} className="font-mono text-sm font-medium text-ink hover:text-brand">
                      {qt.number}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/societes/${qt.company.id}`} className="hover:text-brand">
                      {qt.company.name}
                    </Link>
                  </Td>
                  <Td className="max-w-[16rem] truncate text-sm text-ink-3">{qt.title}</Td>
                  <Td className="text-sm">
                    <span className={expiring ? "font-medium text-warning" : "text-ink-3"}>
                      {formatDate(qt.validUntil)}
                    </span>
                    {expiring && days >= 0 && (
                      <span className="ml-1.5 text-xs text-warning">({days} j)</span>
                    )}
                  </Td>
                  <Td align="right"><Amount value={total} /></Td>
                  <Td>
                    <Badge tone={QUOTE_STATUS[qt.status].tone} dot>
                      {QUOTE_STATUS[qt.status].label}
                    </Badge>
                  </Td>
                  <Td>
                    {qt.invoices[0] ? (
                      <Link
                        href={`/factures/${qt.invoices[0].id}`}
                        className="font-mono text-xs text-brand hover:underline"
                      >
                        {qt.invoices[0].number}
                      </Link>
                    ) : (
                      <span className="text-xs text-ink-4">—</span>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </>
  );
}
