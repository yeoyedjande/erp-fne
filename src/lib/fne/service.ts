import type { Invoice, InvoiceCustomTax, InvoiceLine, Organization } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeInvoice } from "./compute";
import { PAYMENT_METHOD_API } from "./constants";
import {
  getMode,
  getVerificationBase,
  refundInvoice,
  signInvoice,
  validateSignPayload,
  type MockContext,
} from "./client";
import type { FneCallResult, FneSignPayload } from "./types";

type FullInvoice = Invoice & {
  lines: (InvoiceLine & { customTaxes: InvoiceCustomTax[] })[];
  customTaxes: InvoiceCustomTax[];
};

/** Taxes de pied : celles rattachées à la facture et non à une ligne. */
const footerTaxes = (inv: FullInvoice) =>
  inv.customTaxes.filter((t) => !t.lineId).map((t) => ({ name: t.name, rate: t.rate }));

/** Traduit une facture Markel en charge utile FNE. */
export function buildSignPayload(inv: FullInvoice, org: Organization): FneSignPayload {
  return {
    invoiceType: inv.fneInvoiceType === "PURCHASE" ? "purchase" : "sale",
    paymentMethod: PAYMENT_METHOD_API[inv.paymentMethod],
    template: inv.fneTemplate,
    isRne: inv.isRne,
    rne: inv.isRne ? inv.rne : null,
    ...(inv.fneTemplate === "B2B" && inv.clientNcc ? { clientNcc: inv.clientNcc } : {}),
    clientCompanyName: inv.clientCompanyName,
    clientPhone: inv.clientPhone,
    clientEmail: inv.clientEmail,
    clientSellerName: inv.clientSellerName ?? undefined,
    pointOfSale: inv.pointOfSale || org.defaultPointOfSale,
    establishment: inv.establishment || org.defaultEstablishment,
    commercialMessage: inv.commercialMessage ?? org.commercialMessage ?? undefined,
    footer: inv.footer ?? org.invoiceFooter ?? undefined,
    foreignCurrency: inv.foreignCurrency ?? "",
    foreignCurrencyRate: inv.foreignCurrencyRate ?? 0,
    items: [...inv.lines]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        reference: l.reference ?? undefined,
        description: l.description,
        quantity: l.quantity,
        amount: l.unitPrice,
        discount: l.discount || undefined,
        measurementUnit: l.unit,
        taxes: [l.vatCode],
        customTaxes: l.customTaxes.length
          ? l.customTaxes.map((t) => ({ name: t.name, rate: t.rate })).map((t) => ({
              name: t.name,
              amount: t.rate,
            }))
          : undefined,
      })),
    customTaxes: footerTaxes(inv).length
      ? footerTaxes(inv).map((t) => ({ name: t.name, amount: t.rate }))
      : undefined,
    discount: inv.discount || undefined,
  };
}

/** Contrôle préalable, sans appel réseau — alimente l'écran de certification. */
export function preflight(inv: FullInvoice, org: Organization) {
  const payload = buildSignPayload(inv, org);
  const problem = validateSignPayload(payload);
  const blockers: string[] = [];

  if (problem) blockers.push(translateFneError(problem.message));
  if (inv.fneStatus === "CERTIFIEE") blockers.push("Cette facture est déjà certifiée.");
  if (inv.status === "ANNULEE") blockers.push("Une facture annulée ne peut pas être certifiée.");
  if (!org.ncc) blockers.push("Le NCC de Markel Technology n'est pas renseigné dans les paramètres.");
  if (org.fneStickerBalance <= 0) blockers.push("Le stock de stickers électroniques est épuisé.");

  return { payload, blockers, ready: blockers.length === 0 };
}

async function nextSequence(): Promise<number> {
  const certified = await prisma.invoice.count({
    where: { fneReference: { not: null } },
  });
  return certified + 1;
}

async function record(
  result: FneCallResult,
  params: { endpoint: string; invoiceId: string | null; userId: string | null; requestBody: unknown },
) {
  await prisma.fneLog.create({
    data: {
      endpoint: params.endpoint,
      method: "POST",
      mode: result.mode,
      statusCode: result.status,
      success: result.ok,
      durationMs: result.durationMs,
      requestBody: params.requestBody as never,
      responseBody: (result.ok ? result.data : result.error) as never,
      errorCode: result.ok ? null : result.error.error,
      errorMessage: result.ok ? null : result.error.message,
      invoiceId: params.invoiceId,
      userId: params.userId,
    },
  });
}

/** Messages de la plateforme traduits pour l'utilisateur métier. */
export function translateFneError(message: string): string {
  const map: Array<[RegExp, string]> = [
    [/Client NCC is required/i, "Le NCC du client est obligatoire pour une facture B2B."],
    [/Point of sale is not valid/i, "Le point de vente est invalide ou absent."],
    [/Establishment is not valid/i, "L'établissement est invalide ou absent."],
    [/Items must not be empty/i, "La facture ne contient aucune ligne."],
    [/Foreign currency and rate/i, "Devise étrangère et taux de change obligatoires en B2F."],
    [/RNE number is required/i, "Le numéro de reçu (RNE) est obligatoire."],
    [/Client company name is required/i, "La raison sociale du client est obligatoire."],
    [/Client phone is required/i, "Le téléphone du client est obligatoire."],
    [/Client email is required/i, "L'e-mail du client est obligatoire."],
    [/Sticker balance exhausted/i, "Stock de stickers électroniques épuisé — recharger l'espace FNE."],
    [/Invalid API Key|Unauthorized/i, "Clé API FNE invalide ou révoquée."],
    [/Internal Server Error/i, "La plateforme FNE est indisponible. Réessayer plus tard."],
    [/n'a pas répondu/i, message],
    [/quantity must be greater/i, "Une quantité doit être strictement positive."],
    [/amount is not valid/i, "Un prix unitaire est invalide."],
    [/description is required/i, "Une désignation d'article est manquante."],
  ];
  for (const [re, fr] of map) if (re.test(message)) return fr;
  return message;
}

export interface CertifyOutcome {
  ok: boolean;
  message: string;
  reference?: string;
  verificationUrl?: string;
  balance?: number;
  warning?: boolean;
}

/**
 * API FNE #1 / #3 — certifie une facture et enregistre le sticker.
 * Journalise systématiquement, succès comme échec.
 */
export async function certifyInvoice(
  invoiceId: string,
  userId: string | null,
): Promise<CertifyOutcome> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: "org" } });
  const invoice = (await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lines: { include: { customTaxes: true } }, customTaxes: true },
  })) as FullInvoice;

  const { payload, blockers, ready } = preflight(invoice, org);
  if (!ready) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { fneStatus: "REJETEE", fneError: blockers[0] },
    });
    return { ok: false, message: blockers[0] };
  }

  await prisma.invoice.update({ where: { id: invoiceId }, data: { fneStatus: "EN_ATTENTE" } });

  const ctx: MockContext = {
    ncc: org.ncc,
    sequence: await nextSequence(),
    stickerBalance: org.fneStickerBalance,
  };

  const result = await signInvoice(payload, ctx);
  await record(result, {
    endpoint: "/external/invoices/sign",
    invoiceId,
    userId,
    requestBody: payload,
  });

  if (!result.ok) {
    const message = translateFneError(result.error.message);
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { fneStatus: "REJETEE", fneError: message },
    });
    return { ok: false, message };
  }

  const data = result.data;
  const token = data.invoice?.token ?? data.token.split("/").pop() ?? "";
  const verificationUrl = data.token.startsWith("http")
    ? data.token
    : `${getVerificationBase()}/${token}`;

  // Les identifiants d'article renvoyés par la FNE sont indispensables pour un avoir.
  const returned = data.invoice?.items ?? [];
  const ordered = [...invoice.lines].sort((a, b) => a.position - b.position);

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        fneStatus: "CERTIFIEE",
        fneReference: data.reference,
        fneToken: token,
        fneVerificationUrl: verificationUrl,
        fneRemoteId: data.invoice?.id ?? null,
        fneCertifiedAt: new Date(),
        fneStickerBalance: data.balance_sticker,
        fneWarning: Boolean(data.warning),
        fneError: null,
        status: invoice.status === "BROUILLON" ? "EMISE" : invoice.status,
      },
    }),
    ...ordered.map((line, i) =>
      prisma.invoiceLine.update({
        where: { id: line.id },
        data: { fneItemId: returned[i]?.id ?? line.fneItemId },
      }),
    ),
    prisma.organization.update({
      where: { id: "org" },
      data: { fneStickerBalance: data.balance_sticker },
    }),
  ]);

  return {
    ok: true,
    message: `Facture certifiée par la DGI sous la référence ${data.reference}.`,
    reference: data.reference,
    verificationUrl,
    balance: data.balance_sticker,
    warning: Boolean(data.warning),
  };
}

/** API FNE #2 — certifie une facture d'avoir sur une facture déjà certifiée. */
export async function certifyCreditNote(
  creditNoteId: string,
  userId: string | null,
): Promise<CertifyOutcome> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: "org" } });
  const note = await prisma.creditNote.findUniqueOrThrow({
    where: { id: creditNoteId },
    include: { lines: { include: { invoiceLine: true } }, invoice: true },
  });

  if (!note.invoice.fneRemoteId) {
    return {
      ok: false,
      message: "La facture d'origine n'a pas d'identifiant FNE : certifiez-la d'abord.",
    };
  }

  const items = note.lines
    .filter((l) => l.invoiceLine.fneItemId)
    .map((l) => ({ id: l.invoiceLine.fneItemId as string, quantity: l.quantity }));

  if (items.length === 0) {
    return {
      ok: false,
      message: "Aucun article de la facture d'origine n'a d'identifiant FNE exploitable.",
    };
  }

  const payload = { items };
  const result = await refundInvoice(note.invoice.fneRemoteId, payload, {
    ncc: org.ncc,
    sequence: (await prisma.creditNote.count({ where: { fneReference: { not: null } } })) + 1,
    stickerBalance: org.fneStickerBalance,
  });

  await record(result, {
    endpoint: `/external/invoices/${note.invoice.fneRemoteId}/refund`,
    invoiceId: note.invoiceId,
    userId,
    requestBody: payload,
  });

  if (!result.ok) {
    const message = translateFneError(result.error.message);
    await prisma.creditNote.update({ where: { id: creditNoteId }, data: { fneError: message } });
    return { ok: false, message };
  }

  const data = result.data;
  const token = data.token.split("/").pop() ?? "";

  await prisma.$transaction([
    prisma.creditNote.update({
      where: { id: creditNoteId },
      data: {
        fneReference: data.reference,
        fneToken: token,
        fneVerificationUrl: data.token,
        fneStickerBalance: data.balance_sticker,
        certifiedAt: new Date(),
        fneError: null,
      },
    }),
    prisma.invoice.update({
      where: { id: note.invoiceId },
      data: { fneStatus: "AVOIR_EMIS" },
    }),
    prisma.organization.update({
      where: { id: "org" },
      data: { fneStickerBalance: data.balance_sticker },
    }),
  ]);

  return {
    ok: true,
    message: `Avoir certifié sous la référence ${data.reference}.`,
    reference: data.reference,
    verificationUrl: data.token,
    balance: data.balance_sticker,
  };
}

/** Totaux d'une facture, calculés à la demande. */
export function invoiceTotals(inv: FullInvoice) {
  return computeInvoice(
    [...inv.lines]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        id: l.id,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount,
        vatCode: l.vatCode,
        customTaxes: l.customTaxes.map((t) => ({ name: t.name, rate: t.rate })),
      })),
    inv.discount,
    footerTaxes(inv),
  );
}

export const fneMode = getMode;
