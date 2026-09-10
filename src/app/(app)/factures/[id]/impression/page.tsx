import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { INVOICE_INCLUDE, totalsOf } from "@/lib/invoices";
import { PAYMENT_METHOD_LABELS, TEMPLATE_LABELS, VAT_LABELS } from "@/lib/fne/constants";
import { LATE_PENALTY_MONTHLY } from "@/lib/business";
import { formatDate, formatNumber, formatXOF } from "@/lib/format";
import { FneSticker } from "@/components/FneSticker";
import { LogoMark } from "@/components/Logo";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Impression de la facture" };

export default async function InvoicePrint({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("invoices.read");
  const { id } = await params;

  const [invoice, org] = await Promise.all([
    prisma.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE }),
    prisma.organization.findUniqueOrThrow({ where: { id: "org" } }),
  ]);
  if (!invoice) notFound();

  const totals = totalsOf(invoice as never);
  const remaining = totals.total - invoice.paidAmount;

  return (
    <div className="mx-auto max-w-[820px] px-4 py-8 print:px-0 print:py-0">
      <PrintButton />

      <article className="rounded-lg border border-line bg-surface p-8 shadow-1 print-plain print:rounded-none print:p-0">
        {/* En-tête */}
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <LogoMark size={44} />
              <p className="font-display text-xl font-semibold text-ink">{org.legalName}</p>
            </div>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-3">
              {org.addressLine}
              <br />
              {org.city}, {org.country}
            </p>
            <dl className="mt-3 space-y-0.5 font-mono text-xs text-ink-3">
              <div>NCC {org.ncc}</div>
              <div>RCCM {org.rccm}</div>
              <div>{org.phone}</div>
              <div>{org.email}</div>
            </dl>
          </div>

          <div className="text-right">
            <p className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-3">
              Facture normalisée électronique
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">
              {invoice.number}
            </p>
            {invoice.fneReference && (
              <p className="mt-1 font-mono text-sm tabular-nums text-gold">
                {invoice.fneReference}
              </p>
            )}
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-end gap-4">
                <dt className="text-ink-3">Émise le</dt>
                <dd className="w-28 text-right tabular-nums text-ink">{formatDate(invoice.issueDate)}</dd>
              </div>
              <div className="flex justify-end gap-4">
                <dt className="text-ink-3">Échéance</dt>
                <dd className="w-28 text-right tabular-nums text-ink">{formatDate(invoice.dueDate)}</dd>
              </div>
              <div className="flex justify-end gap-4">
                <dt className="text-ink-3">Règlement</dt>
                <dd className="w-28 text-right text-ink">{PAYMENT_METHOD_LABELS[invoice.paymentMethod]}</dd>
              </div>
            </dl>
          </div>
        </header>

        {/* Client */}
        <section className="flex flex-wrap justify-between gap-6 border-b border-line py-6">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-3">Facturé à</p>
            <p className="mt-2 font-display text-md font-semibold text-ink">
              {invoice.clientCompanyName}
            </p>
            {invoice.company.addressLine && (
              <p className="mt-1 text-sm text-ink-3">
                {invoice.company.addressLine}
                <br />
                {invoice.company.city}, {invoice.company.country}
              </p>
            )}
            <dl className="mt-2 space-y-0.5 font-mono text-xs text-ink-3">
              {invoice.clientNcc && <div>NCC {invoice.clientNcc}</div>}
              <div>{invoice.clientPhone}</div>
              <div>{invoice.clientEmail}</div>
            </dl>
          </div>

          <div className="text-right text-sm">
            <p className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-3">Régime</p>
            <p className="mt-2 text-ink">{TEMPLATE_LABELS[invoice.fneTemplate]}</p>
            <p className="mt-1 text-ink-3">
              Point de vente {invoice.pointOfSale} · {invoice.establishment}
            </p>
            {invoice.foreignCurrency && (
              <p className="mt-1 font-mono text-xs text-ink-3">
                {invoice.foreignCurrency} — taux {invoice.foreignCurrencyRate}
              </p>
            )}
          </div>
        </section>

        {/* Objet */}
        <section className="border-b border-line py-5">
          <p className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-3">Objet</p>
          <p className="mt-1.5 text-md text-ink">{invoice.title}</p>
        </section>

        {/* Lignes */}
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-2">
              <th className="pb-2 text-left text-2xs font-semibold uppercase tracking-wider text-ink-3">Désignation</th>
              <th className="pb-2 text-right text-2xs font-semibold uppercase tracking-wider text-ink-3">Qté</th>
              <th className="pb-2 text-right text-2xs font-semibold uppercase tracking-wider text-ink-3">P.U. HT</th>
              <th className="pb-2 text-right text-2xs font-semibold uppercase tracking-wider text-ink-3">Rem.</th>
              <th className="pb-2 text-center text-2xs font-semibold uppercase tracking-wider text-ink-3">TVA</th>
              <th className="pb-2 text-right text-2xs font-semibold uppercase tracking-wider text-ink-3">Montant HT</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, i) => (
              <tr key={line.id} className="border-b border-line align-top">
                <td className="py-2.5 pr-3">
                  <span className="block text-ink">{line.description}</span>
                  {line.reference && (
                    <span className="mt-0.5 block font-mono text-2xs tracking-normal text-ink-4">
                      Réf. {line.reference}
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums text-ink-2">
                  {formatNumber(line.quantity)}
                  <span className="ml-1 text-2xs tracking-normal text-ink-4">{line.unit}</span>
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums text-ink-2">
                  {formatXOF(line.unitPrice, { symbol: false })}
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums text-ink-3">
                  {line.discount ? `${line.discount} %` : "—"}
                </td>
                <td className="py-2.5 text-center font-mono text-2xs tracking-normal text-ink-3">
                  {line.vatCode}
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums text-ink">
                  {formatXOF(totals.lines[i]?.base ?? 0, { symbol: false })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <section className="mt-6 flex flex-wrap justify-between gap-8">
          <div className="max-w-xs">
            {totals.vatBreakdown.length > 0 && (
              <>
                <p className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-3">
                  Ventilation de la TVA
                </p>
                <table className="mt-2 w-full text-xs">
                  <tbody>
                    {totals.vatBreakdown.map((v) => (
                      <tr key={v.label}>
                        <td className="py-0.5 pr-3 text-ink-3">
                          {VAT_LABELS[v.label as keyof typeof VAT_LABELS] ?? v.label}
                        </td>
                        <td className="py-0.5 text-right font-mono tabular-nums text-ink-2">
                          {formatXOF(v.amount, { symbol: false })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          <dl className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-3">Sous-total HT</dt>
              <dd className="font-mono tabular-nums text-ink">{formatXOF(totals.subtotal)}</dd>
            </div>
            {totals.globalDiscount > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-3">Remise {totals.globalDiscount} %</dt>
                <dd className="font-mono tabular-nums text-ink">−{formatXOF(totals.discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-1">
              <dt className="text-ink-2">Base taxable HT</dt>
              <dd className="font-mono tabular-nums text-ink">{formatXOF(totals.baseHT)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Total TVA</dt>
              <dd className="font-mono tabular-nums text-ink">{formatXOF(totals.vatTotal)}</dd>
            </div>
            {totals.customTaxBreakdown.map((t) => (
              <div key={t.label} className="flex justify-between">
                <dt className="text-ink-3">{t.label} ({t.rate} %)</dt>
                <dd className="font-mono tabular-nums text-ink">{formatXOF(t.amount)}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t-2 border-ink pt-1.5">
              <dt className="font-display text-md font-semibold text-ink">Net à payer</dt>
              <dd className="font-mono text-md font-semibold tabular-nums text-ink">
                {formatXOF(totals.total)}
              </dd>
            </div>
            {invoice.paidAmount > 0 && (
              <>
                <div className="flex justify-between">
                  <dt className="text-ink-3">Déjà réglé</dt>
                  <dd className="font-mono tabular-nums text-ink">{formatXOF(invoice.paidAmount)}</dd>
                </div>
                <div className="flex justify-between font-medium">
                  <dt className="text-ink-2">Reste dû</dt>
                  <dd className="font-mono tabular-nums text-ink">{formatXOF(remaining)}</dd>
                </div>
              </>
            )}
          </dl>
        </section>

        {/* Sticker de certification — les trois éléments imposés par la DGI */}
        <section className="mt-8 flex flex-wrap items-end justify-between gap-6 border-t border-line pt-6">
          <div className="max-w-sm text-xs leading-relaxed text-ink-3">
            {org.bankName && (
              <p className="mb-2">
                Règlement par virement — {org.bankName}
                <br />
                <span className="font-mono">{org.bankAccount}</span>
              </p>
            )}
            <p>
              {invoice.footer ??
                `Pénalité de retard de ${LATE_PENALTY_MONTHLY} % par mois entamé, exigible sans rappel.`}
            </p>
          </div>

          {invoice.fneReference && invoice.fneVerificationUrl ? (
            <FneSticker
              reference={invoice.fneReference}
              verificationUrl={invoice.fneVerificationUrl}
              ncc={org.ncc}
              certifiedAt={invoice.fneCertifiedAt}
            />
          ) : (
            <p className="rounded-md border border-dashed border-danger/40 bg-danger-soft px-4 py-3 text-xs text-danger">
              Document non certifié — ne constitue pas une facture normalisée au sens
              des articles 384 et suivants du Code général des impôts.
            </p>
          )}
        </section>

        <footer className="mt-6 border-t border-line pt-4 text-center text-2xs tracking-normal text-ink-4">
          {org.legalName} — {org.taxRegime} — NCC {org.ncc} — RCCM {org.rccm}
        </footer>
      </article>
    </div>
  );
}
