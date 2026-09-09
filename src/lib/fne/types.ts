/**
 * Contrat de l'API FNE — transcription fidèle de la documentation DGI.
 * Ces types décrivent le fil, pas notre modèle interne : les noms de champs
 * sont ceux de la plateforme et ne doivent pas être francisés.
 */

export interface FneCustomTaxPayload {
  name: string;
  /** Taux en pourcentage. */
  amount: number;
}

export interface FneItemPayload {
  reference?: string;
  description: string;
  quantity: number;
  /** Prix unitaire HT. */
  amount: number;
  discount?: number;
  measurementUnit?: string;
  /** Codes TVA : TVA | TVAB | TVAC | TVAD */
  taxes?: string[];
  customTaxes?: FneCustomTaxPayload[];
}

export interface FneSignPayload {
  invoiceType: "sale" | "purchase";
  paymentMethod: string;
  template: "B2B" | "B2C" | "B2G" | "B2F";
  isRne: boolean;
  rne?: string | null;
  clientNcc?: string;
  clientCompanyName: string;
  clientPhone: string;
  clientEmail: string;
  clientSellerName?: string;
  pointOfSale: string;
  establishment: string;
  commercialMessage?: string;
  footer?: string;
  foreignCurrency?: string;
  foreignCurrencyRate?: number;
  items: FneItemPayload[];
  customTaxes?: FneCustomTaxPayload[];
  /** Remise sur le total HT, en pourcentage. */
  discount?: number;
}

export interface FneRefundPayload {
  items: Array<{ id: string; quantity: number }>;
}

export interface FneReturnedItem {
  id: string;
  reference?: string | null;
  description: string;
  quantity: number;
  amount: number;
  discount?: number;
  measurementUnit?: string | null;
}

export interface FneInvoiceObject {
  id: string;
  parentId: string | null;
  parentReference: string | null;
  token: string;
  reference: string;
  type: string;
  subtype: string;
  date: string;
  paymentMethod: string;
  /** Total toutes taxes comprises. */
  amount: number;
  vatAmount: number;
  fiscalStamp: number;
  discount: number;
  clientNcc: string | null;
  clientCompanyName: string;
  clientPhone: string;
  clientEmail: string;
  clientSellerName: string | null;
  clientEstablishment: string;
  clientPointOfSale: string;
  status: string;
  template: string;
  isRne: boolean;
  rne: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  items: FneReturnedItem[];
}

export interface FneSignSuccess {
  ncc: string;
  /** Référence normalisée, ex. 9606123E25000000019 */
  reference: string;
  /** URL de vérification à convertir en QR code. */
  token: string;
  warning: boolean;
  balance_sticker: number;
  invoice?: FneInvoiceObject;
}

export interface FneErrorBody {
  message: string;
  error: string;
  statusCode: number;
  errors?: unknown;
}

export type FneCallResult =
  | { ok: true; status: number; data: FneSignSuccess; durationMs: number; mode: FneMode }
  | { ok: false; status: number; error: FneErrorBody; durationMs: number; mode: FneMode };

export type FneMode = "mock" | "live";
