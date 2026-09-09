import { prisma } from "./prisma";
import { computeInvoice, type ComputedInvoice } from "./fne/compute";

export const INVOICE_INCLUDE = {
  lines: { include: { customTaxes: true, product: true }, orderBy: { position: "asc" } },
  customTaxes: true,
  company: true,
  quote: { select: { id: true, number: true, title: true } },
  project: { select: { id: true, code: true, name: true } },
  owner: { select: { id: true, name: true, accentToken: true } },
  payments: { orderBy: { paidAt: "desc" } },
  creditNotes: { include: { lines: { include: { invoiceLine: true } } } },
} as const;

type InvoiceLike = {
  discount: number;
  lines: Array<{
    position: number; description: string; quantity: number; unitPrice: number;
    discount: number; vatCode: never; customTaxes: Array<{ name: string; rate: number }>;
  }>;
  customTaxes: Array<{ name: string; rate: number; lineId: string | null }>;
};

/** Totaux d'une facture ou d'un devis, à partir de leurs lignes. */
export function totalsOf(doc: InvoiceLike): ComputedInvoice {
  return computeInvoice(
    [...doc.lines]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        description: l.description, quantity: l.quantity, unitPrice: l.unitPrice,
        discount: l.discount, vatCode: l.vatCode,
        customTaxes: l.customTaxes.map((t) => ({ name: t.name, rate: t.rate })),
      })),
    doc.discount,
    doc.customTaxes.filter((t) => !t.lineId).map((t) => ({ name: t.name, rate: t.rate })),
  );
}

/** Prochain numéro interne d'une série (facture, devis, avoir). */
export async function nextNumber(kind: "F" | "D" | "A"): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MT-${kind}-${year}-`;
  const model =
    kind === "F" ? prisma.invoice : kind === "D" ? prisma.quote : prisma.creditNote;
  const last = await (model as { findFirst: (args: unknown) => Promise<{ number: string } | null> }).findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const n = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}
