import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { totalsOf } from "@/lib/invoices";
import { TEMPLATE_LABELS, VAT_SHORT } from "@/lib/fne/constants";
import { formatDate, formatDateTime, formatFneReference, formatNumber, formatXOF } from "@/lib/format";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { FneSticker } from "@/components/FneSticker";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vérification d'une facture" };

/**
 * Page publique atteinte par le QR code du sticker.
 * Elle ne divulgue que ce qu'un tiers légitime doit pouvoir contrôler :
 * émetteur, destinataire, montants, référence normalisée. Pas de détail interne.
 */
export default async function VerificationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [invoice, creditNote, org] = await Promise.all([
    prisma.invoice.findFirst({
      where: { fneToken: token },
      include: {
        lines: { include: { customTaxes: true }, orderBy: { position: "asc" } },
        customTaxes: true,
      },
    }),
    prisma.creditNote.findFirst({
      where: { fneToken: token },
      include: { invoice: { select: { number: true, clientCompanyName: true } } },
    }),
    prisma.organization.findUnique({ where: { id: "org" } }),
  ]);

  const found = invoice ?? creditNote;

  return (
    <>
      <PublicHeader />

      <main className="mx-auto max-w-content px-4 py-14 sm:px-8">
        <div className="mx-auto max-w-2xl">
          {!found ? (
            <div className="rounded-lg border border-danger/25 bg-danger-soft p-8 text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-danger/25 bg-surface text-danger">
                <Icon name="x" size={22} />
              </span>
              <h1 className="font-display text-2xl font-semibold text-ink">
                Aucun document ne correspond à ce code
              </h1>
              <p className="mx-auto mt-3 max-w-prose text-base leading-relaxed text-ink-2">
                Le code de vérification saisi n&apos;est rattaché à aucune facture certifiée
                par Markel Technology. Vérifiez la saisie — le code comporte trente-six
                caractères, tirets compris.
              </p>
              <p className="mt-4 font-mono text-xs text-ink-4">{token}</p>
              <Link
                href="/verification"
                className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-surface px-3.5 text-base text-ink-2 transition-colors hover:bg-surface-2"
              >
                <Icon name="chevronLeft" size={14} />
                Nouvelle vérification
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-3 rounded-md border border-success/20 bg-success-soft px-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-success/25 bg-surface text-success">
                  <Icon name="check" size={18} />
                </span>
                <div>
                  <p className="font-medium text-success">Document authentique</p>
                  <p className="text-sm text-ink-2">
                    Ce code correspond à {invoice ? "une facture" : "un avoir"} certifié
                    {invoice ? "e" : ""} émis{invoice ? "e" : ""} par {org?.legalName}.
                  </p>
                </div>
              </div>

              {invoice && (
                <article className="rounded-lg border border-line bg-surface p-6 shadow-1 sm:p-8">
                  <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
                    <div>
                      <p className="eyebrow">Émetteur</p>
                      <p className="mt-1 font-display text-md font-semibold text-ink">
                        {org?.legalName}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-ink-3">NCC {org?.ncc}</p>
                    </div>
                    <div className="text-right">
                      <p className="eyebrow">Référence normalisée</p>
                      <p className="mt-1 font-mono text-md font-semibold tabular-nums text-gold">
                        {formatFneReference(invoice.fneReference)}
                      </p>
                    </div>
                  </header>

                  <dl className="grid gap-x-8 gap-y-3 border-b border-line py-5 sm:grid-cols-2">
                    <div>
                      <dt className="eyebrow">Destinataire</dt>
                      <dd className="mt-1 text-base text-ink">{invoice.clientCompanyName}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Régime</dt>
                      <dd className="mt-1 text-base text-ink">{TEMPLATE_LABELS[invoice.fneTemplate]}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Date d&apos;émission</dt>
                      <dd className="mt-1 text-base tabular-nums text-ink">{formatDate(invoice.issueDate)}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Certifiée le</dt>
                      <dd className="mt-1 text-base tabular-nums text-ink">
                        {formatDateTime(invoice.fneCertifiedAt)}
                      </dd>
                    </div>
                  </dl>

                  <table className="w-full border-collapse py-4 text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="py-2 text-left text-2xs font-semibold uppercase tracking-wider text-ink-3">Désignation</th>
                        <th className="py-2 text-right text-2xs font-semibold uppercase tracking-wider text-ink-3">Qté</th>
                        <th className="py-2 text-center text-2xs font-semibold uppercase tracking-wider text-ink-3">TVA</th>
                        <th className="py-2 text-right text-2xs font-semibold uppercase tracking-wider text-ink-3">Montant HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const totals = totalsOf(invoice as never);
                        return invoice.lines.map((l, i) => (
                          <tr key={l.id} className="border-b border-line">
                            <td className="py-2.5 pr-3 text-ink">{l.description}</td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-ink-2">
                              {formatNumber(l.quantity)}
                            </td>
                            <td className="py-2.5 text-center text-xs text-ink-3">
                              {VAT_SHORT[l.vatCode]}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-ink">
                              {formatXOF(totals.lines[i]?.base ?? 0, { symbol: false })}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>

                  {(() => {
                    const totals = totalsOf(invoice as never);
                    return (
                      <dl className="ml-auto mt-4 max-w-xs space-y-1 text-base">
                        <div className="flex justify-between">
                          <dt className="text-ink-3">Base taxable HT</dt>
                          <dd className="font-mono tabular-nums text-ink">{formatXOF(totals.baseHT)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-ink-3">Total des taxes</dt>
                          <dd className="font-mono tabular-nums text-ink">
                            {formatXOF(totals.vatTotal + totals.customTaxTotal)}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between border-t border-line-2 pt-1.5">
                          <dt className="font-display text-md font-semibold text-ink">Total TTC</dt>
                          <dd className="font-mono text-md font-semibold tabular-nums text-ink">
                            {formatXOF(totals.total)}
                          </dd>
                        </div>
                      </dl>
                    );
                  })()}

                  {invoice.fneReference && invoice.fneVerificationUrl && (
                    <div className="mt-7 border-t border-line pt-6">
                      <FneSticker
                        reference={invoice.fneReference}
                        verificationUrl={invoice.fneVerificationUrl}
                        ncc={org?.ncc ?? ""}
                        certifiedAt={invoice.fneCertifiedAt}
                      />
                    </div>
                  )}
                </article>
              )}

              {creditNote && (
                <article className="rounded-lg border border-line bg-surface p-6 shadow-1 sm:p-8">
                  <p className="eyebrow">Facture d&apos;avoir</p>
                  <p className="mt-1 font-mono text-md font-semibold tabular-nums text-gold">
                    {formatFneReference(creditNote.fneReference)}
                  </p>
                  <dl className="mt-5 space-y-3">
                    <div>
                      <dt className="eyebrow">Facture d&apos;origine</dt>
                      <dd className="mt-1 font-mono text-base text-ink">{creditNote.invoice.number}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Destinataire</dt>
                      <dd className="mt-1 text-base text-ink">{creditNote.invoice.clientCompanyName}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Motif</dt>
                      <dd className="mt-1 text-base leading-relaxed text-ink-2">{creditNote.reason}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Certifié le</dt>
                      <dd className="mt-1 text-base tabular-nums text-ink">
                        {formatDateTime(creditNote.certifiedAt)}
                      </dd>
                    </div>
                  </dl>

                  {creditNote.fneReference && creditNote.fneVerificationUrl && (
                    <div className="mt-7 border-t border-line pt-6">
                      <FneSticker
                        reference={creditNote.fneReference}
                        verificationUrl={creditNote.fneVerificationUrl}
                        ncc={org?.ncc ?? ""}
                        certifiedAt={creditNote.certifiedAt}
                      />
                    </div>
                  )}
                </article>
              )}

              <p className="mt-6 text-sm leading-relaxed text-ink-3">
                <Icon name="info" size={14} className="mr-1.5 inline align-[-2px] text-ink-4" />
                Cette page reprend les données transmises à la plateforme FNE lors de la
                certification. Le contrôle fait foi auprès de la Direction Générale des
                Impôts, joignable à{" "}
                <a href="mailto:support.fne@dgi.gouv.ci" className="text-brand hover:underline">
                  support.fne@dgi.gouv.ci
                </a>.
              </p>
            </>
          )}
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
