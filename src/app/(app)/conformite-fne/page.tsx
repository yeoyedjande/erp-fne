import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { can } from "@/lib/permissions";
import { totalsOf } from "@/lib/invoices";
import { getMode, getBaseUrl, hasApiKey } from "@/lib/fne/client";
import {
  FNE_ENDPOINTS, FNE_ERROR_CODES, STICKER_WARNING_THRESHOLD,
  VAT_LABELS, VAT_RATES,
} from "@/lib/fne/constants";
import { FNE_STATUS } from "@/lib/business";
import { formatDate, formatDateTime, formatXOF } from "@/lib/format";
import {
  Amount, Badge, Callout, Card, CardHeader, DefRow, EmptyState,
  Icon, LinkButton, PageHeader, Progress, StatCard, Td, Th, Tr,
} from "@/components/ui";
import { certifyBatchAction, setStickerBalanceAction } from "./actions";
import { BatchCertify, PayloadInspector, StickerBalanceForm } from "./FneControls";

export const metadata = { title: "Conformité FNE" };
export const dynamic = "force-dynamic";

export default async function FneCompliancePage() {
  const user = await requireCapability("invoices.read");
  const canCertify = can(user.role, "fne.certify");
  const canConfigure = can(user.role, "fne.settings");

  const [org, invoices, logs, creditNotes] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: "org" } }),
    prisma.invoice.findMany({
      include: {
        lines: { include: { customTaxes: true } },
        customTaxes: true,
        company: { select: { id: true, name: true } },
      },
      orderBy: { issueDate: "desc" },
    }),
    prisma.fneLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { invoice: { select: { id: true, number: true } } },
    }),
    prisma.creditNote.findMany({
      orderBy: { issuedAt: "desc" },
      include: { invoice: { select: { id: true, number: true } } },
    }),
  ]);

  const issued = invoices.filter((i) => i.status !== "BROUILLON" && i.status !== "ANNULEE");
  const certified = issued.filter((i) => i.fneStatus === "CERTIFIEE" || i.fneStatus === "AVOIR_EMIS");
  const pending = issued.filter((i) => i.fneStatus === "NON_SOUMISE" || i.fneStatus === "REJETEE");
  const rate = issued.length > 0 ? (certified.length / issued.length) * 100 : 100;
  const lowStock = org.fneStickerBalance < STICKER_WARNING_THRESHOLD;

  /* Ventilation de la TVA collectée par code FNE. */
  const vatByCode = new Map<string, { base: number; amount: number }>();
  for (const inv of certified) {
    for (const row of totalsOf(inv as never).vatBreakdown) {
      const cur = vatByCode.get(row.label) ?? { base: 0, amount: 0 };
      cur.base += row.base;
      cur.amount += row.amount;
      vatByCode.set(row.label, cur);
    }
  }

  const successCount = logs.filter((l) => l.success).length;
  const avgLatency = logs.length
    ? Math.round(logs.reduce((s, l) => s + l.durationMs, 0) / logs.length)
    : 0;

  const mode = getMode();

  return (
    <>
      <PageHeader
        title="Conformité FNE"
        subtitle="Interfaçage avec la plateforme de facture normalisée électronique de la Direction Générale des Impôts."
        action={
          canCertify && pending.length > 0 ? (
            <BatchCertify action={certifyBatchAction} count={pending.length} />
          ) : undefined
        }
      />

      {/* Mode d'exécution — information capitale, affichée sans détour */}
      <div className="mb-6">
        {mode === "mock" ? (
          <Callout tone="warning" icon="info" title="Mode simulateur">
            La plateforme rejoue localement le contrat de l&apos;API FNE : mêmes
            validations, mêmes codes d&apos;erreur, même format de référence normalisée,
            même décompte de stickers. <strong>Aucune donnée n&apos;est transmise à la
            DGI.</strong> Pour passer en production, renseignez <code className="font-mono text-xs">FNE_MODE=live</code>,{" "}
            <code className="font-mono text-xs">FNE_BASE_URL</code> et{" "}
            <code className="font-mono text-xs">FNE_API_KEY</code> — la clé étant délivrée
            par la DGI après validation de vos spécimens de factures.
          </Callout>
        ) : hasApiKey() ? (
          <Callout tone="success" icon="check" title="Mode production">
            Les certifications sont transmises à <code className="font-mono text-xs">{getBaseUrl()}</code>{" "}
            avec la clé API délivrée par la DGI.
          </Callout>
        ) : (
          <Callout tone="danger" icon="warning" title="Mode production sans clé API">
            <code className="font-mono text-xs">FNE_MODE=live</code> est actif mais{" "}
            <code className="font-mono text-xs">FNE_API_KEY</code> n&apos;est pas
            renseignée : toutes les certifications échoueront en 401.
          </Callout>
        )}
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Taux de conformité"
          value={`${Math.round(rate)} %`}
          hint={`${certified.length} sur ${issued.length} factures émises`}
          icon="seal" tone="gold"
        />
        <StatCard
          label="En attente"
          value={String(pending.length)}
          hint={pending.length > 0 ? "à transmettre à la DGI" : "rien à transmettre"}
          icon="clock" tone={pending.length > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Stickers restants"
          value={String(org.fneStickerBalance)}
          hint={lowStock ? "sous le seuil d'alerte" : "stock suffisant"}
          icon="box" tone={lowStock ? "danger" : "success"}
        />
        <StatCard
          label="Avoirs certifiés"
          value={String(creditNotes.filter((c) => c.fneReference).length)}
          hint={`${creditNotes.length} avoir(s) au total`}
          icon="refresh" tone="violet"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Factures en attente */}
          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader
                title="Factures en attente de certification"
                subtitle="Une facture émise doit être certifiée avant d'être remise au client"
                icon="invoice"
              />
            </div>
            {pending.length === 0 ? (
              <EmptyState
                icon="check"
                title="Toutes les factures émises sont certifiées"
                description="Aucune action requise. Le taux de conformité est à 100 %."
              />
            ) : (
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full min-w-[680px] border-collapse text-base">
                  <thead>
                    <tr>
                      <Th>Numéro</Th>
                      <Th>Client</Th>
                      <Th>Émission</Th>
                      <Th align="right">Total TTC</Th>
                      <Th>État</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((inv) => (
                      <Tr key={inv.id} href={`/factures/${inv.id}`}>
                        <Td>
                          <Link href={`/factures/${inv.id}`} className="font-mono text-sm font-medium text-ink hover:text-brand">
                            {inv.number}
                          </Link>
                        </Td>
                        <Td>{inv.company.name}</Td>
                        <Td className="text-sm text-ink-3">{formatDate(inv.issueDate)}</Td>
                        <Td align="right"><Amount value={totalsOf(inv as never).total} /></Td>
                        <Td>
                          <Badge tone={FNE_STATUS[inv.fneStatus].tone}>
                            {FNE_STATUS[inv.fneStatus].label}
                          </Badge>
                          {inv.fneError && (
                            <span className="mt-1 block max-w-[16rem] truncate text-xs text-danger">
                              {inv.fneError}
                            </span>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Journal des appels */}
          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader
                title="Journal des appels API"
                subtitle={`${successCount}/${logs.length} succès · latence moyenne ${avgLatency} ms`}
                icon="list"
              />
            </div>
            {logs.length === 0 ? (
              <EmptyState icon="list" title="Aucun échange enregistré" />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {logs.map((log) => (
                  <li key={log.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <Badge tone={log.success ? "success" : "danger"} dot>
                        {log.statusCode}
                      </Badge>
                      <span className="font-mono text-xs text-ink-2">
                        POST {log.endpoint.length > 46 ? `${log.endpoint.slice(0, 46)}…` : log.endpoint}
                      </span>
                      {log.invoice && (
                        <Link
                          href={`/factures/${log.invoice.id}`}
                          className="font-mono text-xs text-brand hover:underline"
                        >
                          {log.invoice.number}
                        </Link>
                      )}
                      <span className="text-xs text-ink-4">
                        {log.mode === "live" ? "production" : "simulateur"} · {log.durationMs} ms
                      </span>
                      <span className="ml-auto text-xs tabular-nums text-ink-4">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>

                    {log.errorMessage && (
                      <p className="mt-1.5 text-xs text-danger">
                        <span className="font-mono">{log.errorCode}</span> — {log.errorMessage}
                        <span className="ml-1.5 text-ink-4">
                          ({FNE_ERROR_CODES[log.statusCode] ?? "erreur"})
                        </span>
                      </p>
                    )}

                    <PayloadInspector request={log.requestBody} response={log.responseBody} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ── Colonne latérale ────────────────────────────────────── */}
        <div className="space-y-6">
          <Card className={lowStock ? "border-danger/30" : "border-gold-2/35"}>
            <CardHeader title="Stickers électroniques" icon="seal" />
            <p className="font-display text-3xl font-semibold tabular-nums text-ink">
              {org.fneStickerBalance}
            </p>
            <p className="mt-0.5 text-sm text-ink-3">certifications encore possibles</p>

            <Progress
              value={Math.min(100, (org.fneStickerBalance / 500) * 100)}
              tone={lowStock ? "danger" : "gold"}
              className="mt-4"
            />
            <p className="mt-2 text-xs text-ink-4">
              Seuil d&apos;alerte de la DGI : {STICKER_WARNING_THRESHOLD} stickers.
            </p>

            {lowStock && (
              <div className="mt-4">
                <Callout tone="danger" icon="warning">
                  Rechargez votre espace FNE : sans sticker, aucune facture ne peut plus
                  être certifiée, donc remise à un client.
                </Callout>
              </div>
            )}

            {canConfigure && (
              <div className="mt-4 border-t border-line pt-4">
                <StickerBalanceForm action={setStickerBalanceAction} current={org.fneStickerBalance} />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Identité fiscale" icon="building" />
            <dl className="text-base">
              <DefRow label="Raison sociale">{org.legalName}</DefRow>
              <DefRow label="NCC" mono>{org.ncc}</DefRow>
              <DefRow label="RCCM" mono>{org.rccm}</DefRow>
              <DefRow label="Régime">{org.taxRegime}</DefRow>
              <DefRow label="Point de vente" mono>{org.defaultPointOfSale}</DefRow>
              <DefRow label="Établissement">{org.defaultEstablishment}</DefRow>
            </dl>
          </Card>

          <Card>
            <CardHeader title="TVA collectée" subtitle="Sur les factures certifiées" icon="chart" />
            {vatByCode.size === 0 ? (
              <p className="text-sm text-ink-3">Aucune facture certifiée pour l&apos;instant.</p>
            ) : (
              <dl className="space-y-3">
                {[...vatByCode.entries()]
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([code, v]) => (
                    <div key={code} className="border-b border-line pb-3 last:border-0 last:pb-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-base text-ink">
                          <span className="font-mono text-sm">{code}</span>
                          <span className="ml-1.5 text-xs text-ink-4">
                            {VAT_RATES[code as keyof typeof VAT_RATES]} %
                          </span>
                        </dt>
                        <dd><Amount value={v.amount} className="text-sm" /></dd>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-4">
                        {VAT_LABELS[code as keyof typeof VAT_LABELS]} · base {formatXOF(v.base)}
                      </p>
                    </div>
                  ))}
              </dl>
            )}
          </Card>

          <Card>
            <CardHeader title="Points de terminaison" icon="code" />
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="eyebrow">Base</dt>
                <dd className="mt-1 break-all font-mono text-xs text-ink-2">{getBaseUrl()}</dd>
              </div>
              <div>
                <dt className="eyebrow">Certification (vente et bordereau)</dt>
                <dd className="mt-1 font-mono text-xs text-ink-2">POST {FNE_ENDPOINTS.sign}</dd>
              </div>
              <div>
                <dt className="eyebrow">Avoir</dt>
                <dd className="mt-1 font-mono text-xs text-ink-2">
                  POST /external/invoices/&#123;id&#125;/refund
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Authentification</dt>
                <dd className="mt-1 font-mono text-xs text-ink-2">
                  Authorization: Bearer {hasApiKey() ? "••••••••" : "(non configurée)"}
                </dd>
              </div>
            </dl>

            <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-4">
              Assistance DGI :{" "}
              <a href="mailto:support.fne@dgi.gouv.ci" className="text-brand hover:underline">
                support.fne@dgi.gouv.ci
              </a>
            </p>
          </Card>

          {creditNotes.length > 0 && (
            <Card padded={false}>
              <div className="p-5 pb-4">
                <CardHeader title="Avoirs émis" icon="refresh" />
              </div>
              <ul className="divide-y divide-line border-t border-line">
                {creditNotes.slice(0, 6).map((n) => (
                  <li key={n.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/factures/${n.invoice.id}`}
                        className="font-mono text-sm font-medium text-ink hover:text-brand"
                      >
                        {n.number}
                      </Link>
                      <Badge tone={n.fneReference ? "gold" : "danger"}>
                        {n.fneReference ? "Certifié" : "Échec"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-4">
                      sur {n.invoice.number} · {formatDate(n.issuedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <LinkButton href="/factures" variant="secondary" className="w-full" icon="invoice">
            Voir toutes les factures
          </LinkButton>
        </div>
      </div>
    </>
  );
}
