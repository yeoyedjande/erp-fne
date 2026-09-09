import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { can } from "@/lib/permissions";
import { INVOICE_INCLUDE, totalsOf } from "@/lib/invoices";
import { FNE_STATUS, INVOICE_STATUS, LATE_PENALTY_MONTHLY } from "@/lib/business";
import { preflight } from "@/lib/fne/service";
import { PAYMENT_METHOD_LABELS, TEMPLATE_LABELS, VAT_SHORT } from "@/lib/fne/constants";
import { formatDate, formatDateTime, formatNumber, formatXOF } from "@/lib/format";
import {
  Amount, Badge, Breadcrumb, Callout, Card, CardHeader, DefRow,
  EmptyState, Icon, LinkButton, PageHeader, Progress, Td, Th, Tr,
} from "@/components/ui";
import { FneSticker } from "@/components/FneSticker";
import { certifyAction, createCreditNoteAction, issueInvoiceAction, recordPaymentAction } from "../actions";
import { CertifyForm, CreditNoteForm, IssueForm, PaymentForm } from "./InvoicePanels";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id }, select: { number: true } });
  return { title: inv ? `Facture ${inv.number}` : "Facture" };
}

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCapability("invoices.read");
  const { id } = await params;

  const [invoice, org, logs] = await Promise.all([
    prisma.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE }),
    prisma.organization.findUniqueOrThrow({ where: { id: "org" } }),
    prisma.fneLog.findMany({
      where: { invoiceId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  if (!invoice) notFound();

  const totals = totalsOf(invoice as never);
  const remaining = totals.total - invoice.paidAmount;
  const check = preflight(invoice as never, org);
  const canWrite = can(user.role, "invoices.write");
  const canCertify = can(user.role, "fne.certify");
  const certified = invoice.fneStatus === "CERTIFIEE" || invoice.fneStatus === "AVOIR_EMIS";

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Factures", href: "/factures" },
              { label: invoice.number },
            ]}
          />
        }
        title={invoice.number}
        subtitle={invoice.title}
        action={
          <>
            <LinkButton
              href={`/factures/${invoice.id}/impression`}
              target="_blank"
              variant="secondary"
              icon="print"
            >
              Imprimer
            </LinkButton>
            {canWrite && invoice.status === "BROUILLON" && (
              <IssueForm action={issueInvoiceAction} invoiceId={invoice.id} />
            )}
            {canCertify && !certified && invoice.status !== "BROUILLON" && (
              <CertifyForm action={certifyAction} invoiceId={invoice.id} disabled={!check.ready} />
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={INVOICE_STATUS[invoice.status].tone} dot>
          {INVOICE_STATUS[invoice.status].label}
        </Badge>
        <Badge tone={FNE_STATUS[invoice.fneStatus].tone}>
          {FNE_STATUS[invoice.fneStatus].label}
        </Badge>
        <Badge tone="neutral">{TEMPLATE_LABELS[invoice.fneTemplate]}</Badge>
        <Badge tone="neutral">{PAYMENT_METHOD_LABELS[invoice.paymentMethod]}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        {/* ── Colonne principale ──────────────────────────────────── */}
        <div className="space-y-6">
          {/* Certification FNE */}
          <Card className={certified ? "border-gold-2/35" : undefined}>
            <CardHeader
              title="Certification — plateforme FNE"
              subtitle="Direction Générale des Impôts, Côte d'Ivoire"
              icon="seal"
            />

            {certified && invoice.fneReference && invoice.fneVerificationUrl ? (
              <div className="space-y-4">
                <FneSticker
                  reference={invoice.fneReference}
                  verificationUrl={invoice.fneVerificationUrl}
                  ncc={org.ncc}
                  certifiedAt={invoice.fneCertifiedAt}
                />

                <dl className="text-base">
                  <DefRow label="Référence normalisée" mono>{invoice.fneReference}</DefRow>
                  <DefRow label="Code de vérification" mono>{invoice.fneToken ?? "—"}</DefRow>
                  <DefRow label="Identifiant DGI" mono>{invoice.fneRemoteId ?? "—"}</DefRow>
                  <DefRow label="Certifiée le">{formatDateTime(invoice.fneCertifiedAt)}</DefRow>
                  <DefRow label="Solde de stickers après émission" mono>
                    {invoice.fneStickerBalance ?? "—"}
                  </DefRow>
                </dl>

                <div className="flex flex-wrap gap-2">
                  <LinkButton
                    href={`/verification/${invoice.fneToken}`}
                    variant="secondary" size="sm" icon="qr"
                  >
                    Page de vérification
                  </LinkButton>
                  <LinkButton
                    href={invoice.fneVerificationUrl} target="_blank"
                    variant="ghost" size="sm" icon="external"
                  >
                    Vérifier sur le portail DGI
                  </LinkButton>
                </div>

                {invoice.fneWarning && (
                  <Callout tone="warning" icon="warning" title="Stock de stickers bas">
                    La plateforme signale un stock de stickers électroniques proche de la
                    rupture. Rechargez votre espace FNE pour ne pas bloquer les prochaines
                    certifications.
                  </Callout>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {invoice.fneStatus === "REJETEE" && invoice.fneError && (
                  <Callout tone="danger" icon="warning" title="Dernière tentative rejetée">
                    {invoice.fneError}
                  </Callout>
                )}

                {check.blockers.length > 0 ? (
                  <div>
                    <p className="text-base text-ink-2">
                      Cette facture ne peut pas être transmise en l&apos;état. La plateforme
                      la refuserait pour les raisons suivantes :
                    </p>
                    <ul className="mt-3 space-y-2">
                      {check.blockers.map((b) => (
                        <li key={b} className="flex gap-2.5 text-base text-danger">
                          <Icon name="x" size={15} className="mt-1 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <Callout tone="success" icon="check" title="Prête pour la certification">
                    Les contrôles préalables passent : régime fiscal, identification du
                    client, point de vente, établissement et lignes de facture sont conformes
                    au contrat de l&apos;API. Un sticker électronique sera consommé.
                  </Callout>
                )}

                {invoice.status === "BROUILLON" && (
                  <p className="text-sm text-ink-3">
                    La facture est encore au brouillon. Émettez-la d&apos;abord : la
                    certification fige le document et lui attribue un numéro normalisé
                    en série annuelle ininterrompue.
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Détail des lignes */}
          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader title="Détail de la prestation" icon="list" />
            </div>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[720px] border-collapse text-base">
                <thead>
                  <tr>
                    <Th>Désignation</Th>
                    <Th align="right">Qté</Th>
                    <Th align="right">P.U. HT</Th>
                    <Th align="right">Remise</Th>
                    <Th>TVA</Th>
                    <Th align="right">Base HT</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line, i) => {
                    const computed = totals.lines[i];
                    return (
                      <Tr key={line.id}>
                        <Td>
                          <span className="block font-medium text-ink">{line.description}</span>
                          {line.reference && (
                            <span className="mt-0.5 block font-mono text-xs text-ink-4">
                              {line.reference}
                              {line.fneItemId && " · article identifié auprès de la DGI"}
                            </span>
                          )}
                        </Td>
                        <Td align="right" className="font-mono text-sm tabular-nums">
                          {formatNumber(line.quantity)} {line.unit}
                        </Td>
                        <Td align="right"><Amount value={line.unitPrice} className="text-sm" /></Td>
                        <Td align="right" className="text-sm text-ink-3">
                          {line.discount ? `${line.discount} %` : "—"}
                        </Td>
                        <Td className="text-sm text-ink-3">{VAT_SHORT[line.vatCode]}</Td>
                        <Td align="right"><Amount value={computed?.base ?? 0} className="text-sm" /></Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Récapitulatif fiscal */}
            <div className="border-t border-line bg-surface-2/50 p-5">
              <dl className="ml-auto max-w-sm space-y-1.5 text-base">
                <div className="flex justify-between">
                  <dt className="text-ink-3">Sous-total HT</dt>
                  <dd><Amount value={totals.subtotal} /></dd>
                </div>
                {totals.globalDiscount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-ink-3">Remise commerciale ({totals.globalDiscount} %)</dt>
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
                      <span className="ml-1 text-xs text-ink-4">sur {formatXOF(v.base)}</span>
                    </dt>
                    <dd><Amount value={v.amount} className="text-sm" /></dd>
                  </div>
                ))}

                {totals.customTaxBreakdown.map((t) => (
                  <div key={t.label} className="flex justify-between">
                    <dt className="text-ink-3">
                      {t.label} <span className="text-xs text-ink-4">({t.rate} %)</span>
                    </dt>
                    <dd><Amount value={t.amount} className="text-sm" /></dd>
                  </div>
                ))}

                <div className="flex items-baseline justify-between border-t border-line-2 pt-2">
                  <dt className="font-display text-md font-semibold text-ink">Total TTC</dt>
                  <dd><Amount value={totals.total} className="text-lg font-semibold" /></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-3">Déjà réglé</dt>
                  <dd><Amount value={invoice.paidAmount} tone="success" /></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-ink-2">Reste dû</dt>
                  <dd><Amount value={remaining} tone={remaining > 0 ? "danger" : "muted"} /></dd>
                </div>
              </dl>
            </div>
          </Card>

          {/* Journal des échanges DGI */}
          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader
                title="Journal des échanges avec la DGI"
                subtitle="Toute requête et toute réponse, conservées pour un éventuel contrôle"
                icon="list"
              />
            </div>
            {logs.length === 0 ? (
              <EmptyState icon="list" title="Aucun échange" description="Cette facture n'a jamais été transmise." />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {logs.map((log) => (
                  <li key={log.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3">
                    <Badge tone={log.success ? "success" : "danger"} dot>
                      {log.statusCode}
                    </Badge>
                    <span className="font-mono text-xs text-ink-2">
                      {log.method} {log.endpoint}
                    </span>
                    <span className="text-xs text-ink-4">
                      {log.mode === "live" ? "production" : "simulateur"} · {log.durationMs} ms
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-ink-4">
                      {formatDateTime(log.createdAt)}
                    </span>
                    {log.errorMessage && (
                      <span className="w-full font-mono text-xs text-danger">
                        {log.errorCode} — {log.errorMessage}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ── Colonne latérale ────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Client" icon="building" />
            <p className="font-display text-md font-semibold text-ink">
              <Link href={`/societes/${invoice.company.id}`} className="hover:text-brand">
                {invoice.clientCompanyName}
              </Link>
            </p>
            <dl className="mt-3 text-base">
              <DefRow label="NCC" mono>{invoice.clientNcc ?? "Non applicable"}</DefRow>
              <DefRow label="Régime FNE">{TEMPLATE_LABELS[invoice.fneTemplate]}</DefRow>
              <DefRow label="Téléphone" mono>{invoice.clientPhone}</DefRow>
              <DefRow label="E-mail">{invoice.clientEmail}</DefRow>
              {invoice.foreignCurrency && (
                <DefRow label="Devise" mono>
                  {invoice.foreignCurrency} @ {invoice.foreignCurrencyRate}
                </DefRow>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Émission" icon="calendar" />
            <dl className="text-base">
              <DefRow label="Date d'émission">{formatDate(invoice.issueDate)}</DefRow>
              <DefRow label="Échéance">{formatDate(invoice.dueDate)}</DefRow>
              <DefRow label="Point de vente" mono>{invoice.pointOfSale}</DefRow>
              <DefRow label="Établissement">{invoice.establishment}</DefRow>
              <DefRow label="Émetteur">{invoice.owner?.name ?? "—"}</DefRow>
              {invoice.quote && (
                <DefRow label="Devis d'origine">
                  <Link href={`/devis/${invoice.quote.id}`} className="font-mono text-sm text-brand hover:underline">
                    {invoice.quote.number}
                  </Link>
                </DefRow>
              )}
              {invoice.project && (
                <DefRow label="Projet">
                  <Link href={`/projets/${invoice.project.id}`} className="text-brand hover:underline">
                    {invoice.project.code}
                  </Link>
                </DefRow>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="Règlements"
              subtitle={`${invoice.payments.length} mouvement${invoice.payments.length > 1 ? "s" : ""}`}
              icon="check"
            />
            <Progress
              value={totals.total > 0 ? (invoice.paidAmount / totals.total) * 100 : 0}
              tone={remaining === 0 ? "success" : invoice.status === "EN_RETARD" ? "danger" : "brand"}
            />
            <p className="mt-2 text-sm text-ink-3">
              {formatXOF(invoice.paidAmount)} encaissés sur {formatXOF(totals.total)}
            </p>

            {invoice.payments.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-line pt-3">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3 text-base">
                    <span className="min-w-0">
                      <span className="block text-ink">{PAYMENT_METHOD_LABELS[p.method]}</span>
                      <span className="block text-xs text-ink-4">
                        {formatDate(p.paidAt)}
                        {p.reference && ` · ${p.reference}`}
                      </span>
                    </span>
                    <Amount value={p.amount} tone="success" className="text-sm" />
                  </li>
                ))}
              </ul>
            )}

            {canWrite && remaining > 0 && invoice.status !== "BROUILLON" && (
              <div className="mt-4 border-t border-line pt-4">
                <PaymentForm
                  action={recordPaymentAction}
                  invoiceId={invoice.id}
                  remaining={remaining}
                />
              </div>
            )}
          </Card>

          {/* Avoirs */}
          {(invoice.creditNotes.length > 0 || (canCertify && invoice.fneStatus === "CERTIFIEE")) && (
            <Card>
              <CardHeader title="Avoirs" icon="refresh" />
              {invoice.creditNotes.length > 0 ? (
                <ul className="mb-4 space-y-3">
                  {invoice.creditNotes.map((note) => (
                    <li key={note.id} className="rounded-md border border-line bg-surface-2/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-medium text-ink">{note.number}</span>
                        <Badge tone={note.fneReference ? "gold" : "danger"}>
                          {note.fneReference ? "Certifié" : "Non certifié"}
                        </Badge>
                      </div>
                      {note.fneReference && (
                        <p className="mt-1.5 font-mono text-xs text-gold">{note.fneReference}</p>
                      )}
                      <p className="mt-1.5 text-sm leading-snug text-ink-3">{note.reason}</p>
                      <p className="mt-1 text-xs text-ink-4">{formatDate(note.issuedAt)}</p>
                      {note.fneError && (
                        <p className="mt-1.5 text-xs text-danger">{note.fneError}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-4 text-sm text-ink-3">
                  Aucun avoir n&apos;a été émis sur cette facture.
                </p>
              )}

              {canCertify && invoice.fneStatus === "CERTIFIEE" && (
                <CreditNoteForm action={createCreditNoteAction} invoiceId={invoice.id} />
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Mentions légales" icon="info" />
            <p className="text-sm leading-relaxed text-ink-3">
              {invoice.footer ??
                `Règlement à échéance. Pénalité de retard de ${LATE_PENALTY_MONTHLY} % par mois entamé.`}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
