import type { Role } from "@prisma/client";

/** Périmètre de chaque rôle — voir CLAUDE.md. */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Gestionnaire",
  SALES: "Commercial",
  SUPPORT: "Support",
  CLIENT: "Client (portail)",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: "Accès total, y compris administration, paramètres fiscaux et clé API FNE.",
  MANAGER: "Tout le métier : commercial, facturation, certification FNE, projets, support.",
  SALES: "Sociétés, contacts, pipeline, devis, activités. Lecture du catalogue.",
  SUPPORT: "Tickets et activités. Lecture des sociétés et contacts.",
  CLIENT: "Portail client uniquement, limité à sa propre société.",
};

/** Capacités atomiques vérifiées côté serveur. */
export type Capability =
  | "crm.read" | "crm.write"
  | "pipeline.read" | "pipeline.write"
  | "quotes.read" | "quotes.write"
  | "invoices.read" | "invoices.write"
  | "fne.certify" | "fne.settings"
  | "projects.read" | "projects.write"
  | "tickets.read" | "tickets.write"
  | "catalog.read" | "catalog.write"
  | "reports.read"
  | "admin.access"
  | "portal.access";

const ALL_BUSINESS: Capability[] = [
  "crm.read", "crm.write", "pipeline.read", "pipeline.write",
  "quotes.read", "quotes.write", "invoices.read", "invoices.write",
  "fne.certify", "projects.read", "projects.write",
  "tickets.read", "tickets.write", "catalog.read", "catalog.write",
  "reports.read",
];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  SUPER_ADMIN: [...ALL_BUSINESS, "fne.settings", "admin.access"],
  MANAGER: [...ALL_BUSINESS],
  SALES: [
    "crm.read", "crm.write", "pipeline.read", "pipeline.write",
    "quotes.read", "quotes.write", "invoices.read", "catalog.read", "reports.read",
  ],
  SUPPORT: ["crm.read", "tickets.read", "tickets.write", "projects.read", "catalog.read"],
  CLIENT: ["portal.access"],
};

export function can(role: Role | string | undefined, capability: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role as Role]?.includes(capability) ?? false;
}

export function isStaff(role: Role | string | undefined): boolean {
  return role !== undefined && role !== "CLIENT";
}
