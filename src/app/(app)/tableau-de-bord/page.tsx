import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { computeInvoice } from "@/lib/fne/compute";
import {
  FNE_STATUS, INVOICE_STATUS, PIPELINE_OPEN, STAGE_LABELS,
  STAGE_PROBABILITY, TICKET_PRIORITY,
} from "@/lib/business";
import { STICKER_WARNING_THRESHOLD } from "@/lib/fne/constants";
import { formatDate, formatRelative, formatXOF } from "@/lib/format";
import {
  Amount, Badge, Card, CardHeader, EmptyState, Icon, LinkButton,
  PageHeader, Progress, StatCard, Td, Th, Tr,
} from "@/components/ui";
import { FneChip } from "@/components/FneSticker";
import { DonutChart, RevenueAreaChart, StageBarChart } from "@/components/charts/Charts";

export const metadata = { title: "Tableau de bord" };
export const dynamic = "force-dynamic";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export default async function DashboardPage() {
  const user = await requireCapability("crm.read");

  const [invoices, opportunities, org, tickets, projects, activities, quotesPending] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { status: { not: "BROUILLON" } },
        include: {
          lines: { include: { customTaxes: true } },
          customTaxes: true,
          company: { select: { name: true } },
        },
        orderBy: { issueDate: "desc" },
      }),
      prisma.opportunity.findMany({
        include: { company: { select: { name: true } }, owner: { select: { name: true } } },
      }),
      prisma.organization.findUnique({ where: { id: "org" } }),
      prisma.ticket.findMany({
        where: { status: { in: ["NOUVEAU", "EN_COURS", "EN_ATTENTE_CLIENT"] } },
        include: { company: { select: { name: true } } },
        orderBy: { slaDueAt: "asc" },
        take: 5,
      }),
      prisma.project.findMany({
        where: { status: { in: ["EN_COURS", "CADRAGE", "EN_PAUSE"] } },
        include: { company: { select: { name: true } } },
        orderBy: { endDate: "asc" },
        take: 5,
      }),
      prisma.activity.findMany({
        where: { status: "PLANIFIEE", ownerId: user.id },
        include: { company: { select: { name: true } } },
        orderBy: { dueAt: "asc" },
        take: 6,
      }),
      prisma.quote.count({ where: { status: "ENVOYE" } }),
    ]);

  /* ── Agrégats financiers ───────────────────────────────────────── */
  const withTotals = invoices.map((inv) => ({
    inv,
    totals: computeInvoice(
      inv.lines
        .sort((a, b) => a.position - b.position)
        .map((l) => ({
          description: l.description, quantity: l.quantity, unitPrice: l.unitPrice,
          discount: l.discount, vatCode: l.vatCode,
          customTaxes: l.customTaxes.map((t) => ({ name: t.name, rate: t.rate })),
        })),
      inv.discount,
      inv.customTaxes.filter((t) => !t.lineId).map((t) => ({ name: t.name, rate: t.rate })),
    ),
  }));

  const billed = withTotals.reduce((s, x) => s + x.totals.total, 0);
  const collected = withTotals.reduce((s, x) => s + x.inv.paidAmount, 0);
  const outstanding = billed - collected;
  const overdue = withTotals
    .filter((x) => x.inv.status === "EN_RETARD")
    .reduce((s, x) => s + (x.totals.total - x.inv.paidAmount), 0);

  const weightedPipeline = opportunities
    .filter((o) => PIPELINE_OPEN.includes(o.stage))
    .reduce((s, o) => s + (o.amount * STAGE_PROBABILITY[o.stage]) / 100, 0);

  /* ── Série mensuelle sur 12 mois ───────────────────────────────── */
  const now = new Date();
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, mois: MONTHS[d.getMonth()], facture: 0, encaisse: 0 };
  });
  const indexOf = new Map(monthly.map((m, i) => [m.key, i]));
  for (const { inv, totals } of withTotals) {
    const d = new Date(inv.issueDate);
    const i = indexOf.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) {
      monthly[i].facture += totals.total;
      monthly[i].encaisse += inv.paidAmount;
    }
  }

  /* ── Pipeline par étape ────────────────────────────────────────── */
  const stageData = PIPELINE_OPEN.map((stage) => {
    const rows = opportunities.filter((o) => o.stage === stage);
    return {
      etape: STAGE_LABELS[stage],
      montant: Math.round(rows.reduce((s, o) => s + (o.amount * STAGE_PROBABILITY[stage]) / 100, 0)),
      nombre: rows.length,
    };
  });

  /* ── Répartition du chiffre d'affaires par famille d'offre ─────── */
  const byCategory = new Map<string, number>();
  const productIds = withTotals.flatMap((x) => x.inv.lines.map((l) => l.productId).filter(Boolean)) as string[];
  const catalog = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, category: true },
  });
  const catOf = new Map(catalog.map((p) => [p.id, p.category]));
  for (const { inv, totals } of withTotals) {
    const ordered = inv.lines.sort((a, b) => a.position - b.position);
    ordered.forEach((l, i) => {
      const cat = (l.productId && catOf.get(l.productId)) || "Autres prestations";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + (totals.lines[i]?.base ?? 0));
    });
  }
  const donut = [...byCategory.entries()]
    .map(([nom, valeur]) => ({ nom, valeur }))
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, 6);

  /* ── Conformité FNE ────────────────────────────────────────────── */
  const certified = invoices.filter((i) => i.fneStatus === "CERTIFIEE" || i.fneStatus === "AVOIR_EMIS").length;
  const toCertify = invoices.filter((i) => i.fneStatus === "NON_SOUMISE" || i.fneStatus === "REJETEE").length;
  const balance = org?.fneStickerBalance ?? 0;
  const lowStock = balance < STICKER_WARNING_THRESHOLD;

  const recent = withTotals.slice(0, 6);

  /* Variation du mois en cours contre le mois précédent. */
  const thisMonth = monthly[11].facture;
  const lastMonth = monthly[10].facture;
  const delta = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : undefined;

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.name.split(" ")[0]}`}
        subtitle={`Voici l'état de l'activité de Markel Technology au ${formatDate(now)}.`}
        action={
          <>
            <LinkButton href="/factures" variant="secondary" icon="invoice">Factures</LinkButton>
            <LinkButton href="/pipeline" icon="target">Ouvrir le pipeline</LinkButton>
          </>
        }
      />

      {/* Bandeau de conformité — l'information la plus sensible en premier */}
      <section
        className={`mb-6 rounded-md border p-4 sm:p-5 ${
          lowStock || toCertify > 0
            ? "border-gold-2/40 bg-gold-soft"
            : "border-line bg-surface"
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-gold-2/30 bg-surface text-gold">
              <Icon name="seal" size={20} />
            </span>
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-gold">
                Conformité FNE
              </p>
              <p className="text-base text-ink-2">Plateforme DGI — Côte d&apos;Ivoire</p>
            </div>
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dd className="font-mono text-lg font-semibold tabular-nums text-ink">{certified}</dd>
              <dt className="text-xs text-ink-3">factures certifiées</dt>
            </div>
            <div>
              <dd className="font-mono text-lg font-semibold tabular-nums text-ink">{toCertify}</dd>
              <dt className="text-xs text-ink-3">en attente de certification</dt>
            </div>
            <div>
              <dd className={`font-mono text-lg font-semibold tabular-nums ${lowStock ? "text-danger" : "text-ink"}`}>
                {balance}
              </dd>
              <dt className="text-xs text-ink-3">stickers restants</dt>
            </div>
          </dl>

          <div className="ml-auto">
            <LinkButton href="/conformite-fne" variant="secondary" size="sm" icon="arrowRight">
              Ouvrir le module
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Indicateurs clés */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Facturé — 12 mois" value={formatXOF(billed, { compact: true })}
          delta={delta} hint="contre le mois précédent" icon="invoice" tone="brand" href="/factures"
        />
        <StatCard
          label="Encaissé" value={formatXOF(collected, { compact: true })}
          hint={`${billed > 0 ? Math.round((collected / billed) * 100) : 0} % du facturé`}
          icon="check" tone="success" href="/factures"
        />
        <StatCard
          label="Reste à encaisser" value={formatXOF(outstanding, { compact: true })}
          hint={overdue > 0 ? `dont ${formatXOF(overdue, { compact: true })} en retard` : "aucun retard"}
          icon="clock" tone={overdue > 0 ? "danger" : "neutral"} href="/factures"
        />
        <StatCard
          label="Pipeline pondéré" value={formatXOF(weightedPipeline, { compact: true })}
          hint={`${opportunities.filter((o) => PIPELINE_OPEN.includes(o.stage)).length} affaires ouvertes · ${quotesPending} devis en attente`}
          icon="target" tone="violet" href="/pipeline"
        />
      </section>

      {/* Graphiques */}
      <section className="mb-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title="Facturation et encaissements"
            subtitle="Douze derniers mois, toutes taxes comprises"
            icon="trend"
          />
          <RevenueAreaChart data={monthly} />
        </Card>

        <Card>
          <CardHeader title="Chiffre d'affaires par offre" subtitle="Base hors taxes" icon="box" />
          {donut.length > 0 ? (
            <DonutChart data={donut} />
          ) : (
            <EmptyState icon="box" title="Aucune facture exploitable" />
          )}
        </Card>
      </section>

      <section className="mb-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader
            title="Pipeline pondéré par étape"
            subtitle="Montant × probabilité de l'étape"
            icon="target"
            action={<LinkButton href="/pipeline" variant="ghost" size="sm">Détail</LinkButton>}
          />
          <StageBarChart data={stageData} />
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-0">
            <CardHeader
              title="Engagements de service à risque"
              subtitle="Tickets ouverts, échéance SLA la plus proche"
              icon="lifebuoy"
              action={<LinkButton href="/tickets" variant="ghost" size="sm">Tous</LinkButton>}
            />
          </div>
          {tickets.length === 0 ? (
            <EmptyState icon="check" title="Aucun ticket ouvert" description="Tous les engagements sont tenus." />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {tickets.map((t) => {
                const late = t.slaDueAt.getTime() < Date.now();
                return (
                  <li key={t.id}>
                    <Link href={`/tickets/${t.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                      <Badge tone={TICKET_PRIORITY[t.priority].tone}>{t.priority}</Badge>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-medium text-ink">{t.subject}</span>
                        <span className="block truncate text-sm text-ink-3">{t.company.name}</span>
                      </span>
                      <span className={`shrink-0 text-xs tabular-nums ${late ? "font-medium text-danger" : "text-ink-3"}`}>
                        {late ? "En dépassement" : formatRelative(t.slaDueAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      {/* Factures récentes */}
      <section className="mb-6">
        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader
              title="Dernières factures"
              subtitle="Statut de règlement et de certification DGI"
              icon="invoice"
              action={<LinkButton href="/factures" variant="secondary" size="sm">Toutes les factures</LinkButton>}
            />
          </div>
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[820px] border-collapse text-base">
              <thead>
                <tr>
                  <Th>Numéro</Th>
                  <Th>Client</Th>
                  <Th>Émission</Th>
                  <Th align="right">Total TTC</Th>
                  <Th>Règlement</Th>
                  <Th>Certification FNE</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map(({ inv, totals }) => (
                  <Tr key={inv.id} href={`/factures/${inv.id}`}>
                    <Td>
                      <Link href={`/factures/${inv.id}`} className="font-mono text-sm font-medium text-ink hover:text-brand">
                        {inv.number}
                      </Link>
                    </Td>
                    <Td>{inv.company.name}</Td>
                    <Td className="text-sm text-ink-3">{formatDate(inv.issueDate)}</Td>
                    <Td align="right"><Amount value={totals.total} /></Td>
                    <Td><Badge tone={INVOICE_STATUS[inv.status].tone} dot>{INVOICE_STATUS[inv.status].label}</Badge></Td>
                    <Td>
                      {inv.fneReference ? (
                        <FneChip reference={inv.fneReference} />
                      ) : (
                        <Badge tone={FNE_STATUS[inv.fneStatus].tone}>{FNE_STATUS[inv.fneStatus].label}</Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Projets et activités */}
      <section className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader
              title="Projets en cours"
              subtitle="Avancement et santé budgétaire"
              icon="folder"
              action={<LinkButton href="/projets" variant="ghost" size="sm">Tous</LinkButton>}
            />
          </div>
          {projects.length === 0 ? (
            <EmptyState icon="folder" title="Aucun projet actif" />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link href={`/projets/${p.id}`} className="block px-5 py-3.5 transition-colors hover:bg-surface-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-base font-medium text-ink">{p.name}</span>
                        <span className="block truncate text-sm text-ink-3">
                          {p.company.name} · échéance {formatDate(p.endDate)}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm tabular-nums text-ink-2">{p.progress} %</span>
                    </div>
                    <Progress
                      value={p.progress}
                      tone={p.health === "CRITIQUE" ? "danger" : p.health === "VIGILANCE" ? "warning" : "brand"}
                      className="mt-2.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader
              title="Vos prochaines actions"
              subtitle="Activités qui vous sont assignées"
              icon="calendar"
              action={<LinkButton href="/activites" variant="ghost" size="sm">Agenda</LinkButton>}
            />
          </div>
          {activities.length === 0 ? (
            <EmptyState
              icon="check"
              title="Rien de planifié"
              description="Aucune activité ne vous attend pour le moment."
            />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {activities.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-line bg-surface-2 text-ink-3">
                    <Icon
                      name={
                        a.type === "APPEL" ? "phone"
                        : a.type === "EMAIL" ? "mail"
                        : a.type === "REUNION" ? "users"
                        : a.type === "TACHE" ? "check" : "file"
                      }
                      size={14}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-ink">{a.subject}</span>
                    <span className="block truncate text-sm text-ink-3">
                      {a.company?.name ?? "Interne"} · {formatRelative(a.dueAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}
