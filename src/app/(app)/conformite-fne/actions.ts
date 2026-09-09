"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertCapability } from "@/lib/auth-guard";
import { logActivity } from "@/lib/audit";
import { certifyInvoice } from "@/lib/fne/service";

export interface ActionState { ok?: boolean; message?: string }

/**
 * Certification en lot des factures émises non encore certifiées.
 * Séquentielle à dessein : la plateforme attribue une série ininterrompue,
 * une exécution parallèle produirait des trous de numérotation.
 */
export async function certifyBatchAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await assertCapability("fne.certify");

  const pending = await prisma.invoice.findMany({
    where: {
      status: { notIn: ["BROUILLON", "ANNULEE"] },
      fneStatus: { in: ["NON_SOUMISE", "REJETEE"] },
    },
    orderBy: { issueDate: "asc" },
    select: { id: true, number: true },
  });

  if (pending.length === 0) {
    return { ok: true, message: "Aucune facture en attente de certification." };
  }

  let done = 0;
  const failures: string[] = [];
  for (const inv of pending) {
    const r = await certifyInvoice(inv.id, user.id);
    if (r.ok) done += 1;
    else failures.push(`${inv.number} — ${r.message}`);
  }

  await logActivity({
    user, action: "CERTIFY_BATCH", entity: "Invoice",
    summary: `Certification en lot : ${done} succès, ${failures.length} échec(s)`,
    meta: { done, failures: failures.length },
  });

  revalidatePath("/conformite-fne");
  revalidatePath("/factures");
  revalidatePath("/tableau-de-bord");

  if (failures.length === 0) {
    return { ok: true, message: `${done} facture(s) certifiée(s) par la DGI.` };
  }
  return {
    ok: done > 0,
    message:
      `${done} certifiée(s), ${failures.length} refusée(s). ` +
      `Première erreur : ${failures[0]}`,
  };
}

/** Réapprovisionnement du stock de stickers (opération réalisée sur l'espace DGI). */
export async function setStickerBalanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertCapability("fne.settings");
  const value = Number(formData.get("balance"));
  if (!Number.isInteger(value) || value < 0 || value > 100_000) {
    return { ok: false, message: "Indiquez un entier compris entre 0 et 100 000." };
  }

  const before = await prisma.organization.findUniqueOrThrow({ where: { id: "org" } });
  await prisma.organization.update({
    where: { id: "org" },
    data: { fneStickerBalance: value },
  });

  await logActivity({
    user, action: "UPDATE", entity: "Organization", entityId: "org",
    summary: `Solde de stickers FNE porté de ${before.fneStickerBalance} à ${value}`,
    meta: { from: before.fneStickerBalance, to: value },
  });

  revalidatePath("/conformite-fne");
  return { ok: true, message: `Solde mis à jour : ${value} stickers disponibles.` };
}
