import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { totalsOf } from "@/lib/invoices";
import { PROJECT_HEALTH, PROJECT_STATUS, TASK_STATUS } from "@/lib/business";
import { formatDate, formatNumber, formatXOF } from "@/lib/format";
import {
  Amount, Avatar, Badge, Breadcrumb, Callout, Card, CardHeader, DefRow,
  EmptyState, Icon, PageHeader, Progress, StatCard, Td, Th, Tr,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.project.findUnique({ where: { id }, select: { name: true } });
  return { title: p?.name ?? "Projet" };
}

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("projects.read");
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      manager: { select: { name: true, accentToken: true, jobTitle: true } },
      opportunity: { select: { id: true, reference: true, title: true } },
      members: { include: { user: { select: { name: true, accentToken: true, jobTitle: true } } } },
      tasks: {
        include: { assignee: { select: { name: true, accentToken: true } } },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      },
      timeEntries: {
        include: { user: { select: { name: true } } },
        orderBy: { date: "desc" },
      },
      invoices: {
        include: { lines: { include: { customTaxes: true } }, customTaxes: true },
        orderBy: { issueDate: "desc" },
      },
    },
  });
  if (!project) notFound();

  const hours = project.timeEntries.reduce((s, e) => s + e.hours, 0);
  const billableHours = project.timeEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);

  /* Coût consommé : heures × taux journalier moyen de l'équipe, ramené à l'heure. */
  const avgDailyRate = project.members.length
    ? project.members.reduce((s, m) => s + m.dailyRate, 0) / project.members.length
    : 300_000;
  const consumed = Math.round((hours / 8) * avgDailyRate);
  const consumedRatio = project.budget > 0 ? consumed / project.budget : 0;

  const billed = project.invoices
    .filter((i) => i.status !== "BROUILLON" && i.status !== "ANNULEE")
    .reduce((s, i) => s + totalsOf(i as never).total, 0);

  const done = project.tasks.filter((t) => t.status === "TERMINE").length;

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb items={[{ label: "Projets", href: "/projets" }, { label: project.code }]} />
        }
        title={project.name}
        subtitle={project.description ?? undefined}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={PROJECT_STATUS[project.status].tone} dot>{PROJECT_STATUS[project.status].label}</Badge>
        <Badge tone={PROJECT_HEALTH[project.health].tone}>{PROJECT_HEALTH[project.health].label}</Badge>
        <Badge tone="neutral">{project.code}</Badge>
      </div>

      {project.health !== "BON" && (
        <div className="mb-6">
          <Callout
            tone={project.health === "CRITIQUE" ? "danger" : "warning"}
            icon="warning"
            title={project.health === "CRITIQUE" ? "Dérive budgétaire critique" : "Point de vigilance"}
          >
            Le projet a consommé {Math.round(consumedRatio * 100)} % de son budget pour un
            avancement déclaré de {project.progress} %. L&apos;écart appelle un arbitrage :
            replanification, avenant, ou révision du reste à faire.
          </Callout>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Avancement" value={`${project.progress} %`} hint={`${done}/${project.tasks.length} tâches terminées`} icon="check" tone="brand" />
        <StatCard label="Budget vendu" value={formatXOF(project.budget, { compact: true })} icon="invoice" tone="teal" />
        <StatCard
          label="Coût consommé" value={formatXOF(consumed, { compact: true })}
          hint={`${Math.round(consumedRatio * 100)} % du budget`}
          icon="trend" tone={consumedRatio > 0.9 ? "danger" : "violet"}
        />
        <StatCard
          label="Déjà facturé" value={formatXOF(billed, { compact: true })}
          hint={project.budget > 0 ? `${Math.round((billed / project.budget) * 100)} % du budget` : undefined}
          icon="check" tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader title="Tâches" subtitle={`${done} terminée(s) sur ${project.tasks.length}`} icon="list" />
            </div>
            {project.tasks.length === 0 ? (
              <EmptyState icon="list" title="Aucune tâche" />
            ) : (
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full min-w-[560px] border-collapse text-base">
                  <thead>
                    <tr>
                      <Th>Tâche</Th>
                      <Th>Statut</Th>
                      <Th>Assignée à</Th>
                      <Th>Échéance</Th>
                      <Th align="right">Estimé</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.tasks.map((t) => (
                      <Tr key={t.id}>
                        <Td className="font-medium text-ink">{t.title}</Td>
                        <Td><Badge tone={TASK_STATUS[t.status].tone} dot>{TASK_STATUS[t.status].label}</Badge></Td>
                        <Td>
                          {t.assignee ? (
                            <span className="flex items-center gap-2">
                              <Avatar name={t.assignee.name} accent={t.assignee.accentToken} size={22} />
                              <span className="text-sm text-ink-2">{t.assignee.name.split(" ")[0]}</span>
                            </span>
                          ) : (
                            <span className="text-sm text-ink-4">—</span>
                          )}
                        </Td>
                        <Td className="text-sm text-ink-3">{formatDate(t.dueDate)}</Td>
                        <Td align="right" className="font-mono text-sm tabular-nums text-ink-3">
                          {formatNumber(t.estimate)} h
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader
                title="Imputations récentes"
                subtitle={`${formatNumber(hours)} h au total, dont ${formatNumber(billableHours)} h facturables`}
                icon="clock"
              />
            </div>
            {project.timeEntries.length === 0 ? (
              <EmptyState icon="clock" title="Aucune imputation" />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {project.timeEntries.slice(0, 12).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-base text-ink">{e.user.name}</span>
                      <span className="block text-xs text-ink-4">{formatDate(e.date)}</span>
                    </span>
                    <span className="flex items-center gap-2.5">
                      {!e.billable && <Badge tone="neutral">Non facturable</Badge>}
                      <span className="font-mono text-sm tabular-nums text-ink-2">
                        {formatNumber(e.hours)} h
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Avancement" icon="trend" />
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-ink-3">Avancement déclaré</span>
                  <span className="font-mono tabular-nums text-ink">{project.progress} %</span>
                </div>
                <Progress value={project.progress} tone="brand" />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-ink-3">Budget consommé</span>
                  <span className="font-mono tabular-nums text-ink">
                    {Math.round(consumedRatio * 100)} %
                  </span>
                </div>
                <Progress
                  value={Math.min(100, consumedRatio * 100)}
                  tone={consumedRatio * 100 - project.progress >= 25 ? "danger" : consumedRatio * 100 - project.progress >= 10 ? "warning" : "success"}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Cadre" icon="folder" />
            <dl className="text-base">
              <DefRow label="Client">
                <Link href={`/societes/${project.company.id}`} className="text-brand hover:underline">
                  {project.company.name}
                </Link>
              </DefRow>
              <DefRow label="Code" mono>{project.code}</DefRow>
              <DefRow label="Début">{formatDate(project.startDate)}</DefRow>
              <DefRow label="Fin prévue">{formatDate(project.endDate)}</DefRow>
              {project.opportunity && (
                <DefRow label="Affaire d'origine">
                  <span className="font-mono text-sm">{project.opportunity.reference}</span>
                </DefRow>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Équipe" subtitle={`${project.members.length} intervenant(s)`} icon="users" />
            {project.manager && (
              <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
                <Avatar name={project.manager.name} accent={project.manager.accentToken} size={36} />
                <div>
                  <p className="font-medium text-ink">{project.manager.name}</p>
                  <p className="text-sm text-ink-3">Chef de projet</p>
                </div>
              </div>
            )}
            <ul className="space-y-3">
              {project.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.user.name} accent={m.user.accentToken} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base text-ink">{m.user.name}</p>
                    <p className="text-xs text-ink-4">{m.roleLabel}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-ink-3">
                    {formatXOF(m.dailyRate, { compact: true })}/j
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {project.invoices.length > 0 && (
            <Card padded={false}>
              <div className="p-5 pb-4">
                <CardHeader title="Facturation" icon="invoice" />
              </div>
              <ul className="divide-y divide-line border-t border-line">
                {project.invoices.map((inv) => (
                  <li key={inv.id}>
                    <Link href={`/factures/${inv.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                      <span>
                        <span className="block font-mono text-sm text-ink">{inv.number}</span>
                        <span className="block text-xs text-ink-4">{formatDate(inv.issueDate)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {inv.fneReference && <Icon name="seal" size={13} className="text-gold" />}
                        <Amount value={totalsOf(inv as never).total} compact className="text-sm" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
