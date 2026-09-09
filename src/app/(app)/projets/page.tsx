import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { PROJECT_HEALTH, PROJECT_STATUS } from "@/lib/business";
import { daysBetween, formatDate, formatNumber, formatXOF } from "@/lib/format";
import {
  Amount, Avatar, Badge, Card, EmptyState, PageHeader, Progress,
  StatCard, TableShell, Td, Th, Tr,
} from "@/components/ui";
import { Filters } from "@/components/Filters";

export const metadata = { title: "Projets" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string }>;
}) {
  await requireCapability("projects.read");
  const { q = "", statut = "" } = await searchParams;

  const projects = await prisma.project.findMany({
    where: {
      ...(statut ? { status: statut as never } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              { company: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
      manager: { select: { name: true, accentToken: true } },
      timeEntries: { select: { hours: true, billable: true } },
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
  });

  const active = projects.filter((p) => p.status === "EN_COURS");
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalHours = projects.reduce(
    (s, p) => s + p.timeEntries.reduce((h, e) => h + e.hours, 0),
    0,
  );
  const atRisk = projects.filter((p) => p.health !== "BON");

  return (
    <>
      <PageHeader
        title="Projets"
        subtitle="Engagements de livraison. La santé compare la consommation budgétaire à l'avancement déclaré."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Projets en cours" value={String(active.length)} icon="folder" tone="brand" />
        <StatCard label="Budget engagé" value={formatXOF(totalBudget, { compact: true })} icon="invoice" tone="teal" />
        <StatCard label="Heures imputées" value={formatNumber(totalHours)} icon="clock" tone="violet" />
        <StatCard
          label="Projets sous vigilance" value={String(atRisk.length)}
          icon="warning" tone={atRisk.length > 0 ? "warning" : "neutral"}
        />
      </div>

      <Suspense fallback={<div className="mb-5 h-9" />}>
        <Filters
          searchPlaceholder="Nom, code, client…"
          selects={[
            {
              name: "statut", label: "Tous les statuts",
              options: Object.entries(PROJECT_STATUS).map(([value, m]) => ({ value, label: m.label })),
            },
          ]}
        />
      </Suspense>

      {projects.length === 0 ? (
        <Card>
          <EmptyState icon="folder" title="Aucun projet ne correspond" />
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Projet</Th>
              <Th>Client</Th>
              <Th>Statut</Th>
              <Th>Avancement</Th>
              <Th align="right">Budget</Th>
              <Th align="right">Heures</Th>
              <Th>Échéance</Th>
              <Th>Chef de projet</Th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const hours = p.timeEntries.reduce((s, e) => s + e.hours, 0);
              const days = daysBetween(p.endDate);
              const late = days < 0 && !["LIVRE", "CLOTURE", "ANNULE"].includes(p.status);
              return (
                <Tr key={p.id} href={`/projets/${p.id}`}>
                  <Td>
                    <Link href={`/projets/${p.id}`} className="font-medium text-ink hover:text-brand">
                      {p.name}
                    </Link>
                    <span className="mt-0.5 block font-mono text-xs text-ink-4">{p.code}</span>
                  </Td>
                  <Td>
                    <Link href={`/societes/${p.company.id}`} className="text-sm hover:text-brand">
                      {p.company.name}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={PROJECT_STATUS[p.status].tone} dot>{PROJECT_STATUS[p.status].label}</Badge>
                    <span className="mt-1 block">
                      <Badge tone={PROJECT_HEALTH[p.health].tone}>{PROJECT_HEALTH[p.health].label}</Badge>
                    </span>
                  </Td>
                  <Td className="min-w-[8rem]">
                    <Progress
                      value={p.progress}
                      tone={p.health === "CRITIQUE" ? "danger" : p.health === "VIGILANCE" ? "warning" : "brand"}
                    />
                    <span className="mt-1 block font-mono text-xs tabular-nums text-ink-3">{p.progress} %</span>
                  </Td>
                  <Td align="right"><Amount value={p.budget} compact /></Td>
                  <Td align="right" className="font-mono text-sm tabular-nums text-ink-2">
                    {formatNumber(hours)} h
                  </Td>
                  <Td className="text-sm">
                    <span className={late ? "font-medium text-danger" : "text-ink-3"}>
                      {formatDate(p.endDate)}
                    </span>
                  </Td>
                  <Td>
                    {p.manager ? (
                      <span className="flex items-center gap-2">
                        <Avatar name={p.manager.name} accent={p.manager.accentToken} size={24} />
                        <span className="text-sm text-ink-2">{p.manager.name.split(" ")[0]}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-ink-4">—</span>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </>
  );
}
