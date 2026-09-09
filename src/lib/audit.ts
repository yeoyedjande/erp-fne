import { prisma } from "./prisma";
import type { SessionUser } from "./auth-guard";

/** Toute écriture métier significative laisse une trace. Jamais de secret dedans. */
export async function logActivity(params: {
  user: Pick<SessionUser, "id" | "name"> | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.user?.id ?? null,
        userLabel: params.user?.name ?? "Système",
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        summary: params.summary,
        meta: (params.meta ?? undefined) as never,
      },
    });
  } catch {
    // Le journal ne doit jamais faire échouer l'action métier qu'il observe.
  }
}

export async function notify(params: {
  userId: string;
  title: string;
  body: string;
  href?: string;
  tone?: "info" | "success" | "warning" | "danger";
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body,
        href: params.href ?? null,
        tone: params.tone ?? "info",
      },
    });
  } catch {
    /* idem */
  }
}
