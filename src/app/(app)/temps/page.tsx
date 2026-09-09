import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { formatDate, formatNumber, formatXOF } from "@/lib/format";
import {
  Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, Progress,
  StatCard, TableShell, Td, Th, Tr,
} from "@/components/ui";
import { Filters } from "@/components/Filters";

export const metadata = { title: "Feuilles de temps" };
export const dynamic = "force-dynamic";

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ projet?: string; collaborateur?: string }>;
}) {
  await requireCapability("projects.read");
  const { projet = "", collaborateur = "" } = await searchParams;

  const [entries, projects, users] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        ...(projet ? { projectId: projet } : {}),
        ...(collaborateur ? { userId: collaborateur } : {}),
      },
      include: {
        user: { select: { id: true, name: true, accentToken: true } },
        project: { select: { id: true, code: true, name: true } },
        task: { select: { title: true } },
      },
      orderBy: { date: "desc" },
      take: 150,
    }),
    prisma.project.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
    prisma.user.findMany({
      where: { role: { not: "CLIENT" } },
      select: { id: true, name: true, accentToken: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const allEntries = await prisma.timeEntry.findMany({
    include: { user: { select: { id: true, name: true, accentToken: true } } },
  });

  const totalHours = allEntries.reduce((s, e) => s + e.hours, 0);
  const billableHours = allEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);
  const billableRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

  /* Répartition par collaborateur — la vue que cherche un directeur des opérations. */
  const byUser = new Map<string, { name: string; accent: string; hours: number; billable: number }>();
  for (const e of allEntries) {
    const cur = byUser.get(e.user.id) ?? {
      name: e.user.name, accent: e.user.accentToken, hours: 0, billable: 0,
    };
    cur.hours += e.hours;
    if (e.billable) cur.billable += e.hours;
    byUser.set(e.user.id, cur);
  }
  const perUser = [...byUser.values()].sort((a, b) => b.hours - a.hours);
  const maxHours = perUser[0]?.hours ?? 1;

  return (
    <>
      <PageHeader
        title="Feuilles de temps"
        subtitle="Imputations des collaborateurs sur les projets. Le taux de facturabilité pilote la marge."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Heures imputées" value={formatNumber(totalHours)} icon="clock" tone="brand" />
        <StatCard label="Heures facturables" value={formatNumber(billableHours)} icon="check" tone="success" />
        <StatCard label="Taux de facturabilité" value={`${Math.round(billableRate)} %`} icon="trend" tone="violet" />
        <StatCard
          label="Valorisation indicative"
          value={formatXOF((billableHours / 8) * 300_000, { compact: true })}
          hint="au taux journalier moyen de 300 k F" icon="invoice" tone="teal"
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader title="Charge par collaborateur" subtitle="Toutes périodes confondues" icon="users" />
          <ul className="space-y-3.5">
            {perUser.map((u) => (
              <li key={u.name}>
                <div className="mb-1.5 flex items-center gap-2.5">
                  <Avatar name={u.name} accent={u.accent} size={24} />
                  <span className="min-w-0 flex-1 truncate text-base text-ink">{u.name}</span>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-ink-2">
                    {formatNumber(u.hours)} h
                  </span>
                </div>
                <Progress value={(u.hours / maxHours) * 100} tone="brand" height={5} />
                <p className="mt-1 text-xs text-ink-4">
                  {Math.round((u.billable / (u.hours || 1)) * 100)} % facturables
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <div>
          <Suspense fallback={<div className="mb-5 h-9" />}>
            <Filters
              search={false}
              selects={[
                {
                  name: "projet", label: "Tous les projets",
                  options: projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
                },
                {
                  name: "collaborateur", label: "Tous les collaborateurs",
                  options: users.map((u) => ({ value: u.id, label: u.name })),
                },
              ]}
            />
          </Suspense>

          {entries.length === 0 ? (
            <Card>
              <EmptyState icon="clock" title="Aucune imputation ne correspond" />
            </Card>
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Collaborateur</Th>
                  <Th>Projet</Th>
                  <Th>Tâche</Th>
                  <Th align="right">Heures</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <Tr key={e.id}>
                    <Td className="text-sm tabular-nums text-ink-3">{formatDate(e.date)}</Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Avatar name={e.user.name} accent={e.user.accentToken} size={22} />
                        <span className="text-sm text-ink-2">{e.user.name}</span>
                      </span>
                    </Td>
                    <Td>
                      <Link href={`/projets/${e.project.id}`} className="font-mono text-xs text-brand hover:underline">
                        {e.project.code}
                      </Link>
                    </Td>
                    <Td className="max-w-[14rem] truncate text-sm text-ink-3">
                      {e.task?.title ?? "—"}
                    </Td>
                    <Td align="right">
                      <span className="flex items-center justify-end gap-2">
                        {!e.billable && <Badge tone="neutral">NF</Badge>}
                        <span className="font-mono text-sm tabular-nums text-ink">
                          {formatNumber(e.hours)} h
                        </span>
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </div>
      </div>
    </>
  );
}
