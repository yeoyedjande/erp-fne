import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import {
  Avatar, Badge, Card, CardHeader, EmptyState, Icon, PageHeader,
  StatCard, type IconName,
} from "@/components/ui";
import { Filters } from "@/components/Filters";

export const metadata = { title: "Activités" };
export const dynamic = "force-dynamic";

const TYPE_ICON: Record<string, IconName> = {
  APPEL: "phone", EMAIL: "mail", REUNION: "users", NOTE: "file", TACHE: "check",
};

const TYPE_LABEL: Record<string, string> = {
  APPEL: "Appel", EMAIL: "E-mail", REUNION: "Réunion", NOTE: "Note", TACHE: "Tâche",
};

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; statut?: string }>;
}) {
  const user = await requireCapability("crm.read");
  const { q = "", type = "", statut = "" } = await searchParams;

  const activities = await prisma.activity.findMany({
    where: {
      ...(type ? { type: type as never } : {}),
      ...(statut ? { status: statut as never } : {}),
      ...(q ? { subject: { contains: q, mode: "insensitive" } } : {}),
    },
    include: {
      owner: { select: { id: true, name: true, accentToken: true } },
      company: { select: { id: true, name: true } },
      contact: { select: { firstName: true, lastName: true } },
    },
    orderBy: { dueAt: "desc" },
    take: 120,
  });

  const all = await prisma.activity.findMany({
    select: { status: true, dueAt: true, ownerId: true },
  });
  const planned = all.filter((a) => a.status === "PLANIFIEE");
  const overdue = planned.filter((a) => a.dueAt.getTime() < Date.now());
  const mine = planned.filter((a) => a.ownerId === user.id);

  const upcoming = activities
    .filter((a) => a.status === "PLANIFIEE" && a.dueAt.getTime() >= Date.now())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  const past = activities.filter(
    (a) => a.status !== "PLANIFIEE" || a.dueAt.getTime() < Date.now(),
  );

  const renderItem = (a: (typeof activities)[number]) => (
    <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
          a.status === "TERMINEE"
            ? "border-success/20 bg-success-soft text-success"
            : a.status === "ANNULEE"
              ? "border-line-2 bg-surface-2 text-ink-4"
              : "border-brand/15 bg-brand-soft text-brand"
        }`}
      >
        <Icon name={TYPE_ICON[a.type] ?? "file"} size={15} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-ink">{a.subject}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-ink-3">
          <span>{TYPE_LABEL[a.type]}</span>
          {a.company && (
            <>
              <span className="text-ink-4">·</span>
              <Link href={`/societes/${a.company.id}`} className="hover:text-brand">
                {a.company.name}
              </Link>
            </>
          )}
          {a.contact && (
            <>
              <span className="text-ink-4">·</span>
              <span>{a.contact.firstName} {a.contact.lastName}</span>
            </>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {a.status === "ANNULEE" && <Badge tone="neutral">Annulée</Badge>}
        {a.status === "TERMINEE" && <Badge tone="success">Terminée</Badge>}
        {a.status === "PLANIFIEE" && a.dueAt.getTime() < Date.now() && (
          <Badge tone="danger">En retard</Badge>
        )}
        <span className="text-right">
          <span className="block text-sm tabular-nums text-ink-2">{formatDate(a.dueAt)}</span>
          <span className="block text-xs text-ink-4">{formatRelative(a.dueAt)}</span>
        </span>
        {a.owner && <Avatar name={a.owner.name} accent={a.owner.accentToken} size={26} />}
      </div>
    </li>
  );

  return (
    <>
      <PageHeader
        title="Activités"
        subtitle="Appels, e-mails, réunions et tâches rattachés aux comptes et aux affaires."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Activités planifiées" value={String(planned.length)} icon="calendar" tone="brand" />
        <StatCard label="En retard" value={String(overdue.length)} icon="warning" tone={overdue.length ? "danger" : "neutral"} />
        <StatCard label="Qui vous incombent" value={String(mine.length)} icon="users" tone="violet" />
        <StatCard label="Interactions enregistrées" value={String(all.length)} icon="list" tone="teal" />
      </div>

      <Suspense fallback={<div className="mb-5 h-9" />}>
        <Filters
          searchPlaceholder="Objet de l'activité…"
          selects={[
            {
              name: "type", label: "Tous les types",
              options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })),
            },
            {
              name: "statut", label: "Tous les statuts",
              options: [
                { value: "PLANIFIEE", label: "Planifiée" },
                { value: "TERMINEE", label: "Terminée" },
                { value: "ANNULEE", label: "Annulée" },
              ],
            },
          ]}
        />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader title="À venir" subtitle={`${upcoming.length} activité(s)`} icon="calendar" />
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon="check" title="Rien de planifié" description="Aucune activité à venir sur ce filtre." />
          ) : (
            <ul className="divide-y divide-line border-t border-line">{upcoming.map(renderItem)}</ul>
          )}
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader title="Historique" subtitle={`${past.length} interaction(s)`} icon="list" />
          </div>
          {past.length === 0 ? (
            <EmptyState icon="list" title="Aucun historique" />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {past.slice(0, 40).map(renderItem)}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
