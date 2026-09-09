import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { can } from "@/lib/permissions";
import { SLA_HOURS, TICKET_PRIORITY, TICKET_STATUS } from "@/lib/business";
import { formatDateTime, formatRelative } from "@/lib/format";
import {
  Avatar, Badge, Breadcrumb, Callout, Card, CardHeader, DefRow,
  Icon, PageHeader,
} from "@/components/ui";
import { replyTicketAction, setTicketStatusAction } from "../actions";
import { ReplyForm, StatusSwitcher } from "../TicketPanels";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await prisma.ticket.findUnique({ where: { id }, select: { number: true } });
  return { title: t ? `Ticket ${t.number}` : "Ticket" };
}

export default async function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCapability("tickets.read");
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true, phone: true, email: true } },
      contact: true,
      assignee: { select: { name: true, accentToken: true, jobTitle: true } },
      messages: {
        include: { author: { select: { accentToken: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!ticket) notFound();

  const canWrite = can(user.role, "tickets.write");
  const isOpen = !["RESOLU", "CLOS"].includes(ticket.status);
  const breached = isOpen && ticket.slaDueAt.getTime() < Date.now();

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb items={[{ label: "Tickets", href: "/tickets" }, { label: ticket.number }]} />
        }
        title={ticket.subject}
        subtitle={`${ticket.number} · ouvert ${formatRelative(ticket.createdAt)}`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={TICKET_PRIORITY[ticket.priority].tone} dot>
          {TICKET_PRIORITY[ticket.priority].label} — SLA {SLA_HOURS[ticket.priority]} h
        </Badge>
        <Badge tone={TICKET_STATUS[ticket.status].tone}>{TICKET_STATUS[ticket.status].label}</Badge>
        <Badge tone="neutral">{ticket.category}</Badge>
      </div>

      {breached && (
        <div className="mb-6">
          <Callout tone="danger" icon="warning" title="Engagement de service dépassé">
            L&apos;échéance contractuelle était fixée au {formatDateTime(ticket.slaDueAt)}.
            Ce ticket doit être traité en priorité, et le client informé de la situation.
          </Callout>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card padded={false}>
            <div className="p-5 pb-4">
              <CardHeader
                title="Fil de discussion"
                subtitle={`${ticket.messages.length} message(s)`}
                icon="mail"
              />
            </div>
            <ul className="divide-y divide-line border-t border-line">
              {ticket.messages.map((m) => (
                <li
                  key={m.id}
                  className={m.internal ? "bg-warning-soft/40 px-5 py-4" : "px-5 py-4"}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2.5">
                    <Avatar name={m.authorName} accent={m.author?.accentToken ?? "teal"} size={26} />
                    <span className="text-base font-medium text-ink">{m.authorName}</span>
                    {m.internal && (
                      <Badge tone="warning">
                        <Icon name="lock" size={11} />
                        Note interne
                      </Badge>
                    )}
                    <span className="ml-auto text-xs tabular-nums text-ink-4">
                      {formatDateTime(m.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-base leading-relaxed text-ink-2">
                    {m.body}
                  </p>
                </li>
              ))}
            </ul>

            {canWrite && (
              <div className="border-t border-line bg-surface-2/40 p-5">
                <ReplyForm action={replyTicketAction} ticketId={ticket.id} />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {canWrite && (
            <Card>
              <CardHeader title="Traitement" icon="settings" />
              <StatusSwitcher
                action={setTicketStatusAction}
                ticketId={ticket.id}
                current={ticket.status}
              />
            </Card>
          )}

          <Card>
            <CardHeader title="Engagement de service" icon="clock" />
            <dl className="text-base">
              <DefRow label="Priorité">{TICKET_PRIORITY[ticket.priority].label}</DefRow>
              <DefRow label="Délai contractuel">{SLA_HOURS[ticket.priority]} heures</DefRow>
              <DefRow label="Ouverture">{formatDateTime(ticket.createdAt)}</DefRow>
              <DefRow label="Échéance">
                <span className={breached ? "font-medium text-danger" : undefined}>
                  {formatDateTime(ticket.slaDueAt)}
                </span>
              </DefRow>
              {ticket.resolvedAt && (
                <DefRow label="Résolution">
                  <span
                    className={
                      ticket.resolvedAt.getTime() <= ticket.slaDueAt.getTime()
                        ? "text-success"
                        : "text-danger"
                    }
                  >
                    {formatDateTime(ticket.resolvedAt)}
                  </span>
                </DefRow>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Demandeur" icon="building" />
            <p className="font-display text-md font-semibold text-ink">
              <Link href={`/societes/${ticket.company.id}`} className="hover:text-brand">
                {ticket.company.name}
              </Link>
            </p>
            {ticket.contact && (
              <dl className="mt-3 text-base">
                <DefRow label="Interlocuteur">
                  {ticket.contact.firstName} {ticket.contact.lastName}
                </DefRow>
                <DefRow label="Fonction">{ticket.contact.jobTitle ?? "—"}</DefRow>
                <DefRow label="E-mail">
                  <a href={`mailto:${ticket.contact.email}`} className="text-brand hover:underline">
                    {ticket.contact.email}
                  </a>
                </DefRow>
                {ticket.contact.phone && (
                  <DefRow label="Téléphone" mono>{ticket.contact.phone}</DefRow>
                )}
              </dl>
            )}
          </Card>

          <Card>
            <CardHeader title="Prise en charge" icon="users" />
            {ticket.assignee ? (
              <div className="flex items-center gap-3">
                <Avatar name={ticket.assignee.name} accent={ticket.assignee.accentToken} size={36} />
                <div>
                  <p className="font-medium text-ink">{ticket.assignee.name}</p>
                  <p className="text-sm text-ink-3">{ticket.assignee.jobTitle ?? "Support"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-3">
                Ce ticket n&apos;est assigné à personne. Répondre au client vous
                l&apos;attribuera automatiquement.
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
