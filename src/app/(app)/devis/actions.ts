"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertCapability } from "@/lib/auth-guard";
import { logActivity } from "@/lib/audit";
import { nextNumber } from "@/lib/invoices";
import { PAYMENT_TERMS_DAYS } from "@/lib/business";

export interface ActionState { ok?: boolean; message?: string }

const decideSchema = z.object({
  quoteId: z.string().min(1),
  decision: z.enum(["ENVOYE", "ACCEPTE", "REFUSE"]),
  refusalReason: z.string().optional(),
});

/** Changement de statut d'un devis (envoi, acceptation, refus). */
export async function decideQuoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertCapability("quotes.write");
  const parsed = decideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Décision invalide." };

  const { quoteId, decision, refusalReason } = parsed.data;
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return { ok: false, message: "Devis introuvable." };

  if (decision === "REFUSE" && !refusalReason?.trim()) {
    return { ok: false, message: "Indiquez le motif du refus." };
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: decision,
      sentAt: decision === "ENVOYE" ? new Date() : quote.sentAt,
      decidedAt: decision === "ENVOYE" ? null : new Date(),
      refusalReason: decision === "REFUSE" ? (refusalReason ?? null) : null,
    },
  });

  // Un devis accepté fait avancer l'affaire correspondante.
  if (decision === "ACCEPTE" && quote.opportunityId) {
    await prisma.opportunity.update({
      where: { id: quote.opportunityId },
      data: { stage: "GAGNE", probability: 100, closedAt: new Date() },
    });
  }

  const label = { ENVOYE: "envoyé", ACCEPTE: "accepté", REFUSE: "refusé" }[decision];
  await logActivity({
    user, action: "UPDATE", entity: "Quote", entityId: quoteId,
    summary: `Devis ${quote.number} ${label}`,
  });

  revalidatePath(`/devis/${quoteId}`);
  revalidatePath("/devis");
  revalidatePath("/pipeline");
  return { ok: true, message: `Devis ${label}.` };
}

/**
 * Conversion d'un devis accepté en facture : les lignes sont recopiées,
 * l'identité fiscale du client est figée au moment de l'émission.
 */
export async function convertToInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertCapability("invoices.write");
  const quoteId = String(formData.get("quoteId") ?? "");

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: { orderBy: { position: "asc" } }, company: true, invoices: true },
  });
  if (!quote) return { ok: false, message: "Devis introuvable." };
  if (quote.status !== "ACCEPTE") {
    return { ok: false, message: "Seul un devis accepté peut être converti en facture." };
  }
  if (quote.invoices.length > 0) {
    return { ok: false, message: `Ce devis a déjà donné lieu à la facture ${quote.invoices[0].number}.` };
  }
  if (quote.lines.length === 0) {
    return { ok: false, message: "Ce devis ne comporte aucune ligne." };
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: "org" } });
  const company = quote.company;
  const now = new Date();

  const invoice = await prisma.invoice.create({
    data: {
      number: await nextNumber("F"),
      title: quote.title,
      status: "BROUILLON",
      issueDate: now,
      dueDate: new Date(now.getTime() + PAYMENT_TERMS_DAYS * 86_400_000),
      discount: quote.discount,
      companyId: company.id,
      quoteId: quote.id,
      ownerId: user.id,
      fneInvoiceType: "SALE",
      fneTemplate: company.fneTemplate,
      paymentMethod: "TRANSFER",
      pointOfSale: org.defaultPointOfSale,
      establishment: org.defaultEstablishment,
      commercialMessage: org.commercialMessage,
      footer: org.invoiceFooter,
      foreignCurrency: company.fneTemplate === "B2F" ? "EUR" : null,
      foreignCurrencyRate: company.fneTemplate === "B2F" ? 655.957 : 0,
      // Instantané figé : une facture ne suit pas les modifications ultérieures de la fiche client.
      clientNcc: company.ncc,
      clientCompanyName: company.legalName ?? company.name,
      clientPhone: company.phone ?? "",
      clientEmail: company.email ?? "",
      clientSellerName: user.name,
      lines: {
        create: quote.lines.map((l) => ({
          position: l.position, productId: l.productId, reference: l.reference,
          description: l.description, quantity: l.quantity, unitPrice: l.unitPrice,
          discount: l.discount, unit: l.unit, vatCode: l.vatCode,
        })),
      },
    },
  });

  await logActivity({
    user, action: "CREATE", entity: "Invoice", entityId: invoice.id,
    summary: `Facture ${invoice.number} créée depuis le devis ${quote.number}`,
    meta: { quoteId: quote.id },
  });

  revalidatePath("/devis");
  revalidatePath("/factures");
  redirect(`/factures/${invoice.id}`);
}
