import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/auth-guard";
import { SLA_HOURS, TICKET_PRIORITY, TICKET_STATUS } from "@/lib/business";
import { formatDateTime, formatRelative } from "@/lib/format";
import {
  Badge, Card, EmptyState, PageHeader, StatCard, TableShell, Td, Th, Tr,
} from "@/components/ui";

export const metadata = { title: "Mes demandes" };
export const dynamic = "force-dynamic";

export default async function PortalTickets() {
  const user = await requirePortalUser();

  const tickets = await prisma.ticket.findMany({
    where: { companyId: user.clientCompanyId },
    include: { _count: { select: { messages: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const open = tickets.filter((t) => !["RESOLU", "CLOS"].includes(t.status));
  const resolved = tickets.filter((t) => t.resolvedAt);
  const held = resolved.filter((t) => t.resolvedAt!.getTime() <= t.slaDueAt.getTime());

  return (
    <>
      <PageHeader
        title="Mes demandes"
        subtitle={`Engagements de service Markel Technology : ${Object.entries(SLA_HOURS).map(([p, h]) => `${p} ${h} h`).join(" · ")}.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Demandes ouvertes" value={String(open.length)} icon="lifebuoy" tone="brand" />
        <StatCard label="Demandes traitées" value={String(resolved.length)} icon="check" tone="success" />
        <StatCard
          label="Engagements tenus"
          value={`${resolved.length ? Math.round((held.length / resolved.length) * 100) : 100} %`}
          icon="trend" tone="violet"
        />
      </div>

      {tickets.length === 0 ? (
        <Card>
          <EmptyState
            icon="lifebuoy"
            title="Aucune demande"
            description="Vous n'avez ouvert aucune demande de support pour l'instant."
          />
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Numéro</Th>
              <Th>Sujet</Th>
              <Th>Priorité</Th>
              <Th>Statut</Th>
              <Th>Ouverture</Th>
              <Th align="center">Échanges</Th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <Tr key={t.id} href={`/portail/tickets/${t.id}`}>
                <Td>
                  <Link href={`/portail/tickets/${t.id}`} className="font-mono text-sm font-medium text-ink hover:text-brand">
                    {t.number}
                  </Link>
                </Td>
                <Td className="max-w-[22rem] truncate font-medium text-ink">{t.subject}</Td>
                <Td><Badge tone={TICKET_PRIORITY[t.priority].tone} dot>{t.priority}</Badge></Td>
                <Td><Badge tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Badge></Td>
                <Td className="text-sm text-ink-3">
                  <span title={formatDateTime(t.createdAt)}>{formatRelative(t.createdAt)}</span>
                </Td>
                <Td align="center" className="font-mono text-sm tabular-nums text-ink-3">
                  {t._count.messages}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </>
  );
}
