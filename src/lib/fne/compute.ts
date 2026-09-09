import type { VatCode } from "@prisma/client";
import { VAT_RATES } from "./constants";

/**
 * Calcul fiscal d'une facture normalisée.
 *
 * Cascade retenue, conforme à l'ordre implicite du contrat FNE
 * (remise d'article, puis remise sur le total HT, puis taxes) :
 *
 *   brut ligne      = quantité × prix unitaire HT
 *   net ligne       = brut × (1 − remise_ligne / 100)
 *   sous-total HT   = Σ net ligne
 *   base HT         = sous-total × (1 − remise_globale / 100)
 *   base ligne      = net ligne × (1 − remise_globale / 100)   ← prorata
 *   TVA ligne       = base ligne × taux(code TVA)
 *   taxe spéc.ligne = base ligne × taux
 *   taxe spéc. pied = base HT × taux
 *   TTC             = base HT + Σ TVA + Σ taxes spécifiques
 *
 * Vérification sur l'exemple de la documentation DGI : deux articles
 * (30 × 20 000 remise 10 %) et (20 × 12 000 remise 10 %) avec une remise
 * globale de 10 % donnent une base HT de 680 400 XOF — exactement l'écart
 * `amount − vatAmount` de la réponse d'exemple (852 660 − 172 260). La
 * cascade est donc la bonne. (Le reste de cet exemple de la DGI est
 * incohérent : la réponse publiée décrit une autre facture que la requête.)
 *
 * Tous les agrégats sont arrondis à l'entier : le franc CFA n'a pas de décimale.
 */

export interface ComputableTax {
  name: string;
  rate: number;
}

export interface ComputableLine {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatCode: VatCode;
  customTaxes?: ComputableTax[];
}

export interface ComputedLine {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatCode: VatCode;
  gross: number;
  net: number;
  base: number;
  vatRate: number;
  vat: number;
  customTaxTotal: number;
  total: number;
}

export interface TaxBreakdownRow {
  label: string;
  rate: number;
  base: number;
  amount: number;
}

export interface ComputedInvoice {
  lines: ComputedLine[];
  /** Σ des lignes après remise d'article, avant remise globale. */
  subtotal: number;
  globalDiscount: number;
  discountAmount: number;
  /** Assiette HT définitive. */
  baseHT: number;
  vatTotal: number;
  vatBreakdown: TaxBreakdownRow[];
  customTaxTotal: number;
  customTaxBreakdown: TaxBreakdownRow[];
  total: number;
}

const round = (n: number) => Math.round(n);

export function computeInvoice(
  lines: ComputableLine[],
  globalDiscount = 0,
  footerTaxes: ComputableTax[] = [],
): ComputedInvoice {
  const discountFactor = 1 - (globalDiscount || 0) / 100;

  const netByLine = lines.map((l) => {
    const gross = l.quantity * l.unitPrice;
    return { gross, net: gross * (1 - (l.discount || 0) / 100) };
  });

  const subtotal = netByLine.reduce((s, l) => s + l.net, 0);
  const baseHT = subtotal * discountFactor;

  const vatBuckets = new Map<string, TaxBreakdownRow>();
  const customBuckets = new Map<string, TaxBreakdownRow>();

  const computed: ComputedLine[] = lines.map((l, i) => {
    const { gross, net } = netByLine[i];
    const base = net * discountFactor;
    const vatRate = VAT_RATES[l.vatCode];
    const vat = (base * vatRate) / 100;

    let customTaxTotal = 0;
    for (const t of l.customTaxes ?? []) {
      const amount = (base * t.rate) / 100;
      customTaxTotal += amount;
      const key = `${t.name}@${t.rate}`;
      const row = customBuckets.get(key) ?? { label: t.name, rate: t.rate, base: 0, amount: 0 };
      row.base += base;
      row.amount += amount;
      customBuckets.set(key, row);
    }

    if (base > 0) {
      const key = l.vatCode;
      const row = vatBuckets.get(key) ?? { label: l.vatCode, rate: vatRate, base: 0, amount: 0 };
      row.base += base;
      row.amount += vat;
      vatBuckets.set(key, row);
    }

    return {
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount || 0,
      vatCode: l.vatCode,
      gross: round(gross),
      net: round(net),
      base: round(base),
      vatRate,
      vat: round(vat),
      customTaxTotal: round(customTaxTotal),
      total: round(base + vat + customTaxTotal),
    };
  });

  // Taxes spécifiques de pied de facture : assises sur la base HT globale.
  for (const t of footerTaxes) {
    const amount = (baseHT * t.rate) / 100;
    const key = `${t.name}@${t.rate}`;
    const row = customBuckets.get(key) ?? { label: t.name, rate: t.rate, base: 0, amount: 0 };
    row.base += baseHT;
    row.amount += amount;
    customBuckets.set(key, row);
  }

  const vatBreakdown = [...vatBuckets.values()]
    .map((r) => ({ ...r, base: round(r.base), amount: round(r.amount) }))
    .sort((a, b) => b.rate - a.rate);

  const customTaxBreakdown = [...customBuckets.values()]
    .map((r) => ({ ...r, base: round(r.base), amount: round(r.amount) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const vatTotal = vatBreakdown.reduce((s, r) => s + r.amount, 0);
  const customTaxTotal = customTaxBreakdown.reduce((s, r) => s + r.amount, 0);
  const roundedBase = round(baseHT);

  return {
    lines: computed,
    subtotal: round(subtotal),
    globalDiscount: globalDiscount || 0,
    discountAmount: round(subtotal - baseHT),
    baseHT: roundedBase,
    vatTotal,
    vatBreakdown,
    customTaxTotal,
    customTaxBreakdown,
    total: roundedBase + vatTotal + customTaxTotal,
  };
}
