import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { totalsOf } from "@/lib/invoices";
import { FNE_STATUS, INVOICE_STATUS } from "@/lib/business";
import { daysBetween, formatDate, formatXOF } from "@/lib/format";
import {
  Amount, Badge, Card, EmptyState, Icon, PageHeader, StatCard,
  TableShell, Td, Th, Tr,
} from "@/components/ui";
import { FneChip } from "@/components/FneSticker";
import { Filters } from "@/components/Filters";

export const metadata = { title: "Factures" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; fne?: string }>;
}) {
  await requireCapability("invoices.read");
  const { q = "", statut = "", fne = "" } = await searchParams;

  const where: Prisma.InvoiceWhereInput = {
    ...(statut ? { status: statut as never } : {}),
    ...(fne ? { fneStatus: fne as never } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
            { fneReference: { contains: q, mode: "insensitive" } },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, allForStats] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        lines: { include: { customTaxes: true } },
        customTaxes: true,
        company: { select: { id: true, name: true } },
      },
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
      take: 200,
    }),
    prisma.invoice.findMany({
      include: { lines: { include: { customTaxes: true } }, customTaxes: true },
    }),
  ]);

  const stats = allForStats.reduce(
    (acc, inv) => {
      const t = totalsOf(inv as never).total;
      acc.billed += inv.status === "BROUILLON" ? 0 : t;
      acc.collected += inv.paidAmount;
      if (inv.status === "EN_RETARD") acc.overdue += t - inv.paidAmount;
      if (inv.fneStatus === "CERTIFIEE" || inv.fneStatus === "AVOIR_EMIS") acc.certified += 1;
      return acc;
    },
    { billed: 0, collected: 0, overdue: 0, certified: 0 },
  );

  return (
    <>
      <PageHeader
        title="Factures"
        subtitle="Émission, règlement et certification auprès de la plateforme FNE de la DGI."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Facturé" value={formatXOF(stats.billed, { compact: true })} icon="invoice" tone="brand" />
        <StatCard label="Encaissé" value={formatXOF(stats.collected, { compact: true })} icon="check" tone="success" />
        <StatCard
          label="En retard" value={formatXOF(stats.overdue, { compact: true })}
          icon="warning" tone={stats.overdue > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="Certifiées FNE" value={`${stats.certified} / ${allForStats.length}`}
          icon="seal" tone="gold"
        />
      </div>

      <Suspense fallback={<div className="mb-5 h-9" />}>
        <Filters
          searchPlaceholder="Numéro, client, référence FNE…"
          selects={[
            {
              name: "statut", label: "Tous les règlements",
              options: Object.entries(INVOICE_STATUS).map(([value, m]) => ({ value, label: m.label })),
            },
            {
              name: "fne", label: "Toute certification",
              options: Object.entries(FNE_STATUS).map(([value, m]) => ({ value, label: m.label })),
            },
          ]}
        />
      </Suspense>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="invoice"
            title="Aucune facture ne correspond"
            description={
              q || statut || fne
                ? "Aucun résultat pour ces critères. Élargissez la recherche ou réinitialisez les filtres."
                : "Les factures créées depuis un devis accepté apparaîtront ici."
            }
          />
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Numéro</Th>
              <Th>Client</Th>
              <Th>Objet</Th>
              <Th>Échéance</Th>
              <Th align="right">Total TTC</Th>
              <Th align="right">Reste dû</Th>
              <Th>Règlement</Th>
              <Th>Certification FNE</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => {
              const totals = totalsOf(inv as never);
              const due = totals.total - inv.paidAmount;
              const late = inv.status === "EN_RETARD";
              const daysLate = daysBetween(new Date(), inv.dueDate);
              return (
                <Tr key={inv.id} href={`/factures/${inv.id}`}>
                  <Td>
                    <Link href={`/factures/${inv.id}`} className="font-mono text-sm font-medium text-ink hover:text-brand">
                      {inv.number}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/societes/${inv.company.id}`} className="hover:text-brand">
                      {inv.company.name}
                    </Link>
                  </Td>
                  <Td className="max-w-[18rem] truncate text-sm text-ink-3">{inv.title}</Td>
                  <Td className="text-sm">
                    <span className={late ? "font-medium text-danger" : "text-ink-3"}>
                      {formatDate(inv.dueDate)}
                    </span>
                    {late && (
                      <span className="ml-1.5 text-xs text-danger">
                        (+{Math.abs(daysLate)} j)
                      </span>
                    )}
                  </Td>
                  <Td align="right"><Amount value={totals.total} /></Td>
                  <Td align="right">
                    <Amount value={due} tone={due === 0 ? "muted" : late ? "danger" : "default"} />
                  </Td>
                  <Td><Badge tone={INVOICE_STATUS[inv.status].tone} dot>{INVOICE_STATUS[inv.status].label}</Badge></Td>
                  <Td>
                    {inv.fneReference ? (
                      <FneChip reference={inv.fneReference} />
                    ) : (
                      <Badge tone={FNE_STATUS[inv.fneStatus].tone}>
                        {inv.fneStatus === "REJETEE" && <Icon name="warning" size={11} />}
                        {FNE_STATUS[inv.fneStatus].label}
                      </Badge>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableShell>
      )}

      <p className="mt-4 text-sm text-ink-4">
        {rows.length} facture{rows.length > 1 ? "s" : ""} affichée{rows.length > 1 ? "s" : ""}
        {rows.length === 200 && " (200 premières)"}.
      </p>
    </>
  );
}
