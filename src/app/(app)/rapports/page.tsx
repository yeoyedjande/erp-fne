import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { totalsOf } from "@/lib/invoices";
import { PIPELINE_OPEN, STAGE_LABELS, STAGE_PROBABILITY } from "@/lib/business";
import { VAT_LABELS } from "@/lib/fne/constants";
import { formatNumber, formatXOF } from "@/lib/format";
import {
  Amount, Badge, Card, CardHeader, EmptyState, PageHeader, Progress,
  StatCard, TableShell, Td, Th, Tr,
} from "@/components/ui";
import { DonutChart, RevenueAreaChart, StageBarChart } from "@/components/charts/Charts";

export const metadata = { title: "Rapports" };
export const dynamic = "force-dynamic";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export default async function ReportsPage() {
  await requireCapability("reports.read");

  const [invoices, opportunities, companies, products, users] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { notIn: ["BROUILLON", "ANNULEE"] } },
      include: {
        lines: { include: { customTaxes: true } },
        customTaxes: true,
        company: { select: { id: true, name: true, industry: true } },
      },
    }),
    prisma.opportunity.findMany({ include: { owner: { select: { id: true, name: true } } } }),
    prisma.company.findMany({ select: { id: true, name: true, industry: true, status: true } }),
    prisma.product.findMany({ select: { id: true, name: true, category: true } }),
    prisma.user.findMany({
      where: { role: { in: ["SALES", "MANAGER", "SUPER_ADMIN"] } },
      select: { id: true, name: true, accentToken: true },
    }),
  ]);

  const withTotals = invoices.map((inv) => ({ inv, totals: totalsOf(inv as never) }));
  const billed = withTotals.reduce((s, x) => s + x.totals.total, 0);
  const collected = withTotals.reduce((s, x) => s + x.inv.paidAmount, 0);
  const vatCollected = withTotals.reduce((s, x) => s + x.totals.vatTotal, 0);

  /* Série mensuelle */
  const now = new Date();
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, mois: MONTHS[d.getMonth()], facture: 0, encaisse: 0 };
  });
  const idx = new Map(monthly.map((m, i) => [m.key, i]));
  for (const { inv, totals } of withTotals) {
    const d = new Date(inv.issueDate);
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) {
      monthly[i].facture += totals.total;
      monthly[i].encaisse += inv.paidAmount;
    }
  }

  /* Chiffre d'affaires par secteur d'activité */
  const bySector = new Map<string, number>();
  for (const { inv, totals } of withTotals) {
    bySector.set(inv.company.industry, (bySector.get(inv.company.industry) ?? 0) + totals.total);
  }
  const sectors = [...bySector.entries()]
    .map(([nom, valeur]) => ({ nom, valeur }))
    .sort((a, b) => b.valeur - a.valeur);

  /* Meilleurs clients */
  const byClient = new Map<string, { name: string; id: string; total: number; count: number }>();
  for (const { inv, totals } of withTotals) {
    const cur = byClient.get(inv.company.id) ?? {
      name: inv.company.name, id: inv.company.id, total: 0, count: 0,
    };
    cur.total += totals.total;
    cur.count += 1;
    byClient.set(inv.company.id, cur);
  }
  const topClients = [...byClient.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  const maxClient = topClients[0]?.total ?? 1;

  /* Performance commerciale */
  const perf = users
    .map((u) => {
      const own = opportunities.filter((o) => o.owner?.id === u.id);
      const won = own.filter((o) => o.stage === "GAGNE");
      const lost = own.filter((o) => o.stage === "PERDU");
      const open = own.filter((o) => PIPELINE_OPEN.includes(o.stage));
      return {
        ...u,
        won: won.length,
        lost: lost.length,
        wonAmount: won.reduce((s, o) => s + o.amount, 0),
        weighted: open.reduce((s, o) => s + (o.amount * STAGE_PROBABILITY[o.stage]) / 100, 0),
        rate: won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0,
      };
    })
    .sort((a, b) => b.wonAmount - a.wonAmount);

  /* Pipeline par étape */
  const stageData = PIPELINE_OPEN.map((stage) => {
    const rows = opportunities.filter((o) => o.stage === stage);
    return {
      etape: STAGE_LABELS[stage],
      montant: Math.round(rows.reduce((s, o) => s + (o.amount * STAGE_PROBABILITY[stage]) / 100, 0)),
      nombre: rows.length,
    };
  });

  /* Ventilation fiscale */
  const vatRows = new Map<string, { base: number; amount: number }>();
  for (const { totals } of withTotals) {
    for (const v of totals.vatBreakdown) {
      const cur = vatRows.get(v.label) ?? { base: 0, amount: 0 };
      cur.base += v.base;
      cur.amount += v.amount;
      vatRows.set(v.label, cur);
    }
  }

  return (
    <>
      <PageHeader
        title="Rapports"
        subtitle="Lecture consolidée de l'activité commerciale, financière et fiscale de Markel Technology."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Chiffre d'affaires TTC" value={formatXOF(billed, { compact: true })} icon="invoice" tone="brand" />
        <StatCard
          label="Taux de recouvrement"
          value={`${billed > 0 ? Math.round((collected / billed) * 100) : 0} %`}
          hint={formatXOF(collected, { compact: true })} icon="check" tone="success"
        />
        <StatCard label="TVA collectée" value={formatXOF(vatCollected, { compact: true })} icon="seal" tone="gold" />
        <StatCard label="Panier moyen" value={formatXOF(withTotals.length ? billed / withTotals.length : 0, { compact: true })} icon="chart" tone="violet" />
      </div>

      <div className="mb-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Évolution du chiffre d'affaires" subtitle="Douze derniers mois" icon="trend" />
          <RevenueAreaChart data={monthly} />
        </Card>
        <Card>
          <CardHeader title="Répartition par secteur" subtitle="Toutes taxes comprises" icon="chart" />
          {sectors.length ? <DonutChart data={sectors.slice(0, 6)} /> : <EmptyState icon="chart" title="Aucune donnée" />}
        </Card>
      </div>

      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pipeline pondéré par étape" icon="target" />
          <StageBarChart data={stageData} />
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader title="Ventilation fiscale" subtitle="Base et taxe par régime de TVA" icon="seal" />
          </div>
          {vatRows.size === 0 ? (
            <EmptyState icon="seal" title="Aucune facture" />
          ) : (
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full border-collapse text-base">
                <thead>
                  <tr>
                    <Th>Régime</Th>
                    <Th align="right">Base HT</Th>
                    <Th align="right">TVA</Th>
                  </tr>
                </thead>
                <tbody>
                  {[...vatRows.entries()].map(([code, v]) => (
                    <Tr key={code}>
                      <Td>
                        <span className="font-mono text-sm font-medium text-ink">{code}</span>
                        <span className="mt-0.5 block text-xs text-ink-4">
                          {VAT_LABELS[code as keyof typeof VAT_LABELS]}
                        </span>
                      </Td>
                      <Td align="right"><Amount value={v.base} /></Td>
                      <Td align="right"><Amount value={v.amount} /></Td>
                    </Tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title="Meilleurs clients" subtitle="Chiffre d'affaires facturé" icon="building" />
          <ul className="space-y-3.5">
            {topClients.map((c) => (
              <li key={c.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-base text-ink">{c.name}</span>
                  <Amount value={c.total} compact className="shrink-0 text-sm" />
                </div>
                <Progress value={(c.total / maxClient) * 100} tone="brand" height={5} />
                <p className="mt-1 text-xs text-ink-4">
                  {c.count} facture{c.count > 1 ? "s" : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader title="Performance commerciale" subtitle="Par responsable d'affaires" icon="users" />
          </div>
          <TableShell className="border-0 shadow-none">
            <thead>
              <tr>
                <Th>Commercial</Th>
                <Th align="center">Gagnées</Th>
                <Th align="center">Perdues</Th>
                <Th align="center">Taux</Th>
                <Th align="right">CA gagné</Th>
                <Th align="right">Pipeline pondéré</Th>
              </tr>
            </thead>
            <tbody>
              {perf.map((p) => (
                <Tr key={p.id}>
                  <Td className="font-medium text-ink">{p.name}</Td>
                  <Td align="center" className="font-mono text-sm tabular-nums text-success">{p.won}</Td>
                  <Td align="center" className="font-mono text-sm tabular-nums text-danger">{p.lost}</Td>
                  <Td align="center">
                    <Badge tone={p.rate >= 60 ? "success" : p.rate >= 40 ? "warning" : "danger"}>
                      {p.rate} %
                    </Badge>
                  </Td>
                  <Td align="right"><Amount value={p.wonAmount} compact /></Td>
                  <Td align="right"><Amount value={p.weighted} compact tone="muted" /></Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      </div>

      <p className="mt-6 text-sm text-ink-4">
        Périmètre : {formatNumber(withTotals.length)} factures émises,{" "}
        {formatNumber(opportunities.length)} affaires, {formatNumber(companies.length)} sociétés,{" "}
        {formatNumber(products.length)} offres au catalogue.
      </p>
    </>
  );
}
