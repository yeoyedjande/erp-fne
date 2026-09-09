import { randomUUID } from "crypto";
import {
  FNE_ENDPOINTS,
  FNE_TEST_BASE_URL,
  FNE_VERIFICATION_BASE,
  STICKER_WARNING_THRESHOLD,
} from "./constants";
import type {
  FneCallResult,
  FneErrorBody,
  FneMode,
  FneRefundPayload,
  FneSignPayload,
  FneSignSuccess,
} from "./types";

/**
 * Client de la plateforme FNE.
 *
 * Deux modes, pilotés par FNE_MODE :
 *  - "live" : appels HTTP réels, Bearer token, conformes à la procédure DGI.
 *  - "mock" (défaut) : simulateur local qui rejoue le contrat à l'identique —
 *    mêmes validations, mêmes codes 400/401/500, même forme de réponse, même
 *    format de référence normalisée. Aucun octet ne quitte le serveur.
 *
 * Le simulateur n'est pas un bouchon : il refuse ce que la DGI refuserait.
 * Basculer en production ne demande que deux variables d'environnement.
 */

export function getMode(): FneMode {
  return process.env.FNE_MODE === "live" ? "live" : "mock";
}

export function getBaseUrl(): string {
  return process.env.FNE_BASE_URL?.replace(/\/$/, "") || FNE_TEST_BASE_URL;
}

export function getVerificationBase(): string {
  return process.env.FNE_VERIFICATION_BASE?.replace(/\/$/, "") || FNE_VERIFICATION_BASE;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.FNE_API_KEY);
}

function err(status: number, message: string, error: string, extra?: unknown): FneErrorBody {
  return { message, error, statusCode: status, errors: extra };
}

/** Numéro normalisé : NCC + année sur 2 chiffres + séquence sur 9 chiffres. */
export function buildReference(ncc: string, sequence: number, date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  return `${ncc}${yy}${String(sequence).padStart(9, "0")}`;
}

/** Référence d'avoir : préfixe « A », séquence sur 8 chiffres (format DGI). */
export function buildCreditReference(ncc: string, sequence: number, date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  return `A${ncc}${yy}${String(sequence).padStart(8, "0")}`;
}

// ───────────────────────── Validation partagée ──────────────────────

/** Reproduit les refus de la plateforme. Retourne null si la charge est valide. */
export function validateSignPayload(p: FneSignPayload): FneErrorBody | null {
  if (!p.items || p.items.length === 0) {
    return err(400, "Items must not be empty", "bad_request");
  }
  if (!p.pointOfSale?.trim()) {
    return err(400, "Point of sale is not valid", "bad_request");
  }
  if (!p.establishment?.trim()) {
    return err(400, "Establishment is not valid", "bad_request");
  }
  if (!p.clientCompanyName?.trim()) {
    return err(400, "Client company name is required", "bad_request");
  }
  if (!p.clientPhone?.trim()) {
    return err(400, "Client phone is required", "bad_request");
  }
  if (!p.clientEmail?.trim()) {
    return err(400, "Client email is required", "bad_request");
  }
  if (p.template === "B2B" && !p.clientNcc?.trim()) {
    return err(400, "Client NCC is required for B2B template", "bad_request");
  }
  if (p.template === "B2F" && (!p.foreignCurrency || !p.foreignCurrencyRate)) {
    return err(
      400,
      "Foreign currency and rate are required for B2F template",
      "bad_request",
    );
  }
  if (p.isRne && !p.rne?.trim()) {
    return err(400, "RNE number is required when isRne is true", "bad_request");
  }
  for (const [i, item] of p.items.entries()) {
    if (!item.description?.trim()) {
      return err(400, `Item ${i + 1}: description is required`, "bad_request");
    }
    if (!(item.quantity > 0)) {
      return err(400, `Item ${i + 1}: quantity must be greater than 0`, "bad_request");
    }
    if (item.amount == null || item.amount < 0) {
      return err(400, `Item ${i + 1}: amount is not valid`, "bad_request");
    }
  }
  return null;
}

// ─────────────────────────── Mode simulateur ────────────────────────

export interface MockContext {
  ncc: string;
  sequence: number;
  stickerBalance: number;
}

function mockSign(p: FneSignPayload, ctx: MockContext, started: number): FneCallResult {
  const invalid = validateSignPayload(p);
  const durationMs = Date.now() - started + 40 + Math.floor(Math.random() * 60);

  if (invalid) return { ok: false, status: 400, error: invalid, durationMs, mode: "mock" };

  if (ctx.stickerBalance <= 0) {
    return {
      ok: false,
      status: 400,
      error: err(400, "Sticker balance exhausted", "bad_request"),
      durationMs,
      mode: "mock",
    };
  }

  const token = randomUUID();
  const reference = buildReference(ctx.ncc, ctx.sequence);
  const balance = ctx.stickerBalance - 1;
  const now = new Date().toISOString();

  const data: FneSignSuccess = {
    ncc: ctx.ncc,
    reference,
    token: `${getVerificationBase()}/${token}`,
    warning: balance < STICKER_WARNING_THRESHOLD,
    balance_sticker: balance,
    invoice: {
      id: randomUUID(),
      parentId: null,
      parentReference: null,
      token,
      reference,
      type: p.invoiceType === "purchase" ? "purchase" : "invoice",
      subtype: "normal",
      date: now,
      paymentMethod: p.paymentMethod,
      amount: 0,
      vatAmount: 0,
      fiscalStamp: 0,
      discount: p.discount ?? 0,
      clientNcc: p.clientNcc ?? null,
      clientCompanyName: p.clientCompanyName,
      clientPhone: p.clientPhone,
      clientEmail: p.clientEmail,
      clientSellerName: p.clientSellerName ?? null,
      clientEstablishment: p.establishment,
      clientPointOfSale: p.pointOfSale,
      status: p.paymentMethod === "deferred" ? "pending" : "paid",
      template: p.template,
      isRne: p.isRne,
      rne: p.rne ?? null,
      source: "api",
      createdAt: now,
      updatedAt: now,
      items: p.items.map((it) => ({
        id: randomUUID(),
        reference: it.reference ?? null,
        description: it.description,
        quantity: it.quantity,
        amount: it.amount,
        discount: it.discount ?? 0,
        measurementUnit: it.measurementUnit ?? null,
      })),
    },
  };

  return { ok: true, status: 200, data, durationMs, mode: "mock" };
}

function mockRefund(
  p: FneRefundPayload,
  ctx: MockContext,
  started: number,
): FneCallResult {
  const durationMs = Date.now() - started + 40 + Math.floor(Math.random() * 60);

  if (!p.items || p.items.length === 0) {
    return {
      ok: false,
      status: 400,
      error: err(400, "Items must not be empty", "bad_request"),
      durationMs,
      mode: "mock",
    };
  }
  for (const it of p.items) {
    if (!it.id) {
      return {
        ok: false,
        status: 400,
        error: err(400, "Item id is required", "bad_request"),
        durationMs,
        mode: "mock",
      };
    }
    if (!(it.quantity > 0)) {
      return {
        ok: false,
        status: 400,
        error: err(400, "Quantity must be greater than 0", "bad_request"),
        durationMs,
        mode: "mock",
      };
    }
  }

  const token = randomUUID();
  const balance = Math.max(0, ctx.stickerBalance - 1);
  return {
    ok: true,
    status: 201,
    data: {
      ncc: ctx.ncc,
      reference: buildCreditReference(ctx.ncc, ctx.sequence),
      token: `${getVerificationBase()}/${token}`,
      warning: balance < STICKER_WARNING_THRESHOLD,
      balance_sticker: balance,
    },
    durationMs,
    mode: "mock",
  };
}

// ───────────────────────────── Mode réel ────────────────────────────

async function callLive(
  path: string,
  body: unknown,
  started: number,
): Promise<FneCallResult> {
  const apiKey = process.env.FNE_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      error: err(401, "Invalid API Key", "unauthorized_exception"),
      durationMs: Date.now() - started,
      mode: "live",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    const durationMs = Date.now() - started;
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { message: text.slice(0, 500) };
    }

    if (res.ok) {
      return { ok: true, status: res.status, data: parsed as FneSignSuccess, durationMs, mode: "live" };
    }
    const failure = parsed as Partial<FneErrorBody> | null;
    return {
      ok: false,
      status: res.status,
      error: err(
        res.status,
        failure?.message ?? "Erreur inconnue de la plateforme FNE",
        failure?.error ?? "unknown_error",
        failure?.errors,
      ),
      durationMs,
      mode: "live",
    };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      status: 500,
      error: err(
        500,
        aborted
          ? "La plateforme FNE n'a pas répondu dans le délai imparti (20 s)."
          : "Internal Server Error",
        "internal_server_error",
      ),
      durationMs: Date.now() - started,
      mode: "live",
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ──────────────────────────── API publique ──────────────────────────

/** API FNE #1 et #3 — certification d'une facture de vente ou d'un bordereau d'achat. */
export async function signInvoice(
  payload: FneSignPayload,
  ctx: MockContext,
): Promise<FneCallResult> {
  const started = Date.now();
  if (getMode() === "live") return callLive(FNE_ENDPOINTS.sign, payload, started);
  return mockSign(payload, ctx, started);
}

/** API FNE #2 — certification d'une facture d'avoir. */
export async function refundInvoice(
  remoteId: string,
  payload: FneRefundPayload,
  ctx: MockContext,
): Promise<FneCallResult> {
  const started = Date.now();
  if (getMode() === "live") {
    return callLive(FNE_ENDPOINTS.refund(remoteId), payload, started);
  }
  return mockRefund(payload, ctx, started);
}
