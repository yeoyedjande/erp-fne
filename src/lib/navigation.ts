import type { Capability } from "./permissions";
import type { IconName } from "@/components/ui/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  capability: Capability;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAVIGATION: NavGroup[] = [
  {
    label: "Pilotage",
    items: [
      { href: "/tableau-de-bord", label: "Tableau de bord", icon: "dashboard", capability: "crm.read" },
      { href: "/rapports", label: "Rapports", icon: "chart", capability: "reports.read" },
    ],
  },
  {
    label: "Relation client",
    items: [
      { href: "/societes", label: "Sociétés", icon: "building", capability: "crm.read" },
      { href: "/contacts", label: "Contacts", icon: "users", capability: "crm.read" },
      { href: "/activites", label: "Activités", icon: "calendar", capability: "crm.read" },
    ],
  },
  {
    label: "Vente",
    items: [
      { href: "/pipeline", label: "Pipeline", icon: "target", capability: "pipeline.read" },
      { href: "/devis", label: "Devis", icon: "quote", capability: "quotes.read" },
      { href: "/catalogue", label: "Catalogue", icon: "box", capability: "catalog.read" },
    ],
  },
  {
    label: "Facturation",
    items: [
      { href: "/factures", label: "Factures", icon: "invoice", capability: "invoices.read" },
      { href: "/conformite-fne", label: "Conformité FNE", icon: "seal", capability: "invoices.read" },
    ],
  },
  {
    label: "Delivery",
    items: [
      { href: "/projets", label: "Projets", icon: "folder", capability: "projects.read" },
      { href: "/temps", label: "Feuilles de temps", icon: "clock", capability: "projects.read" },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/tickets", label: "Tickets", icon: "lifebuoy", capability: "tickets.read" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/administration", label: "Administration", icon: "settings", capability: "admin.access" },
    ],
  },
];
