"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertCapability } from "@/lib/auth-guard";
import { logActivity, notify } from "@/lib/audit";
import { certifyCreditNote, certifyInvoice } from "@/lib/fne/service";
import { nextNumber, totalsOf } from "@/lib/invoices";
import { deriveInvoiceStatus } from "@/lib/business";

export interface ActionState {
  ok?: boolean;
  message?: string;
  reference?: string;
}

/** Certification d'une facture auprès de la plateforme FNE. */
export async function certifyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertCapability("fne.certify");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId) return { ok: false, message: "Facture introuvable." };

  const result = await certifyInvoice(invoiceId, user.id);

  await logActivity({
    user,
    action: "CERTIFY",
    entity: "Invoice",
    entityId: invoiceId,
    summary: result.ok
      ? `Certification FNE obtenue — référence ${result.reference}`
      : `Échec de certification FNE — ${result.message}`,
    meta: { success: result.ok, reference: result.reference },
  });

  if (result.ok && result.warning) {
    await notify({
      userId: user.id,
      title: "Stock de stickers FNE bas",
      body: `Il ne reste que ${result.balance} stickers électroniques sur votre espace DGI.`,
      href: "/conformite-fne",
      tone: "warning",
    });
  }

  revalidatePath(`/factures/${invoiceId}`);
  revalidatePath("/factures");
  revalidatePath("/conformite-fne");
  revalidatePath("/tableau-de-bord");

  return { ok: result.ok, message: result.message, reference: result.reference };
}

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().int().positive("Le montant doit être supérieur à zéro."),
  method: z.enum(["CASH", "CARD", "CHECK", "MOBILE_MONEY", "TRANSFER", "DEFERRED"]),
  reference: z.string().max(80).optional(),
  paidAt: z.string().optional(),
});

/** Enregistrement d'un règlement, avec recalcul du statut. */
export async function recordPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertCapability("invoices.write");
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }
  const { invoiceId, amount, method, reference, paidAt } = parsed.data;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: { include: { customTaxes: true } }, customTaxes: true },
  });
  if (!invoice) return { ok: false, message: "Facture introuvable." };
  if (invoice.status === "BROUILLON") {
    return { ok: false, message: "Émettez la facture avant d'enregistrer un règlement." };
  }

  const total = totalsOf(invoice as never).total;
  const already = invoice.paidAmount;
  if (already + amount > total) {
    return {
      ok: false,
      message: `Le total réglé dépasserait le montant de la facture (reste ${total - already} F).`,
    };
  }

  const paid = already + amount;
  await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId, amount, method,
        reference: reference || null,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: paid,
        status: deriveInvoiceStatus(invoice.status, total, paid, invoice.dueDate),
      },
    }),
  ]);

  await logActivity({
    user, action: "PAYMENT", entity: "Invoice", entityId: invoiceId,
    summary: `Règlement de ${amount} F enregistré sur ${invoice.number}`,
    meta: { amount, method },
  });

  revalidatePath(`/factures/${invoiceId}`);
  revalidatePath("/factures");
  return { ok: true, message: "Règlement enregistré." };
}

/** Passage du brouillon à l'état émis. */
export async function issueInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertCapability("invoices.write");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  });
  if (!invoice) return { ok: false, message: "Facture introuvable." };
  if (invoice.lines.length === 0) {
    return { ok: false, message: "Une facture sans ligne ne peut pas être émise." };
  }

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "EMISE" } });
  await logActivity({
    user, action: "ISSUE", entity: "Invoice", entityId: invoiceId,
    summary: `Facture ${invoice.number} émise`,
  });

  revalidatePath(`/factures/${invoiceId}`);
  revalidatePath("/factures");
  return { ok: true, message: "Facture émise. Elle peut désormais être certifiée." };
}

const creditSchema = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().min(8, "Motivez l'avoir en quelques mots (8 caractères minimum)."),
});

/** Avoir total sur une facture certifiée — API FNE #2. */
export async function createCreditNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertCapability("fne.certify");
  const parsed = creditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }
  const { invoiceId, reason } = parsed.data;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  });
  if (!invoice) return { ok: false, message: "Facture introuvable." };
  if (invoice.fneStatus !== "CERTIFIEE") {
    return { ok: false, message: "Seule une facture certifiée peut faire l'objet d'un avoir." };
  }

  const note = await prisma.creditNote.create({
    data: {
      number: await nextNumber("A"),
      invoiceId, reason, createdById: user.id,
      lines: {
        create: invoice.lines.map((l) => ({ invoiceLineId: l.id, quantity: l.quantity })),
      },
    },
  });

  const result = await certifyCreditNote(note.id, user.id);

  await logActivity({
    user, action: "CREDIT_NOTE", entity: "Invoice", entityId: invoiceId,
    summary: result.ok
      ? `Avoir ${note.number} certifié — référence ${result.reference}`
      : `Échec de certification de l'avoir ${note.number} — ${result.message}`,
    meta: { creditNoteId: note.id, success: result.ok },
  });

  if (!result.ok) {
    // L'avoir reste en base, non certifié : il documente la tentative.
    revalidatePath(`/factures/${invoiceId}`);
    return { ok: false, message: result.message };
  }

  revalidatePath(`/factures/${invoiceId}`);
  revalidatePath("/factures");
  revalidatePath("/conformite-fne");
  return { ok: true, message: result.message, reference: result.reference };
}
