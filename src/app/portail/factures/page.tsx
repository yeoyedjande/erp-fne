import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/auth-guard";
import { totalsOf } from "@/lib/invoices";
import { INVOICE_STATUS } from "@/lib/business";
import { formatDate, formatXOF } from "@/lib/format";
import {
  Amount, Badge, Card, EmptyState, PageHeader, StatCard,
  TableShell, Td, Th, Tr,
} from "@/components/ui";
import { FneChip } from "@/components/FneSticker";

export const metadata = { title: "Mes factures" };
export const dynamic = "force-dynamic";

export default async function PortalInvoices() {
  const user = await requirePortalUser();

  const invoices = await prisma.invoice.findMany({
    where: { companyId: user.clientCompanyId, status: { notIn: ["BROUILLON", "ANNULEE"] } },
    include: { lines: { include: { customTaxes: true } }, customTaxes: true },
    orderBy: { issueDate: "desc" },
  });

  const rows = invoices.map((i) => ({ inv: i, total: totalsOf(i as never).total }));
  const billed = rows.reduce((s, r) => s + r.total, 0);
  const paid = rows.reduce((s, r) => s + r.inv.paidAmount, 0);

  return (
    <>
      <PageHeader
        title="Mes factures"
        subtitle="Toutes vos factures, avec leur certification par la Direction Générale des Impôts."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total facturé" value={formatXOF(billed, { compact: true })} icon="invoice" tone="brand" />
        <StatCard label="Réglé" value={formatXOF(paid, { compact: true })} icon="check" tone="success" />
        <StatCard label="Reste dû" value={formatXOF(billed - paid, { compact: true })} icon="clock" tone={billed - paid > 0 ? "warning" : "neutral"} />
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="invoice" title="Aucune facture" description="Aucune facture ne vous a encore été adressée." />
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Numéro</Th>
              <Th>Objet</Th>
              <Th>Émission</Th>
              <Th>Échéance</Th>
              <Th align="right">Total TTC</Th>
              <Th align="right">Reste dû</Th>
              <Th>Statut</Th>
              <Th>Certification</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ inv, total }) => (
              <Tr key={inv.id} href={`/portail/factures/${inv.id}`}>
                <Td>
                  <Link href={`/portail/factures/${inv.id}`} className="font-mono text-sm font-medium text-ink hover:text-brand">
                    {inv.number}
                  </Link>
                </Td>
                <Td className="max-w-[16rem] truncate text-sm text-ink-3">{inv.title}</Td>
                <Td className="text-sm text-ink-3">{formatDate(inv.issueDate)}</Td>
                <Td className="text-sm">
                  <span className={inv.status === "EN_RETARD" ? "font-medium text-danger" : "text-ink-3"}>
                    {formatDate(inv.dueDate)}
                  </span>
                </Td>
                <Td align="right"><Amount value={total} /></Td>
                <Td align="right">
                  <Amount
                    value={total - inv.paidAmount}
                    tone={total - inv.paidAmount === 0 ? "muted" : "default"}
                  />
                </Td>
                <Td><Badge tone={INVOICE_STATUS[inv.status].tone} dot>{INVOICE_STATUS[inv.status].label}</Badge></Td>
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
        </TableShell>
      )}
    </>
  );
}
