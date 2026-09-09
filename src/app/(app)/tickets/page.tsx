import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { SLA_HOURS, TICKET_PRIORITY, TICKET_STATUS } from "@/lib/business";
import { formatDateTime, formatRelative } from "@/lib/format";
import {
  Avatar, Badge, Card, EmptyState, Icon, PageHeader, StatCard,
  TableShell, Td, Th, Tr,
} from "@/components/ui";
import { Filters } from "@/components/Filters";
import { ActivityLineChart } from "@/components/charts/Charts";

export const metadata = { title: "Tickets" };
export const dynamic = "force-dynamic";

const DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; priorite?: string }>;
}) {
  await requireCapability("tickets.read");
  const { q = "", statut = "", priorite = "" } = await searchParams;

  const [tickets, all] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...(statut ? { status: statut as never } : {}),
        ...(priorite ? { priority: priorite as never } : {}),
        ...(q
          ? {
              OR: [
                { number: { contains: q, mode: "insensitive" } },
                { subject: { contains: q, mode: "insensitive" } },
                { company: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        company: { select: { id: true, name: true } },
        assignee: { select: { name: true, accentToken: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [{ status: "asc" }, { slaDueAt: "asc" }],
    }),
    prisma.ticket.findMany({ select: { status: true, priority: true, createdAt: true, resolvedAt: true, slaDueAt: true } }),
  ]);

  const open = all.filter((t) => !["RESOLU", "CLOS"].includes(t.status));
  const breached = open.filter((t) => t.slaDueAt.getTime() < Date.now());
  const resolved = all.filter((t) => t.resolvedAt);
  const heldSla = resolved.filter((t) => t.resolvedAt!.getTime() <= t.slaDueAt.getTime());
  const slaRate = resolved.length ? Math.round((heldSla.length / resolved.length) * 100) : 100;

  /* Ouvertures et résolutions sur quatorze jours. */
  const series = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    d.setHours(0, 0, 0, 0);
    const next = new Date(d.getTime() + 86_400_000);
    return {
      jour: `${DAYS[d.getDay()]} ${d.getDate()}`,
      tickets: all.filter((t) => t.createdAt >= d && t.createdAt < next).length,
      resolus: all.filter((t) => t.resolvedAt && t.resolvedAt >= d && t.resolvedAt < next).length,
    };
  });

  return (
    <>
      <PageHeader
        title="Support client"
        subtitle={`Engagements de service : ${Object.entries(SLA_HOURS).map(([p, h]) => `${p} ${h} h`).join(" · ")}.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tickets ouverts" value={String(open.length)} icon="lifebuoy" tone="brand" />
        <StatCard
          label="SLA dépassés" value={String(breached.length)}
          icon="warning" tone={breached.length > 0 ? "danger" : "success"}
        />
        <StatCard label="Taux de respect du SLA" value={`${slaRate} %`} hint={`${resolved.length} tickets résolus`} icon="check" tone="success" />
        <StatCard label="Priorité P1 ouverte" value={String(open.filter((t) => t.priority === "P1").length)} icon="warning" tone="danger" />
      </div>

      <Card className="mb-6">
        <p className="eyebrow mb-3">Ouvertures et résolutions — 14 jours</p>
        <ActivityLineChart data={series} />
      </Card>

      <Suspense fallback={<div className="mb-5 h-9" />}>
        <Filters
          searchPlaceholder="Numéro, sujet, client…"
          selects={[
            {
              name: "statut", label: "Tous les statuts",
              options: Object.entries(TICKET_STATUS).map(([value, m]) => ({ value, label: m.label })),
            },
            {
              name: "priorite", label: "Toutes les priorités",
              options: Object.keys(SLA_HOURS).map((p) => ({ value: p, label: `${p} — ${SLA_HOURS[p as keyof typeof SLA_HOURS]} h` })),
            },
          ]}
        />
      </Suspense>

      {tickets.length === 0 ? (
        <Card>
          <EmptyState icon="lifebuoy" title="Aucun ticket ne correspond" />
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Numéro</Th>
              <Th>Sujet</Th>
              <Th>Client</Th>
              <Th>Priorité</Th>
              <Th>Statut</Th>
              <Th>Échéance SLA</Th>
              <Th>Assigné à</Th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const openTicket = !["RESOLU", "CLOS"].includes(t.status);
              const late = openTicket && t.slaDueAt.getTime() < Date.now();
              return (
                <Tr key={t.id} href={`/tickets/${t.id}`}>
                  <Td>
                    <Link href={`/tickets/${t.id}`} className="font-mono text-sm font-medium text-ink hover:text-brand">
                      {t.number}
                    </Link>
                  </Td>
                  <Td>
                    <span className="block max-w-[20rem] truncate font-medium text-ink">{t.subject}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-4">
                      <Icon name="mail" size={11} />
                      {t._count.messages} message{t._count.messages > 1 ? "s" : ""} · {t.category}
                    </span>
                  </Td>
                  <Td>
                    <Link href={`/societes/${t.company.id}`} className="text-sm hover:text-brand">
                      {t.company.name}
                    </Link>
                  </Td>
                  <Td><Badge tone={TICKET_PRIORITY[t.priority].tone} dot>{t.priority}</Badge></Td>
                  <Td><Badge tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Badge></Td>
                  <Td className="text-sm">
                    {late ? (
                      <span className="font-medium text-danger">Dépassé</span>
                    ) : openTicket ? (
                      <span className="text-ink-3">{formatRelative(t.slaDueAt)}</span>
                    ) : (
                      <span className="text-ink-4">{formatDateTime(t.resolvedAt)}</span>
                    )}
                  </Td>
                  <Td>
                    {t.assignee ? (
                      <span className="flex items-center gap-2">
                        <Avatar name={t.assignee.name} accent={t.assignee.accentToken} size={22} />
                        <span className="text-sm text-ink-2">{t.assignee.name.split(" ")[0]}</span>
                      </span>
                    ) : (
                      <Badge tone="warning">Non assigné</Badge>
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
