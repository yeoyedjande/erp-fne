"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertCapability } from "@/lib/auth-guard";
import { logActivity } from "@/lib/audit";
import { TICKET_STATUS } from "@/lib/business";

export interface ActionState { ok?: boolean; message?: string }

const replySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(2, "Le message est vide."),
  internal: z.string().optional(),
});

/** Réponse sur un ticket. Une note interne n'est jamais visible du portail client. */
export async function replyTicketAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertCapability("tickets.write");
  const parsed = replySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }
  const { ticketId, body, internal } = parsed.data;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false, message: "Ticket introuvable." };

  await prisma.ticketMessage.create({
    data: {
      ticketId, authorId: user.id, authorName: user.name,
      body, internal: internal === "on",
    },
  });

  // Une réponse publique sur un ticket neuf le fait passer en cours.
  if (ticket.status === "NOUVEAU" && internal !== "on") {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "EN_COURS", assigneeId: ticket.assigneeId ?? user.id },
    });
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { ok: true, message: internal === "on" ? "Note interne ajoutée." : "Réponse publiée." };
}

const statusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(["NOUVEAU", "EN_COURS", "EN_ATTENTE_CLIENT", "RESOLU", "CLOS"]),
});

export async function setTicketStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertCapability("tickets.write");
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Statut invalide." };
  const { ticketId, status } = parsed.data;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false, message: "Ticket introuvable." };

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      resolvedAt: ["RESOLU", "CLOS"].includes(status) ? (ticket.resolvedAt ?? new Date()) : null,
      assigneeId: ticket.assigneeId ?? user.id,
    },
  });

  await logActivity({
    user, action: "UPDATE", entity: "Ticket", entityId: ticketId,
    summary: `Ticket ${ticket.number} : ${TICKET_STATUS[status].label}`,
  });

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { ok: true, message: `Ticket marqué « ${TICKET_STATUS[status].label} ».` };
}
