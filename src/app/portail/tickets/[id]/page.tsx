import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortalUser } from "@/lib/auth-guard";
import { SLA_HOURS, TICKET_PRIORITY, TICKET_STATUS } from "@/lib/business";
import { formatDateTime } from "@/lib/format";
import {
  Avatar, Badge, Breadcrumb, Card, CardHeader, DefRow, PageHeader,
} from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demande" };

export default async function PortalTicketDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePortalUser();
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      // Les notes internes ne quittent jamais le back-office.
      messages: { where: { internal: false }, orderBy: { createdAt: "asc" } },
      assignee: { select: { name: true, accentToken: true, jobTitle: true } },
    },
  });

  if (!ticket || ticket.companyId !== user.clientCompanyId) notFound();

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Mes demandes", href: "/portail/tickets" },
              { label: ticket.number },
            ]}
          />
        }
        title={ticket.subject}
        subtitle={ticket.number}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={TICKET_PRIORITY[ticket.priority].tone} dot>
          {TICKET_PRIORITY[ticket.priority].label}
        </Badge>
        <Badge tone={TICKET_STATUS[ticket.status].tone}>{TICKET_STATUS[ticket.status].label}</Badge>
        <Badge tone="neutral">{ticket.category}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader title="Échanges" subtitle={`${ticket.messages.length} message(s)`} icon="mail" />
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {ticket.messages.map((m) => (
              <li key={m.id} className="px-5 py-4">
                <div className="mb-2 flex items-center gap-2.5">
                  <Avatar name={m.authorName} size={26} />
                  <span className="text-base font-medium text-ink">{m.authorName}</span>
                  <span className="ml-auto text-xs tabular-nums text-ink-4">
                    {formatDateTime(m.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-line text-base leading-relaxed text-ink-2">{m.body}</p>
              </li>
            ))}
          </ul>
          <p className="border-t border-line bg-surface-2/40 px-5 py-4 text-sm text-ink-3">
            Pour compléter cette demande, répondez directement à l&apos;e-mail de suivi ou
            écrivez à{" "}
            <a href="mailto:contact@markel-technology.ci" className="text-brand hover:underline">
              contact@markel-technology.ci
            </a>{" "}
            en rappelant le numéro {ticket.number}.
          </p>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Suivi" icon="clock" />
            <dl className="text-base">
              <DefRow label="Priorité">{TICKET_PRIORITY[ticket.priority].label}</DefRow>
              <DefRow label="Engagement">{SLA_HOURS[ticket.priority]} heures</DefRow>
              <DefRow label="Ouverture">{formatDateTime(ticket.createdAt)}</DefRow>
              <DefRow label="Échéance">{formatDateTime(ticket.slaDueAt)}</DefRow>
              {ticket.resolvedAt && (
                <DefRow label="Résolution">{formatDateTime(ticket.resolvedAt)}</DefRow>
              )}
            </dl>
          </Card>

          {ticket.assignee && (
            <Card>
              <CardHeader title="Votre interlocuteur" icon="users" />
              <div className="flex items-center gap-3">
                <Avatar name={ticket.assignee.name} accent={ticket.assignee.accentToken} size={36} />
                <div>
                  <p className="font-medium text-ink">{ticket.assignee.name}</p>
                  <p className="text-sm text-ink-3">{ticket.assignee.jobTitle ?? "Support"}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
