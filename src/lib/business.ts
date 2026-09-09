import type {
  CompanyStatus, FneStatus, InvoiceStatus, OpportunityStage,
  ProjectHealth, ProjectStatus, QuoteStatus, TaskStatus,
  TicketPriority, TicketStatus,
} from "@prisma/client";

/**
 * Règles métier de Markel Technology. Toutes les valeurs chiffrées de
 * l'application vivent ici — jamais dispersées dans les composants.
 */

// ─────────────────────────────── Pipeline ───────────────────────────

/** Probabilité imposée par étape : le commercial ne la saisit pas à la main. */
export const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  NOUVEAU: 10,
  QUALIFIE: 25,
  PROPOSITION: 50,
  NEGOCIATION: 75,
  GAGNE: 100,
  PERDU: 0,
};

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  NOUVEAU: "Nouveau",
  QUALIFIE: "Qualifié",
  PROPOSITION: "Proposition",
  NEGOCIATION: "Négociation",
  GAGNE: "Gagné",
  PERDU: "Perdu",
};

export const PIPELINE_ORDER: OpportunityStage[] = [
  "NOUVEAU", "QUALIFIE", "PROPOSITION", "NEGOCIATION", "GAGNE", "PERDU",
];

/** Colonnes actives du kanban : les affaires closes sortent du tableau. */
export const PIPELINE_OPEN: OpportunityStage[] = [
  "NOUVEAU", "QUALIFIE", "PROPOSITION", "NEGOCIATION",
];

// ──────────────────────────── Commercial ────────────────────────────

/** Validité d'un devis, en jours. */
export const QUOTE_VALIDITY_DAYS = 30;

/** Remise maximale qu'un commercial peut accorder seul. Au-delà : validation direction. */
export const MAX_DISCOUNT_SALES = 15;
export const MAX_DISCOUNT_MANAGER = 30;

/** Délai de paiement par défaut, en jours. */
export const PAYMENT_TERMS_DAYS = 30;

/** Pénalité de retard mensuelle affichée en pied de facture, en pourcentage. */
export const LATE_PENALTY_MONTHLY = 1.5;

// ─────────────────────────────── Support ────────────────────────────

/** Engagement de service, en heures, à compter de l'ouverture du ticket. */
export const SLA_HOURS: Record<TicketPriority, number> = { P1: 4, P2: 8, P3: 24, P4: 72 };

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  P1: "P1 — Critique",
  P2: "P2 — Majeur",
  P3: "P3 — Normal",
  P4: "P4 — Mineur",
};

export function slaDueDate(priority: TicketPriority, from = new Date()): Date {
  return new Date(from.getTime() + SLA_HOURS[priority] * 3_600_000);
}

// ─────────────────────────────── Projets ────────────────────────────

/**
 * Santé d'un projet : on compare la consommation budgétaire à l'avancement.
 * Un projet à 40 % d'avancement qui a brûlé 70 % du budget est critique.
 */
export function projectHealth(progress: number, consumedRatio: number): ProjectHealth {
  if (progress >= 100) return "BON";
  const drift = consumedRatio * 100 - progress;
  if (drift >= 25) return "CRITIQUE";
  if (drift >= 10) return "VIGILANCE";
  return "BON";
}

// ───────────────────────── Libellés de statut ───────────────────────

/** Jeton de couleur — jamais un hexadécimal. Voir design/FICHE-DESIGN.md. */
export type Tone = "brand" | "gold" | "success" | "warning" | "danger" | "violet" | "teal" | "neutral";

export interface StatusMeta { label: string; tone: Tone }

export const COMPANY_STATUS: Record<CompanyStatus, StatusMeta> = {
  PROSPECT: { label: "Prospect", tone: "warning" },
  CLIENT: { label: "Client", tone: "success" },
  PARTENAIRE: { label: "Partenaire", tone: "violet" },
  INACTIF: { label: "Inactif", tone: "neutral" },
};

export const OPPORTUNITY_STATUS: Record<OpportunityStage, StatusMeta> = {
  NOUVEAU: { label: "Nouveau", tone: "neutral" },
  QUALIFIE: { label: "Qualifié", tone: "brand" },
  PROPOSITION: { label: "Proposition", tone: "teal" },
  NEGOCIATION: { label: "Négociation", tone: "warning" },
  GAGNE: { label: "Gagné", tone: "success" },
  PERDU: { label: "Perdu", tone: "danger" },
};

export const QUOTE_STATUS: Record<QuoteStatus, StatusMeta> = {
  BROUILLON: { label: "Brouillon", tone: "neutral" },
  ENVOYE: { label: "Envoyé", tone: "brand" },
  ACCEPTE: { label: "Accepté", tone: "success" },
  REFUSE: { label: "Refusé", tone: "danger" },
  EXPIRE: { label: "Expiré", tone: "warning" },
};

export const INVOICE_STATUS: Record<InvoiceStatus, StatusMeta> = {
  BROUILLON: { label: "Brouillon", tone: "neutral" },
  EMISE: { label: "Émise", tone: "brand" },
  PARTIELLE: { label: "Partiellement réglée", tone: "warning" },
  PAYEE: { label: "Payée", tone: "success" },
  EN_RETARD: { label: "En retard", tone: "danger" },
  ANNULEE: { label: "Annulée", tone: "neutral" },
};

/** Le doré est réservé à la certification FNE — c'est la signature du produit. */
export const FNE_STATUS: Record<FneStatus, StatusMeta> = {
  NON_SOUMISE: { label: "Non soumise", tone: "neutral" },
  EN_ATTENTE: { label: "En attente DGI", tone: "warning" },
  CERTIFIEE: { label: "Certifiée DGI", tone: "gold" },
  REJETEE: { label: "Rejetée", tone: "danger" },
  AVOIR_EMIS: { label: "Avoir émis", tone: "violet" },
};

export const PROJECT_STATUS: Record<ProjectStatus, StatusMeta> = {
  CADRAGE: { label: "Cadrage", tone: "neutral" },
  EN_COURS: { label: "En cours", tone: "brand" },
  EN_PAUSE: { label: "En pause", tone: "warning" },
  LIVRE: { label: "Livré", tone: "success" },
  CLOTURE: { label: "Clôturé", tone: "neutral" },
  ANNULE: { label: "Annulé", tone: "danger" },
};

export const PROJECT_HEALTH: Record<ProjectHealth, StatusMeta> = {
  BON: { label: "Sous contrôle", tone: "success" },
  VIGILANCE: { label: "Vigilance", tone: "warning" },
  CRITIQUE: { label: "Critique", tone: "danger" },
};

export const TASK_STATUS: Record<TaskStatus, StatusMeta> = {
  A_FAIRE: { label: "À faire", tone: "neutral" },
  EN_COURS: { label: "En cours", tone: "brand" },
  EN_REVUE: { label: "En revue", tone: "violet" },
  TERMINE: { label: "Terminé", tone: "success" },
};

export const TICKET_STATUS: Record<TicketStatus, StatusMeta> = {
  NOUVEAU: { label: "Nouveau", tone: "brand" },
  EN_COURS: { label: "En cours", tone: "warning" },
  EN_ATTENTE_CLIENT: { label: "Attente client", tone: "violet" },
  RESOLU: { label: "Résolu", tone: "success" },
  CLOS: { label: "Clos", tone: "neutral" },
};

export const TICKET_PRIORITY: Record<TicketPriority, StatusMeta> = {
  P1: { label: "P1", tone: "danger" },
  P2: { label: "P2", tone: "warning" },
  P3: { label: "P3", tone: "brand" },
  P4: { label: "P4", tone: "neutral" },
};

// ────────────────────────── Numérotation ────────────────────────────

/** MT-D-2026-0007 (devis), MT-F-2026-0007 (facture), MT-A-… (avoir), etc. */
export function sequenceNumber(prefix: string, index: number, year = new Date().getFullYear()) {
  return `MT-${prefix}-${year}-${String(index).padStart(4, "0")}`;
}

/** Statut de facture recalculé à partir des règlements et de l'échéance. */
export function deriveInvoiceStatus(
  current: InvoiceStatus,
  total: number,
  paid: number,
  dueDate: Date,
): InvoiceStatus {
  if (current === "BROUILLON" || current === "ANNULEE") return current;
  if (paid >= total && total > 0) return "PAYEE";
  if (dueDate.getTime() < Date.now()) return "EN_RETARD";
  if (paid > 0) return "PARTIELLE";
  return "EMISE";
}
