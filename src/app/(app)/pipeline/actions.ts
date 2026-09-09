"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertCapability } from "@/lib/auth-guard";
import { logActivity } from "@/lib/audit";
import { STAGE_LABELS, STAGE_PROBABILITY } from "@/lib/business";

export interface ActionState { ok?: boolean; message?: string }

const moveSchema = z.object({
  opportunityId: z.string().min(1),
  stage: z.enum(["NOUVEAU", "QUALIFIE", "PROPOSITION", "NEGOCIATION", "GAGNE", "PERDU"]),
  lostReason: z.string().optional(),
});

/**
 * Déplacement d'une affaire. La probabilité n'est jamais saisie à la main :
 * elle découle de l'étape (règle métier de STAGE_PROBABILITY).
 */
export async function moveStageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertCapability("pipeline.write");
  const parsed = moveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Étape invalide." };

  const { opportunityId, stage, lostReason } = parsed.data;
  const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opp) return { ok: false, message: "Affaire introuvable." };
  if (opp.stage === stage) return { ok: true };

  if (stage === "PERDU" && !lostReason?.trim()) {
    return { ok: false, message: "Indiquez la raison de la perte." };
  }

  const closed = stage === "GAGNE" || stage === "PERDU";
  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      stage,
      probability: STAGE_PROBABILITY[stage],
      closedAt: closed ? new Date() : null,
      lostReason: stage === "PERDU" ? (lostReason ?? null) : null,
    },
  });

  await logActivity({
    user, action: "UPDATE", entity: "Opportunity", entityId: opportunityId,
    summary: `« ${opp.title} » passe de ${STAGE_LABELS[opp.stage]} à ${STAGE_LABELS[stage]}`,
    meta: { from: opp.stage, to: stage },
  });

  revalidatePath("/pipeline");
  revalidatePath("/tableau-de-bord");
  return { ok: true, message: `Affaire déplacée en « ${STAGE_LABELS[stage]} ».` };
}
