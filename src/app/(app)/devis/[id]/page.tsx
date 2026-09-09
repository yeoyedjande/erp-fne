import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { can } from "@/lib/permissions";
import { totalsOf } from "@/lib/invoices";
import { MAX_DISCOUNT_MANAGER, MAX_DISCOUNT_SALES, QUOTE_STATUS } from "@/lib/business";
import { VAT_SHORT } from "@/lib/fne/constants";
import { formatDate, formatNumber, formatXOF } from "@/lib/format";
import {
  Amount, Badge, Breadcrumb, Callout, Card, CardHeader, DefRow,
  Icon, LinkButton, PageHeader, Td, Th, Tr,
} from "@/components/ui";
import { convertToInvoiceAction, decideQuoteAction } from "../actions";
import { ConvertToInvoice, QuoteDecision } from "../QuoteActions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await prisma.quote.findUnique({ where: { id }, select: { number: true } });
  return { title: q ? `Devis ${q.number}` : "Devis" };
}

export default async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCapability("quotes.read");
  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      company: true,
      contact: true,
      opportunity: { select: { id: true, title: true, reference: true } },
      owner: { select: { name: true } },
      lines: { orderBy: { position: "asc" } },
      invoices: { select: { id: true, number: true } },
    },
  });
  if (!quote) notFound();

  const totals = totalsOf({
    discount: quote.discount,
    // Un devis ne porte pas de taxe spécifique : elles se décident à la facturation.
    lines: quote.lines.map((l) => ({ ...l, customTaxes: [] })) as never,
    customTaxes: [],
  });

  const canWrite = can(user.role, "quotes.write");
  const canInvoice = can(user.role, "invoices.write");
  const overDiscount = quote.discount > MAX_DISCOUNT_SALES;

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb items={[{ label: "Devis", href: "/devis" }, { label: quote.number }]} />
        }
        title={quote.number}
        subtitle={quote.title}
        action={
          canInvoice && quote.status === "ACCEPTE" && quote.invoices.length === 0 ? (
            <ConvertToInvoice action={convertToInvoiceAction} quoteId={quote.id} />
          ) : quote.invoices[0] ? (
            <LinkButton href={`/factures/${quote.invoices[0].id}`} variant="secondary" icon="invoice">
              Voir la facture {quote.invoices[0].number}
            </LinkButton>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={QUOTE_STATUS[quote.status].tone} dot>{QUOTE_STATUS[quote.status].label}</Badge>
        {quote.discount > 0 && <Badge tone="warning">Remise {quote.discount} %</Badge>}
      </div>

      {overDiscount && (
        <div className="mb-6">
          <Callout tone="warning" icon="warning" title="Remise au-delà du seuil commercial">
            La remise de {quote.discount} % dépasse les {MAX_DISCOUNT_SALES} % qu&apos;un
            commercial peut accorder seul. Elle requiert la validation d&apos;un gestionnaire
            (plafond {MAX_DISCOUNT_MANAGER} %).
          </Callout>
        </div>
      )}

      {quote.status === "REFUSE" && quote.refusalReason && (
        <div className="mb-6">
          <Callout tone="danger" icon="x" title="Devis refusé">{quote.refusalReason}</Callout>
        </div>
      )}

      {canWrite && ["BROUILLON", "ENVOYE"].includes(quote.status) && (
        <div className="mb-6">
          <QuoteDecision action={decideQuoteAction} quoteId={quote.id} status={quote.status} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader title="Détail de la proposition" icon="list" />
          </div>
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[640px] border-collapse text-base">
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
                {quote.lines.map((line, i) => (
                  <Tr key={line.id}>
                    <Td>
                      <span className="block font-medium text-ink">{line.description}</span>
                      {line.reference && (
                        <span className="mt-0.5 block font-mono text-xs text-ink-4">{line.reference}</span>
                      )}
                    </Td>
                    <Td align="right" className="font-mono text-sm tabular-nums">
                      {formatNumber(line.quantity)} {line.unit}
                    </Td>
                    <Td align="right"><Amount value={line.unitPrice} className="text-sm" /></Td>
                    <Td className="text-sm text-ink-3">{VAT_SHORT[line.vatCode]}</Td>
                    <Td align="right"><Amount value={totals.lines[i]?.base ?? 0} className="text-sm" /></Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-line bg-surface-2/50 p-5">
            <dl className="ml-auto max-w-sm space-y-1.5 text-base">
              <div className="flex justify-between">
                <dt className="text-ink-3">Sous-total HT</dt>
                <dd><Amount value={totals.subtotal} /></dd>
              </div>
              {totals.globalDiscount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-3">Remise ({totals.globalDiscount} %)</dt>
                  <dd><Amount value={-totals.discountAmount} tone="danger" /></dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-1.5">
                <dt className="font-medium text-ink-2">Base taxable HT</dt>
                <dd><Amount value={totals.baseHT} /></dd>
              </div>
              {totals.vatBreakdown.map((v) => (
                <div key={v.label} className="flex justify-between">
                  <dt className="text-ink-3">
                    {VAT_SHORT[v.label as keyof typeof VAT_SHORT] ?? v.label}
                  </dt>
                  <dd><Amount value={v.amount} className="text-sm" /></dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between border-t border-line-2 pt-2">
                <dt className="font-display text-md font-semibold text-ink">Total TTC</dt>
                <dd><Amount value={totals.total} className="text-lg font-semibold" /></dd>
              </div>
            </dl>
          </div>

          {quote.terms && (
            <div className="border-t border-line p-5">
              <p className="eyebrow mb-1.5">Conditions</p>
              <p className="text-sm leading-relaxed text-ink-3">{quote.terms}</p>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Client" icon="building" />
            <p className="font-display text-md font-semibold text-ink">
              <Link href={`/societes/${quote.company.id}`} className="hover:text-brand">
                {quote.company.name}
              </Link>
            </p>
            <dl className="mt-3 text-base">
              {quote.contact && (
                <DefRow label="Interlocuteur">
                  {quote.contact.firstName} {quote.contact.lastName}
                </DefRow>
              )}
              <DefRow label="NCC" mono>{quote.company.ncc ?? "—"}</DefRow>
              <DefRow label="Régime FNE">{quote.company.fneTemplate}</DefRow>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Suivi" icon="calendar" />
            <dl className="text-base">
              <DefRow label="Émis le">{formatDate(quote.issueDate)}</DefRow>
              <DefRow label="Valable jusqu'au">{formatDate(quote.validUntil)}</DefRow>
              {quote.sentAt && <DefRow label="Envoyé le">{formatDate(quote.sentAt)}</DefRow>}
              {quote.decidedAt && <DefRow label="Décidé le">{formatDate(quote.decidedAt)}</DefRow>}
              <DefRow label="Commercial">{quote.owner?.name ?? "—"}</DefRow>
              {quote.opportunity && (
                <DefRow label="Affaire liée">
                  <Link href="/pipeline" className="text-brand hover:underline">
                    {quote.opportunity.reference}
                  </Link>
                </DefRow>
              )}
            </dl>
          </Card>

          {quote.notes && (
            <Card>
              <CardHeader title="Note interne" icon="file" />
              <p className="text-sm leading-relaxed text-ink-3">{quote.notes}</p>
            </Card>
          )}

          {quote.status === "ACCEPTE" && quote.invoices.length === 0 && (
            <Callout tone="success" icon="check" title="Prêt à facturer">
              La conversion recopie les lignes du devis et fige l&apos;identité fiscale du
              client. La facture est créée au brouillon : vous pourrez la relire avant
              émission, puis la certifier auprès de la DGI.
            </Callout>
          )}
        </div>
      </div>
    </>
  );
}
