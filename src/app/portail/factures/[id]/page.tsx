import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/auth-guard";
import { totalsOf } from "@/lib/invoices";
import { INVOICE_STATUS } from "@/lib/business";
import { PAYMENT_METHOD_LABELS, VAT_SHORT } from "@/lib/fne/constants";
import { formatDate, formatNumber, formatXOF } from "@/lib/format";
import {
  Amount, Badge, Breadcrumb, Card, CardHeader, DefRow,
  Icon, PageHeader, Td, Th, Tr,
} from "@/components/ui";
import { FneSticker } from "@/components/FneSticker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facture" };

export default async function PortalInvoiceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePortalUser();
  const { id } = await params;

  const [invoice, org] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        lines: { include: { customTaxes: true }, orderBy: { position: "asc" } },
        customTaxes: true,
        payments: { orderBy: { paidAt: "desc" } },
      },
    }),
    prisma.organization.findUniqueOrThrow({ where: { id: "org" } }),
  ]);

  /* Cloisonnement : un client n'accède qu'à ses propres factures émises. */
  if (
    !invoice ||
    invoice.companyId !== user.clientCompanyId ||
    invoice.status === "BROUILLON"
  ) {
    notFound();
  }

  const totals = totalsOf(invoice as never);
  const remaining = totals.total - invoice.paidAmount;

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Mes factures", href: "/portail/factures" },
              { label: invoice.number },
            ]}
          />
        }
        title={invoice.number}
        subtitle={invoice.title}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={INVOICE_STATUS[invoice.status].tone} dot>
          {INVOICE_STATUS[invoice.status].label}
        </Badge>
        <Badge tone="neutral">{PAYMENT_METHOD_LABELS[invoice.paymentMethod]}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader title="Détail" icon="list" />
          </div>
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[560px] border-collapse text-base">
              <thead>
                <tr>
                  <Th>Désignation</Th>
                  <Th align="right">Qté</Th>
                  <Th align="right">P.U. HT</Th>
                  <Th>TVA</Th>
                  <Th align="right">Montant HT</Th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((l, i) => (
                  <Tr key={l.id}>
                    <Td className="font-medium text-ink">{l.description}</Td>
                    <Td align="right" className="font-mono text-sm tabular-nums">
                      {formatNumber(l.quantity)} {l.unit}
                    </Td>
                    <Td align="right"><Amount value={l.unitPrice} className="text-sm" /></Td>
                    <Td className="text-sm text-ink-3">{VAT_SHORT[l.vatCode]}</Td>
                    <Td align="right"><Amount value={totals.lines[i]?.base ?? 0} className="text-sm" /></Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-line bg-surface-2/50 p-5">
            <dl className="ml-auto max-w-sm space-y-1.5 text-base">
              <div className="flex justify-between">
                <dt className="text-ink-3">Base taxable HT</dt>
                <dd><Amount value={totals.baseHT} /></dd>
              </div>
              {totals.vatBreakdown.map((v) => (
                <div key={v.label} className="flex justify-between">
                  <dt className="text-ink-3">{VAT_SHORT[v.label as keyof typeof VAT_SHORT] ?? v.label}</dt>
                  <dd><Amount value={v.amount} className="text-sm" /></dd>
                </div>
              ))}
              {totals.customTaxBreakdown.map((t) => (
                <div key={t.label} className="flex justify-between">
                  <dt className="text-ink-3">{t.label} ({t.rate} %)</dt>
                  <dd><Amount value={t.amount} className="text-sm" /></dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between border-t border-line-2 pt-2">
                <dt className="font-display text-md font-semibold text-ink">Total TTC</dt>
                <dd><Amount value={totals.total} className="text-lg font-semibold" /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-3">Réglé</dt>
                <dd><Amount value={invoice.paidAmount} tone="success" /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-ink-2">Reste dû</dt>
                <dd><Amount value={remaining} tone={remaining > 0 ? "danger" : "muted"} /></dd>
              </div>
            </dl>
          </div>
        </Card>

        <div className="space-y-6">
          {invoice.fneReference && invoice.fneVerificationUrl && (
            <Card className="border-gold-2/35">
              <CardHeader
                title="Facture certifiée"
                subtitle="Direction Générale des Impôts — Côte d'Ivoire"
                icon="seal"
              />
              <FneSticker
                reference={invoice.fneReference}
                verificationUrl={invoice.fneVerificationUrl}
                ncc={org.ncc}
                certifiedAt={invoice.fneCertifiedAt}
              />
              <p className="mt-3 text-sm leading-relaxed text-ink-3">
                Scannez le QR code, ou{" "}
                <Link href={`/verification/${invoice.fneToken}`} className="text-brand hover:underline">
                  ouvrez la page de vérification
                </Link>
                , pour contrôler l&apos;authenticité de ce document.
              </p>
            </Card>
          )}

          <Card>
            <CardHeader title="Émetteur" icon="building" />
            <dl className="text-base">
              <DefRow label="Raison sociale">{org.legalName}</DefRow>
              <DefRow label="NCC" mono>{org.ncc}</DefRow>
              <DefRow label="Adresse">{org.addressLine}</DefRow>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Échéance et règlement" icon="calendar" />
            <dl className="text-base">
              <DefRow label="Émise le">{formatDate(invoice.issueDate)}</DefRow>
              <DefRow label="Échéance">{formatDate(invoice.dueDate)}</DefRow>
              <DefRow label="Moyen prévu">{PAYMENT_METHOD_LABELS[invoice.paymentMethod]}</DefRow>
            </dl>

            {invoice.payments.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-line pt-3">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3 text-base">
                    <span>
                      <span className="block text-ink">{PAYMENT_METHOD_LABELS[p.method]}</span>
                      <span className="block text-xs text-ink-4">{formatDate(p.paidAt)}</span>
                    </span>
                    <Amount value={p.amount} tone="success" className="text-sm" />
                  </li>
                ))}
              </ul>
            )}

            {remaining > 0 && org.bankName && (
              <p className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-sm leading-relaxed text-ink-3">
                <Icon name="info" size={14} className="mt-0.5 shrink-0 text-ink-4" />
                <span>
                  Règlement par virement — {org.bankName}
                  <br />
                  <span className="font-mono text-xs">{org.bankAccount}</span>
                </span>
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
