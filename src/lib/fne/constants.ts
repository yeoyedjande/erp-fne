import type { FneTemplate, PaymentMethod, VatCode } from "@prisma/client";

/**
 * Nomenclature de la plateforme FNE (DGI Côte d'Ivoire),
 * annexe 1 de la « Procédure d'interfaçage des entreprises par API », mai 2025.
 */

/** Taux de TVA par code FNE, en pourcentage. */
export const VAT_RATES: Record<VatCode, number> = {
  TVA: 18,
  TVAB: 9,
  TVAC: 0,
  TVAD: 0,
};

export const VAT_LABELS: Record<VatCode, string> = {
  TVA: "TVA normale 18 %",
  TVAB: "TVA réduite 9 %",
  TVAC: "Exonération conventionnelle",
  TVAD: "Exonération légale (TEE, RME)",
};

export const VAT_SHORT: Record<VatCode, string> = {
  TVA: "TVA 18 %",
  TVAB: "TVA 9 %",
  TVAC: "Exo. conv.",
  TVAD: "Exo. lég.",
};

/** `paymentMethod` — valeurs littérales attendues par l'API. */
export const PAYMENT_METHOD_API: Record<PaymentMethod, string> = {
  CASH: "cash",
  CARD: "card",
  CHECK: "check",
  MOBILE_MONEY: "mobile-money",
  TRANSFER: "transfer",
  DEFERRED: "deferred",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Espèces",
  CARD: "Carte bancaire",
  CHECK: "Chèque",
  MOBILE_MONEY: "Mobile Money",
  TRANSFER: "Virement bancaire",
  DEFERRED: "À terme",
};

export const TEMPLATE_LABELS: Record<FneTemplate, string> = {
  B2B: "B2B — entreprise avec NCC",
  B2C: "B2C — particulier",
  B2G: "B2G — institution publique",
  B2F: "B2F — client à l'international",
};

export const TEMPLATE_HINTS: Record<FneTemplate, string> = {
  B2B: "Le NCC du client est obligatoire.",
  B2C: "Aucun NCC requis.",
  B2G: "Institution gouvernementale ivoirienne.",
  B2F: "Devise étrangère et taux de change obligatoires.",
};

/** Devises acceptées par le champ `foreignCurrency`. */
export const FNE_CURRENCIES = [
  { code: "XOF", label: "Franc CFA" },
  { code: "USD", label: "Dollar américain" },
  { code: "EUR", label: "Euro" },
  { code: "JPY", label: "Yen japonais" },
  { code: "CAD", label: "Dollar canadien" },
  { code: "GBP", label: "Livre sterling" },
  { code: "AUD", label: "Dollar australien" },
  { code: "CNH", label: "Yuan chinois" },
  { code: "CHF", label: "Franc suisse" },
  { code: "HKD", label: "Dollar de Hong Kong" },
  { code: "NZD", label: "Dollar néo-zélandais" },
] as const;

/** Taxes spécifiques usuelles, proposées à la saisie. */
export const COMMON_CUSTOM_TAXES = [
  { name: "AIRSI", rate: 7.5, label: "Acompte d'impôt sur le revenu du secteur informel" },
  { name: "GRA", rate: 5, label: "Taxe spécifique" },
  { name: "DTD", rate: 5, label: "Droit de timbre de quittance" },
] as const;

/** Environnement de test communiqué par la DGI. */
export const FNE_TEST_BASE_URL = "http://54.247.95.108/ws";
export const FNE_VERIFICATION_BASE = "http://54.247.95.108/fr/verification";

export const FNE_ENDPOINTS = {
  sign: "/external/invoices/sign",
  refund: (remoteId: string) => `/external/invoices/${remoteId}/refund`,
} as const;

/** Codes d'erreur documentés en annexe 2. */
export const FNE_ERROR_CODES: Record<number, string> = {
  400: "Erreur dans la requête",
  401: "Erreur d'authentification",
  500: "Endpoint non disponible",
};

/** Seuil sous lequel la DGI signale un stock de stickers bas (`warning: true`). */
export const STICKER_WARNING_THRESHOLD = 50;
