import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { can } from "@/lib/permissions";
import {
  MAX_DISCOUNT_SALES, OPPORTUNITY_STATUS, PIPELINE_OPEN,
  STAGE_LABELS, STAGE_PROBABILITY,
} from "@/lib/business";
import { daysBetween, formatDate, formatXOF } from "@/lib/format";
import { Amount, Avatar, Badge, Card, Icon, PageHeader, StatCard } from "@/components/ui";
import { moveStageAction } from "./actions";
import { StageMover } from "./StageMover";

export const metadata = { title: "Pipeline" };
export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const user = await requireCapability("pipeline.read");
  const canWrite = can(user.role, "pipeline.write");

  const opportunities = await prisma.opportunity.findMany({
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { name: true, accentToken: true } },
    },
    orderBy: [{ amount: "desc" }],
  });

  const open = opportunities.filter((o) => PIPELINE_OPEN.includes(o.stage));
  const won = opportunities.filter((o) => o.stage === "GAGNE");
  const lost = opportunities.filter((o) => o.stage === "PERDU");

  const weighted = open.reduce((s, o) => s + (o.amount * STAGE_PROBABILITY[o.stage]) / 100, 0);
  const winRate =
    won.length + lost.length > 0
      ? Math.round((won.length / (won.length + lost.length)) * 100)
      : 0;

  return (
    <>
      <PageHeader
        title="Pipeline commercial"
        subtitle={`${open.length} affaires ouvertes. La probabilité découle de l'étape : ${PIPELINE_OPEN.map((s) => `${STAGE_LABELS[s]} ${STAGE_PROBABILITY[s]} %`).join(" · ")}.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pipeline brut"
          value={formatXOF(open.reduce((s, o) => s + o.amount, 0), { compact: true })}
          icon="target" tone="brand"
        />
        <StatCard
          label="Pipeline pondéré"
          value={formatXOF(weighted, { compact: true })}
          hint="montant × probabilité d'étape" icon="trend" tone="violet"
        />
        <StatCard
          label="Taux de transformation" value={`${winRate} %`}
          hint={`${won.length} gagnées, ${lost.length} perdues`} icon="check" tone="success"
        />
        <StatCard
          label="Gagné cumulé"
          value={formatXOF(won.reduce((s, o) => s + o.amount, 0), { compact: true })}
          icon="invoice" tone="teal"
        />
      </div>

      {/* Kanban */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="grid min-w-[880px] grid-cols-4 gap-4">
          {PIPELINE_OPEN.map((stage) => {
            const rows = open.filter((o) => o.stage === stage);
            const total = rows.reduce((s, o) => s + o.amount, 0);
            return (
              <section key={stage} className="flex flex-col">
                <header className="mb-3 flex items-baseline justify-between gap-2 border-b border-line pb-2.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-ink">{STAGE_LABELS[stage]}</h2>
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-2xs tabular-nums text-ink-3">
                      {rows.length}
                    </span>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-ink-3">
                    {formatXOF(total, { compact: true })}
                  </span>
                </header>

                <ul className="space-y-2.5">
                  {rows.length === 0 && (
                    <li className="rounded-md border border-dashed border-line-2 px-3 py-6 text-center text-xs text-ink-4">
                      Aucune affaire
                    </li>
                  )}

                  {rows.map((o) => {
                    const days = daysBetween(o.expectedCloseDate);
                    const late = days < 0;
                    return (
                      <li key={o.id} className="card p-3.5">
                        <Link
                          href={`/societes/${o.company.id}`}
                          className="block text-xs text-ink-3 hover:text-brand"
                        >
                          {o.company.name}
                        </Link>
                        <p className="mt-1 text-base font-medium leading-snug text-ink">{o.title}</p>

                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <Amount value={o.amount} compact className="text-sm font-semibold" />
                          <Badge tone={OPPORTUNITY_STATUS[o.stage].tone}>
                            {STAGE_PROBABILITY[o.stage]} %
                          </Badge>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                          {o.owner ? (
                            <span className="flex items-center gap-1.5">
                              <Avatar name={o.owner.name} accent={o.owner.accentToken} size={20} />
                              <span className="truncate text-xs text-ink-3">
                                {o.owner.name.split(" ")[0]}
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-ink-4">Non attribué</span>
                          )}
                          <span
                            className={`flex items-center gap-1 text-xs tabular-nums ${
                              late ? "font-medium text-danger" : "text-ink-4"
                            }`}
                            title={`Clôture prévue le ${formatDate(o.expectedCloseDate)}`}
                          >
                            <Icon name="clock" size={11} />
                            {late ? `+${Math.abs(days)} j` : `${days} j`}
                          </span>
                        </div>

                        {canWrite && (
                          <StageMover
                            action={moveStageAction}
                            opportunityId={o.id}
                            current={o.stage}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      {/* Affaires closes */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-md font-semibold text-ink">
              <Icon name="check" size={16} className="text-success" />
              Affaires gagnées
            </h2>
            <Amount value={won.reduce((s, o) => s + o.amount, 0)} compact tone="success" />
          </div>
          <ul className="divide-y divide-line">
            {won.slice(0, 8).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-base text-ink">{o.title}</span>
                  <span className="block truncate text-xs text-ink-4">
                    {o.company.name} · {formatDate(o.closedAt)}
                  </span>
                </span>
                <Amount value={o.amount} compact className="text-sm" />
              </li>
            ))}
          </ul>
        </Card>

        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-md font-semibold text-ink">
              <Icon name="x" size={16} className="text-danger" />
              Affaires perdues
            </h2>
            <Amount value={lost.reduce((s, o) => s + o.amount, 0)} compact tone="danger" />
          </div>
          <ul className="divide-y divide-line">
            {lost.map((o) => (
              <li key={o.id} className="px-5 py-3">
                <span className="block truncate text-base text-ink">{o.title}</span>
                <span className="block truncate text-xs text-ink-4">{o.company.name}</span>
                {o.lostReason && (
                  <p className="mt-1 text-sm leading-snug text-ink-3">{o.lostReason}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="mt-6 text-sm text-ink-4">
        Rappel : une remise supérieure à {MAX_DISCOUNT_SALES} % accordée par un commercial
        requiert la validation d&apos;un gestionnaire.
      </p>
    </>
  );
}
