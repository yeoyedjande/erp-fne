import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/auth-guard";
import { PROJECT_STATUS } from "@/lib/business";
import { formatDate, formatXOF } from "@/lib/format";
import {
  Badge, Card, CardHeader, EmptyState, PageHeader, Progress, StatCard,
} from "@/components/ui";

export const metadata = { title: "Mes projets" };
export const dynamic = "force-dynamic";

export default async function PortalProjects() {
  const user = await requirePortalUser();

  const projects = await prisma.project.findMany({
    where: { companyId: user.clientCompanyId },
    include: {
      manager: { select: { name: true } },
      tasks: { select: { status: true } },
    },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
  });

  const active = projects.filter((p) => p.status === "EN_COURS");
  const delivered = projects.filter((p) => ["LIVRE", "CLOTURE"].includes(p.status));

  return (
    <>
      <PageHeader
        title="Mes projets"
        subtitle="Avancement des engagements de livraison conduits par Markel Technology."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Projets en cours" value={String(active.length)} icon="folder" tone="brand" />
        <StatCard label="Projets livrés" value={String(delivered.length)} icon="check" tone="success" />
        <StatCard
          label="Budget engagé"
          value={formatXOF(projects.reduce((s, p) => s + p.budget, 0), { compact: true })}
          icon="invoice" tone="teal"
        />
      </div>

      {projects.length === 0 ? (
        <Card>
          <EmptyState icon="folder" title="Aucun projet" description="Aucun projet n'est en cours pour votre société." />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {projects.map((p) => {
            const done = p.tasks.filter((t) => t.status === "TERMINE").length;
            return (
              <Card key={p.id}>
                <CardHeader
                  title={p.name}
                  subtitle={p.description ?? undefined}
                  icon="folder"
                  action={
                    <Badge tone={PROJECT_STATUS[p.status].tone} dot>
                      {PROJECT_STATUS[p.status].label}
                    </Badge>
                  }
                />
                <Progress value={p.progress} tone="brand" />
                <p className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm text-ink-3">
                  <span>{done} / {p.tasks.length} lots terminés</span>
                  <span className="font-mono tabular-nums text-ink-2">{p.progress} %</span>
                </p>

                <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-3">Démarrage</dt>
                    <dd className="tabular-nums text-ink-2">{formatDate(p.startDate)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-3">Livraison prévue</dt>
                    <dd className="tabular-nums text-ink-2">{formatDate(p.endDate)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-3">Chef de projet</dt>
                    <dd className="text-ink-2">{p.manager?.name ?? "—"}</dd>
                  </div>
                </dl>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
