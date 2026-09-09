import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signInvoice } from "../src/lib/fne/client";
import { computeInvoice } from "../src/lib/fne/compute";
import { PAYMENT_METHOD_API } from "../src/lib/fne/constants";
import {
  QUOTE_VALIDITY_DAYS, PAYMENT_TERMS_DAYS, SLA_HOURS,
  STAGE_PROBABILITY, projectHealth, sequenceNumber,
} from "../src/lib/business";
import { CLIENT_USER, COMPANIES, CONTACTS, ORG, PRODUCTS, USERS } from "./seed-data";

const prisma = new PrismaClient();

/* Générateur déterministe : deux exécutions produisent la même démonstration. */
let seedState = 20260909;
const rnd = () => {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
  return seedState / 0x7fffffff;
};
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const chance = (p: number) => rnd() < p;

const NOW = new Date("2026-09-09T09:00:00.000Z");
const day = 86_400_000;
const shift = (d: number, from: Date = NOW) => new Date(from.getTime() + d * day);
const monthStart = (offset: number) =>
  new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() + offset, 1, 9, 0, 0));

async function main() {
  console.log("→ Seed Markel CRM — démonstration reproductible\n");

  /* ── Organisation ──────────────────────────────────────────────── */
  await prisma.organization.upsert({
    where: { id: "org" },
    update: { ...ORG },
    create: { id: "org", ...ORG },
  });
  console.log("  Organisation      · Markel Technology (NCC " + ORG.ncc + ")");

  /* ── Utilisateurs ──────────────────────────────────────────────── */
  const users: Record<string, { id: string; name: string }> = {};
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name, role: u.role as never, jobTitle: u.jobTitle,
        phone: u.phone, accentToken: u.accentToken, passwordHash, active: true,
      },
      create: {
        email: u.email, name: u.name, role: u.role as never, jobTitle: u.jobTitle,
        phone: u.phone, accentToken: u.accentToken, passwordHash,
      },
    });
    users[u.email] = { id: created.id, name: created.name };
  }
  const admin = users["admin@markel-technology.ci"];
  const manager = users["gestion@markel-technology.ci"];
  const sales = users["commercial@markel-technology.ci"];
  const sales2 = users["nadia.bamba@markel-technology.ci"];
  const support = users["support@markel-technology.ci"];
  const cto = users["seydou.ouattara@markel-technology.ci"];
  const salesTeam = [sales, sales2, manager];
  console.log(`  Utilisateurs      · ${USERS.length} collaborateurs`);

  /* ── Sociétés ──────────────────────────────────────────────────── */
  const companies: Record<string, { id: string; name: string; ncc: string | null; template: string; email: string; phone: string }> = {};
  for (const [i, c] of COMPANIES.entries()) {
    const owner = salesTeam[i % salesTeam.length];
    const data = {
      legalName: c.legalName, ncc: c.ncc, rccm: c.rccm, industry: c.industry,
      size: c.size, status: c.status as never, tier: c.tier as never,
      fneTemplate: c.fneTemplate as never, website: c.website, email: c.email,
      phone: c.phone, addressLine: c.addressLine, city: c.city, country: c.country,
      source: c.source, tags: c.tags, ownerId: owner.id,
    };
    const existing = await prisma.company.findFirst({ where: { name: c.name } });
    const saved = existing
      ? await prisma.company.update({ where: { id: existing.id }, data })
      : await prisma.company.create({ data: { name: c.name, ...data } });
    companies[c.name] = {
      id: saved.id, name: saved.name, ncc: saved.ncc,
      template: c.fneTemplate, email: c.email, phone: c.phone,
    };
  }
  console.log(`  Sociétés          · ${COMPANIES.length} comptes`);

  /* ── Contacts ──────────────────────────────────────────────────── */
  const contacts: Record<string, { id: string; companyId: string; name: string }> = {};
  for (const [i, ct] of CONTACTS.entries()) {
    const company = companies[ct.company];
    const owner = salesTeam[i % salesTeam.length];
    const data = {
      firstName: ct.firstName, lastName: ct.lastName, jobTitle: ct.jobTitle,
      phone: ct.phone, mobile: ct.phone, isPrimary: ct.isPrimary,
      companyId: company.id, ownerId: owner.id,
    };
    const existing = await prisma.contact.findFirst({ where: { email: ct.email } });
    const saved = existing
      ? await prisma.contact.update({ where: { id: existing.id }, data })
      : await prisma.contact.create({ data: { email: ct.email, ...data } });
    contacts[ct.email] = {
      id: saved.id, companyId: company.id, name: `${ct.firstName} ${ct.lastName}`,
    };
  }
  console.log(`  Contacts          · ${CONTACTS.length} interlocuteurs`);

  /* ── Compte du portail client ──────────────────────────────────── */
  const portalHash = await bcrypt.hash(CLIENT_USER.password, 10);
  await prisma.user.upsert({
    where: { email: CLIENT_USER.email },
    update: {
      name: CLIENT_USER.name, role: "CLIENT", jobTitle: CLIENT_USER.jobTitle,
      phone: CLIENT_USER.phone, passwordHash: portalHash,
      clientCompanyId: companies["NSIA Banque CI"].id, active: true,
    },
    create: {
      email: CLIENT_USER.email, name: CLIENT_USER.name, role: "CLIENT",
      jobTitle: CLIENT_USER.jobTitle, phone: CLIENT_USER.phone,
      passwordHash: portalHash, accentToken: CLIENT_USER.accentToken,
      clientCompanyId: companies["NSIA Banque CI"].id,
    },
  });
  console.log("  Portail client    · 1 accès (NSIA Banque CI)");

  /* ── Catalogue ─────────────────────────────────────────────────── */
  const products: Record<string, { id: string; name: string; unitPrice: number; unit: string; vatCode: string }> = {};
  for (const p of PRODUCTS) {
    const saved = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name, description: p.description, category: p.category,
        unitPrice: p.unitPrice, unit: p.unit, vatCode: p.vatCode as never,
        recurring: p.recurring, active: true,
      },
      create: {
        sku: p.sku, name: p.name, description: p.description, category: p.category,
        unitPrice: p.unitPrice, unit: p.unit, vatCode: p.vatCode as never,
        recurring: p.recurring,
      },
    });
    products[p.sku] = {
      id: saved.id, name: saved.name, unitPrice: saved.unitPrice,
      unit: saved.unit, vatCode: saved.vatCode,
    };
  }
  console.log(`  Catalogue         · ${PRODUCTS.length} offres`);

  /* ── Opportunités ──────────────────────────────────────────────── */
  const OPPS: Array<{
    title: string; company: string; stage: string; amount: number;
    close: number; source: string; lost?: string;
  }> = [
    { title: "Refonte de l'application mobile NSIA", company: "NSIA Banque CI", stage: "NEGOCIATION", amount: 48_500_000, close: 22, source: "Recommandation" },
    { title: "Mise en conformité FNE — chaîne de facturation", company: "Prosuma", stage: "PROPOSITION", amount: 18_600_000, close: 35, source: "Réglementaire" },
    { title: "Portail agent Orange Money", company: "Orange Côte d'Ivoire", stage: "NEGOCIATION", amount: 62_000_000, close: 14, source: "Appel d'offres" },
    { title: "Plateforme de suivi des conteneurs", company: "Port Autonome d'Abidjan", stage: "PROPOSITION", amount: 95_000_000, close: 48, source: "Appel d'offres public" },
    { title: "Audit de cybersécurité annuel", company: "Bridge Bank Group", stage: "QUALIFIE", amount: 6_200_000, close: 40, source: "Entrant web" },
    { title: "Entrepôt de données agricole", company: "SIFCA", stage: "QUALIFIE", amount: 34_000_000, close: 65, source: "Salon SITIC" },
    { title: "Modernisation du SI de maintenance", company: "Société Ivoirienne de Raffinage", stage: "NOUVEAU", amount: 41_000_000, close: 90, source: "Prospection directe" },
    { title: "Dématérialisation des prestations sociales", company: "CNPS", stage: "NOUVEAU", amount: 128_000_000, close: 120, source: "Appel d'offres public" },
    { title: "Supervision SOC 12 mois", company: "Wave Mobile Money", stage: "PROPOSITION", amount: 28_800_000, close: 27, source: "Entrant web" },
    { title: "Application de relève terrain", company: "CIE — Compagnie Ivoirienne d'Électricité", stage: "NEGOCIATION", amount: 37_400_000, close: 18, source: "Recommandation" },
    { title: "Site vitrine et espace acquéreur", company: "Carré d'Or Immobilier", stage: "QUALIFIE", amount: 5_400_000, close: 30, source: "Entrant web" },
    { title: "Traçabilité IoT des conteneurs", company: "AGL Côte d'Ivoire", stage: "NOUVEAU", amount: 52_000_000, close: 100, source: "Salon SITIC" },
    { title: "CRM immobilier Kaydan", company: "Kaydan Group", stage: "QUALIFIE", amount: 12_500_000, close: 55, source: "Recommandation" },
    { title: "TMA plateforme e-commerce", company: "Prosuma", stage: "GAGNE", amount: 21_000_000, close: -40, source: "Recommandation" },
    { title: "Connecteur FNE — licence et intégration", company: "NSIA Banque CI", stage: "GAGNE", amount: 7_350_000, close: -75, source: "Réglementaire" },
    { title: "Refonte du core banking mobile", company: "Bridge Bank Group", stage: "GAGNE", amount: 44_000_000, close: -110, source: "Appel d'offres" },
    { title: "Hébergement souverain 24 mois", company: "Wave Mobile Money", stage: "GAGNE", amount: 22_800_000, close: -60, source: "Entrant web" },
    { title: "Plateforme portuaire — tranche 1", company: "Port Autonome d'Abidjan", stage: "GAGNE", amount: 86_000_000, close: -150, source: "Appel d'offres public" },
    { title: "Migration ERP Sage X3", company: "Nestlé Côte d'Ivoire", stage: "PERDU", amount: 58_000_000, close: -30, source: "Appel d'offres", lost: "Budget arbitré au profit d'un intégrateur du groupe." },
    { title: "Refonte intranet municipal", company: "Mairie de Cocody", stage: "PERDU", amount: 9_800_000, close: -85, source: "Appel d'offres public", lost: "Marché déclaré infructueux, report sur l'exercice suivant." },
    { title: "Accompagnement AMOA schéma directeur", company: "SIFCA", stage: "GAGNE", amount: 15_800_000, close: -20, source: "Recommandation" },
    { title: "Formation DevSecOps des équipes", company: "Orange Côte d'Ivoire", stage: "GAGNE", amount: 9_000_000, close: -12, source: "Recommandation" },
  ];

  const opportunities: Record<string, { id: string; companyId: string; title: string; amount: number }> = {};
  for (const [i, o] of OPPS.entries()) {
    const company = companies[o.company];
    const reference = `MT-O-2026-${String(i + 1).padStart(4, "0")}`;
    const owner = salesTeam[i % salesTeam.length];
    const primaryContact = CONTACTS.find((c) => c.company === o.company && c.isPrimary);
    const closed = o.stage === "GAGNE" || o.stage === "PERDU";
    const data = {
      title: o.title,
      description: `Affaire ${o.stage === "GAGNE" ? "remportée" : "en cours"} auprès de ${o.company}. Source : ${o.source}.`,
      stage: o.stage as never,
      amount: o.amount,
      probability: STAGE_PROBABILITY[o.stage as keyof typeof STAGE_PROBABILITY],
      expectedCloseDate: shift(o.close),
      closedAt: closed ? shift(o.close) : null,
      lostReason: o.lost ?? null,
      source: o.source,
      companyId: company.id,
      contactId: primaryContact ? contacts[primaryContact.email].id : null,
      ownerId: owner.id,
      createdAt: shift(o.close - int(25, 70)),
    };
    const saved = await prisma.opportunity.upsert({
      where: { reference }, update: data, create: { reference, ...data },
    });
    opportunities[o.title] = {
      id: saved.id, companyId: company.id, title: o.title, amount: o.amount,
    };
  }
  console.log(`  Pipeline          · ${OPPS.length} opportunités`);

  /* ── Devis ─────────────────────────────────────────────────────── */
  const QUOTES: Array<{ title: string; opp: string; status: string; issued: number; skus: Array<[string, number]>; discount: number }> = [
    { title: "Refonte application mobile — lot 1", opp: "Refonte de l'application mobile NSIA", status: "ENVOYE", issued: -12, skus: [["DEV-MOB-J", 110], ["AMOA-J", 18], ["FORM-J", 4]], discount: 5 },
    { title: "Mise en conformité FNE", opp: "Mise en conformité FNE — chaîne de facturation", status: "ENVOYE", issued: -8, skus: [["FNE-SETUP", 1], ["FNE-CONNECT", 1], ["INT-ERP-J", 22]], discount: 0 },
    { title: "Portail agent — cadrage et réalisation", opp: "Portail agent Orange Money", status: "ENVOYE", issued: -18, skus: [["DEV-WEB-J", 140], ["AMOA-J", 25], ["SEC-AUDIT", 1]], discount: 8 },
    { title: "Plateforme conteneurs — tranche 2", opp: "Plateforme de suivi des conteneurs", status: "ENVOYE", issued: -5, skus: [["DEV-WEB-J", 180], ["LIC-PAA", 1], ["INT-ERP-J", 40]], discount: 10 },
    { title: "Supervision SOC — 12 mois", opp: "Supervision SOC 12 mois", status: "ENVOYE", issued: -15, skus: [["SEC-SOC", 12]], discount: 0 },
    { title: "Application de relève terrain", opp: "Application de relève terrain", status: "ACCEPTE", issued: -34, skus: [["DEV-MOB-J", 85], ["DATA-BI-J", 22], ["FORM-J", 6]], discount: 5 },
    { title: "TMA e-commerce — 12 mois", opp: "TMA plateforme e-commerce", status: "ACCEPTE", issued: -52, skus: [["TMA-MENS", 12]], discount: 0 },
    { title: "Connecteur FNE NSIA", opp: "Connecteur FNE — licence et intégration", status: "ACCEPTE", issued: -88, skus: [["FNE-CONNECT", 1], ["FNE-SETUP", 1]], discount: 0 },
    { title: "Hébergement souverain — 24 mois", opp: "Hébergement souverain 24 mois", status: "ACCEPTE", issued: -72, skus: [["CLOUD-MENS", 24]], discount: 0 },
    { title: "Migration Sage X3 — proposition", opp: "Migration ERP Sage X3", status: "REFUSE", issued: -46, skus: [["INT-ERP-J", 150], ["AMOA-J", 30]], discount: 5 },
    { title: "Audit de sécurité Bridge Bank", opp: "Audit de cybersécurité annuel", status: "BROUILLON", issued: -2, skus: [["SEC-AUDIT", 1]], discount: 0 },
    { title: "Intranet municipal — offre initiale", opp: "Refonte intranet municipal", status: "EXPIRE", issued: -96, skus: [["DEV-WEB-J", 30]], discount: 0 },
  ];

  let quoteIndex = 0;
  const quotes: Record<string, { id: string; number: string }> = {};
  for (const q of QUOTES) {
    quoteIndex += 1;
    const number = sequenceNumber("D", quoteIndex, 2026);
    const opp = opportunities[q.opp];
    const oppRow = OPPS.find((o) => o.title === q.opp)!;
    const company = companies[oppRow.company];
    const primaryContact = CONTACTS.find((c) => c.company === oppRow.company && c.isPrimary);
    const issueDate = shift(q.issued);
    const data = {
      title: q.title,
      status: q.status as never,
      issueDate,
      validUntil: shift(q.issued + QUOTE_VALIDITY_DAYS),
      discount: q.discount,
      notes: "Prestations réalisées depuis les locaux de Markel Technology, Abidjan-Plateau.",
      terms: `Validité ${QUOTE_VALIDITY_DAYS} jours. Règlement à ${PAYMENT_TERMS_DAYS} jours date de facture. TVA 18 % sauf mention contraire.`,
      sentAt: q.status === "BROUILLON" ? null : issueDate,
      decidedAt: ["ACCEPTE", "REFUSE"].includes(q.status) ? shift(q.issued + int(6, 20)) : null,
      refusalReason: q.status === "REFUSE" ? oppRow.lost ?? null : null,
      companyId: company.id,
      contactId: primaryContact ? contacts[primaryContact.email].id : null,
      opportunityId: opp.id,
      ownerId: salesTeam[quoteIndex % salesTeam.length].id,
      createdAt: issueDate,
    };
    const saved = await prisma.quote.upsert({
      where: { number }, update: data, create: { number, ...data },
    });
    await prisma.quoteLine.deleteMany({ where: { quoteId: saved.id } });
    await prisma.quoteLine.createMany({
      data: q.skus.map(([sku, qty], pos) => {
        const p = products[sku];
        return {
          quoteId: saved.id, productId: p.id, position: pos, reference: sku,
          description: p.name, quantity: qty, unitPrice: p.unitPrice,
          discount: 0, unit: p.unit, vatCode: p.vatCode as never,
        };
      }),
    });
    quotes[q.title] = { id: saved.id, number };
  }
  console.log(`  Devis             · ${QUOTES.length} propositions`);

  /* ── Projets ───────────────────────────────────────────────────── */
  const PROJECTS: Array<{
    code: string; name: string; company: string; opp?: string; status: string;
    start: number; end: number; budget: number; progress: number; manager: { id: string; name: string };
  }> = [
    { code: "MT-P-001", name: "Plateforme portuaire — tranche 1", company: "Port Autonome d'Abidjan", opp: "Plateforme portuaire — tranche 1", status: "EN_COURS", start: -150, end: 60, budget: 86_000_000, progress: 62, manager: cto },
    { code: "MT-P-002", name: "Core banking mobile Bridge Bank", company: "Bridge Bank Group", opp: "Refonte du core banking mobile", status: "EN_COURS", start: -110, end: 35, budget: 44_000_000, progress: 71, manager: manager },
    { code: "MT-P-003", name: "Connecteur FNE NSIA Banque", company: "NSIA Banque CI", opp: "Connecteur FNE — licence et intégration", status: "LIVRE", start: -88, end: -18, budget: 7_350_000, progress: 100, manager: cto },
    { code: "MT-P-004", name: "TMA e-commerce Prosuma", company: "Prosuma", opp: "TMA plateforme e-commerce", status: "EN_COURS", start: -52, end: 313, budget: 21_000_000, progress: 34, manager: manager },
    { code: "MT-P-005", name: "Hébergement souverain Wave", company: "Wave Mobile Money", opp: "Hébergement souverain 24 mois", status: "EN_COURS", start: -60, end: 670, budget: 22_800_000, progress: 12, manager: cto },
    { code: "MT-P-006", name: "Application de relève CIE", company: "CIE — Compagnie Ivoirienne d'Électricité", opp: "Application de relève terrain", status: "CADRAGE", start: -10, end: 140, budget: 37_400_000, progress: 6, manager: manager },
    { code: "MT-P-007", name: "AMOA schéma directeur SIFCA", company: "SIFCA", opp: "Accompagnement AMOA schéma directeur", status: "EN_COURS", start: -20, end: 70, budget: 15_800_000, progress: 45, manager: cto },
    { code: "MT-P-008", name: "Formation DevSecOps Orange", company: "Orange Côte d'Ivoire", opp: "Formation DevSecOps des équipes", status: "LIVRE", start: -12, end: -2, budget: 9_000_000, progress: 100, manager: manager },
    { code: "MT-P-009", name: "Portail acquéreur Carré d'Or", company: "Carré d'Or Immobilier", status: "EN_PAUSE", start: -70, end: 20, budget: 5_400_000, progress: 40, manager: manager },
  ];

  const projects: Record<string, { id: string; budget: number; name: string; companyId: string }> = {};
  for (const p of PROJECTS) {
    const company = companies[p.company];
    const data = {
      name: p.name,
      description: `Projet ${p.name} conduit pour ${p.company}.`,
      status: p.status as never,
      health: projectHealth(p.progress, p.progress / 100 + (chance(0.4) ? 0.18 : -0.05)) as never,
      startDate: shift(p.start), endDate: shift(p.end),
      budget: p.budget, progress: p.progress,
      companyId: company.id,
      opportunityId: p.opp ? opportunities[p.opp]?.id ?? null : null,
      managerId: p.manager.id,
      createdAt: shift(p.start),
    };
    const saved = await prisma.project.upsert({
      where: { code: p.code }, update: data, create: { code: p.code, ...data },
    });
    projects[p.code] = { id: saved.id, budget: p.budget, name: p.name, companyId: company.id };

    const team = [cto, manager, sales, support].slice(0, int(2, 4));
    await prisma.projectMember.deleteMany({ where: { projectId: saved.id } });
    await prisma.projectMember.createMany({
      data: team.map((m, i) => ({
        projectId: saved.id, userId: m.id,
        roleLabel: ["Chef de projet", "Lead développeur", "Consultant", "Ingénieur support"][i] ?? "Consultant",
        dailyRate: [340_000, 285_000, 395_000, 240_000][i] ?? 285_000,
      })),
    });
  }
  console.log(`  Projets           · ${PROJECTS.length} engagements`);

  /* ── Tâches et temps passés ────────────────────────────────────── */
  const TASK_TITLES = [
    "Cadrage fonctionnel et ateliers", "Modélisation du schéma de données",
    "Développement des écrans de saisie", "Interfaçage API partenaire",
    "Recette utilisateur", "Reprise de données", "Mise en production",
    "Documentation d'exploitation", "Revue de sécurité", "Optimisation des performances",
    "Formation des équipes métier", "Support à la bascule",
  ];

  const staff = [cto, manager, sales, support, sales2, admin];
  let taskCount = 0;
  let timeCount = 0;
  for (const p of PROJECTS) {
    const project = projects[p.code];
    await prisma.timeEntry.deleteMany({ where: { projectId: project.id } });
    await prisma.task.deleteMany({ where: { projectId: project.id } });

    const nbTasks = int(5, 9);
    for (let i = 0; i < nbTasks; i++) {
      const done = i < Math.round((nbTasks * p.progress) / 100);
      const assignee = pick(staff);
      const task = await prisma.task.create({
        data: {
          title: TASK_TITLES[(i + taskCount) % TASK_TITLES.length],
          description: null,
          status: (done ? "TERMINE" : i === Math.round((nbTasks * p.progress) / 100) ? "EN_COURS" : chance(0.25) ? "EN_REVUE" : "A_FAIRE") as never,
          priority: int(1, 3),
          dueDate: shift(p.start + Math.round(((p.end - p.start) * (i + 1)) / nbTasks)),
          estimate: int(3, 20),
          projectId: project.id,
          assigneeId: assignee.id,
          createdAt: shift(p.start + i),
        },
      });
      taskCount += 1;

      const entries = int(2, 5);
      for (let j = 0; j < entries; j++) {
        await prisma.timeEntry.create({
          data: {
            userId: assignee.id, projectId: project.id, taskId: task.id,
            date: shift(p.start + int(1, Math.max(2, Math.min(-p.start, 160)))),
            hours: [3, 4, 6, 7, 8][int(0, 4)],
            billable: chance(0.85),
            description: null,
          },
        });
        timeCount += 1;
      }
    }
  }
  console.log(`  Delivery          · ${taskCount} tâches, ${timeCount} imputations`);

  await seedInvoices();
  await seedTickets();
  await seedActivities();
  await seedContent();

  /* ── Journal et notifications ──────────────────────────────────── */
  await prisma.auditLog.deleteMany({});
  const AUDIT: Array<[string, string, string, string, number]> = [
    ["CERTIFY", "Invoice", "Certification FNE de la facture MT-F-2026-0003 auprès de la DGI", admin.name, -2],
    ["UPDATE", "Opportunity", "Passage de « Portail agent Orange Money » en négociation", sales.name, -3],
    ["CREATE", "Quote", "Création du devis MT-D-2026-0004 pour le Port Autonome d'Abidjan", manager.name, -5],
    ["LOGIN", "User", "Connexion au back-office", support.name, -1],
    ["UPDATE", "Settings", "Modification du solde de stickers FNE", admin.name, -7],
    ["CREATE", "Ticket", "Ouverture du ticket MT-T-2026-0011 en priorité P1", support.name, -1],
    ["DELETE", "Contact", "Suppression d'un contact en doublon chez Prosuma", manager.name, -9],
    ["CERTIFY", "CreditNote", "Émission d'un avoir sur la facture MT-F-2026-0006", admin.name, -4],
    ["UPDATE", "Project", "Passage du projet MT-P-009 en pause à la demande du client", manager.name, -11],
    ["CREATE", "Invoice", "Création de la facture MT-F-2026-0012", manager.name, -1],
  ];
  for (const [action, entity, summary, userLabel, when] of AUDIT) {
    await prisma.auditLog.create({
      data: {
        action, entity, summary, userLabel,
        userId: Object.values(users).find((u) => u.name === userLabel)?.id ?? null,
        createdAt: shift(when),
      },
    });
  }

  await prisma.notification.deleteMany({});
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, title: "Stock de stickers FNE", body: `Il reste ${ORG.fneStickerBalance} stickers électroniques sur votre espace DGI.`, href: "/conformite-fne", tone: "warning" },
      { userId: admin.id, title: "Facture en retard", body: "La facture MT-F-2026-0005 a dépassé son échéance de 12 jours.", href: "/factures", tone: "danger" },
      { userId: manager.id, title: "Devis accepté", body: "NSIA Banque CI a accepté le devis MT-D-2026-0008.", href: "/devis", tone: "success" },
      { userId: sales.id, title: "Relance à faire", body: "Le devis MT-D-2026-0003 d'Orange CI expire dans 8 jours.", href: "/devis", tone: "warning" },
      { userId: support.id, title: "SLA P1 en cours", body: "Le ticket MT-T-2026-0011 doit être traité sous 4 heures.", href: "/tickets", tone: "danger" },
    ],
  });

  /* ── Paramètres ────────────────────────────────────────────────── */
  const SETTINGS: Array<[string, string, string, string]> = [
    ["fne.mode", process.env.FNE_MODE ?? "mock", "Mode d'interfaçage FNE", "Conformité FNE"],
    ["fne.base_url", "http://54.247.95.108/ws", "URL de la plateforme FNE", "Conformité FNE"],
    ["fne.point_of_sale", ORG.defaultPointOfSale, "Point de vente par défaut", "Conformité FNE"],
    ["fne.establishment", ORG.defaultEstablishment, "Établissement par défaut", "Conformité FNE"],
    ["commercial.max_discount_sales", "15", "Remise maximale — Commercial (%)", "Commercial"],
    ["commercial.max_discount_manager", "30", "Remise maximale — Gestionnaire (%)", "Commercial"],
    ["commercial.quote_validity", String(QUOTE_VALIDITY_DAYS), "Validité d'un devis (jours)", "Commercial"],
    ["finance.payment_terms", String(PAYMENT_TERMS_DAYS), "Délai de règlement (jours)", "Finance"],
    ["finance.late_penalty", "1.5", "Pénalité de retard mensuelle (%)", "Finance"],
    ["support.sla_p1", String(SLA_HOURS.P1), "SLA P1 (heures)", "Support"],
    ["support.sla_p2", String(SLA_HOURS.P2), "SLA P2 (heures)", "Support"],
    ["support.sla_p3", String(SLA_HOURS.P3), "SLA P3 (heures)", "Support"],
    ["support.sla_p4", String(SLA_HOURS.P4), "SLA P4 (heures)", "Support"],
  ];
  for (const [key, value, label, group] of SETTINGS) {
    await prisma.setting.upsert({
      where: { key }, update: { value, label, group }, create: { key, value, label, group },
    });
  }

  console.log("\n✔ Seed terminé.\n");
}

/* ════════════════════ Factures et certification FNE ════════════════ */

async function seedInvoices() {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: "org" } });
  const allProducts = await prisma.product.findMany();
  const bySku = Object.fromEntries(allProducts.map((p) => [p.sku, p]));
  const allCompanies = await prisma.company.findMany({ include: { contacts: true } });
  const byName = Object.fromEntries(allCompanies.map((c) => [c.name, c]));
  const staffUsers = await prisma.user.findMany({ where: { role: { in: ["MANAGER", "SUPER_ADMIN"] } } });
  const owner = staffUsers[0];

  type InvSpec = {
    title: string; company: string; issued: number; skus: Array<[string, number]>;
    discount: number; paid: "full" | "partial" | "none"; certify: boolean;
    method: string; project?: string; footerTax?: [string, number];
  };

  const INVOICES: InvSpec[] = [
    { title: "Connecteur FNE — licence annuelle et intégration", company: "NSIA Banque CI", issued: -84, skus: [["FNE-CONNECT", 1], ["FNE-SETUP", 1]], discount: 0, paid: "full", certify: true, method: "TRANSFER", project: "MT-P-003" },
    { title: "Plateforme portuaire — jalon de cadrage", company: "Port Autonome d'Abidjan", issued: -140, skus: [["LIC-PAA", 1], ["AMOA-J", 20]], discount: 0, paid: "full", certify: true, method: "TRANSFER", project: "MT-P-001" },
    { title: "Core banking mobile — jalon 1", company: "Bridge Bank Group", issued: -96, skus: [["DEV-MOB-J", 60], ["AMOA-J", 10]], discount: 5, paid: "full", certify: true, method: "TRANSFER", project: "MT-P-002" },
    { title: "TMA e-commerce — trimestre 1", company: "Prosuma", issued: -48, skus: [["TMA-MENS", 3]], discount: 0, paid: "full", certify: true, method: "TRANSFER", project: "MT-P-004" },
    { title: "Hébergement souverain — trimestre 1", company: "Wave Mobile Money", issued: -55, skus: [["CLOUD-MENS", 3]], discount: 0, paid: "partial", certify: true, method: "MOBILE_MONEY", project: "MT-P-005" },
    { title: "Formation DevSecOps — session Abidjan", company: "Orange Côte d'Ivoire", issued: -40, skus: [["FORM-J", 10], ["AMOA-J", 3]], discount: 0, paid: "full", certify: true, method: "TRANSFER", project: "MT-P-008" },
    { title: "AMOA schéma directeur — jalon 1", company: "SIFCA", issued: -18, skus: [["AMOA-J", 22]], discount: 0, paid: "none", certify: true, method: "TRANSFER", project: "MT-P-007" },
    { title: "Plateforme portuaire — jalon 2", company: "Port Autonome d'Abidjan", issued: -60, skus: [["DEV-WEB-J", 80], ["INT-ERP-J", 18]], discount: 10, paid: "partial", certify: true, method: "TRANSFER", project: "MT-P-001" },
    { title: "Core banking mobile — jalon 2", company: "Bridge Bank Group", issued: -34, skus: [["DEV-MOB-J", 45], ["SEC-AUDIT", 1]], discount: 5, paid: "none", certify: true, method: "TRANSFER", project: "MT-P-002" },
    { title: "TMA e-commerce — trimestre 2", company: "Prosuma", issued: -14, skus: [["TMA-MENS", 3]], discount: 0, paid: "none", certify: true, method: "TRANSFER", project: "MT-P-004" },
    { title: "Accompagnement conformité FNE — acompte", company: "Prosuma", issued: -9, skus: [["FNE-SETUP", 1]], discount: 0, paid: "none", certify: true, method: "TRANSFER", footerTax: ["DTD", 5] },
    { title: "Prestations d'ingénierie — septembre", company: "CIE — Compagnie Ivoirienne d'Électricité", issued: -3, skus: [["DEV-MOB-J", 12], ["DATA-BI-J", 6]], discount: 0, paid: "none", certify: true, method: "TRANSFER", project: "MT-P-006" },
    { title: "Conseil digital — mission Paris", company: "Sahel Digital Partners", issued: -22, skus: [["AMOA-J", 12]], discount: 0, paid: "full", certify: true, method: "TRANSFER" },
    { title: "Portail acquéreur — solde", company: "Carré d'Or Immobilier", issued: -66, skus: [["DEV-WEB-J", 14]], discount: 0, paid: "none", certify: true, method: "MOBILE_MONEY", project: "MT-P-009" },
    { title: "Supervision SOC — mise en service", company: "Wave Mobile Money", issued: -1, skus: [["SEC-SOC", 1]], discount: 0, paid: "none", certify: false, method: "TRANSFER" },
    { title: "Prestations complémentaires — brouillon", company: "NSIA Banque CI", issued: 0, skus: [["DEV-WEB-J", 8]], discount: 0, paid: "none", certify: false, method: "TRANSFER" },
  ];

  let index = 0;
  let certified = 0;
  for (const spec of INVOICES) {
    index += 1;
    const number = sequenceNumber("F", index, 2026);
    const company = byName[spec.company];
    const contact = company.contacts.find((c) => c.isPrimary) ?? company.contacts[0];
    const issueDate = shift(spec.issued);
    const project = spec.project
      ? await prisma.project.findUnique({ where: { code: spec.project } })
      : null;

    const lines = spec.skus.map(([sku, qty], pos) => {
      const p = bySku[sku];
      return {
        position: pos, productId: p.id, reference: sku, description: p.name,
        quantity: qty, unitPrice: p.unitPrice, discount: 0, unit: p.unit,
        vatCode: p.vatCode,
      };
    });

    const totals = computeInvoice(
      lines.map((l) => ({ ...l, customTaxes: [] })),
      spec.discount,
      spec.footerTax ? [{ name: spec.footerTax[0], rate: spec.footerTax[1] }] : [],
    );

    const paid =
      spec.paid === "full" ? totals.total
      : spec.paid === "partial" ? Math.round(totals.total * 0.4)
      : 0;

    const dueDate = shift(spec.issued + PAYMENT_TERMS_DAYS);
    const isDraft = !spec.certify && index === INVOICES.length;
    const status: string =
      isDraft ? "BROUILLON"
      : paid >= totals.total ? "PAYEE"
      : dueDate.getTime() < NOW.getTime() ? "EN_RETARD"
      : paid > 0 ? "PARTIELLE"
      : "EMISE";

    const data = {
      title: spec.title,
      status: status as never,
      issueDate,
      dueDate,
      discount: spec.discount,
      notes: null,
      paidAmount: paid,
      companyId: company.id,
      projectId: project?.id ?? null,
      ownerId: owner.id,
      fneInvoiceType: "SALE" as never,
      fneTemplate: company.fneTemplate,
      paymentMethod: spec.method as never,
      isRne: false,
      pointOfSale: org.defaultPointOfSale,
      establishment: org.defaultEstablishment,
      commercialMessage: org.commercialMessage,
      footer: org.invoiceFooter,
      foreignCurrency: company.fneTemplate === "B2F" ? "EUR" : null,
      foreignCurrencyRate: company.fneTemplate === "B2F" ? 655.957 : 0,
      clientNcc: company.ncc,
      clientCompanyName: company.legalName ?? company.name,
      clientPhone: company.phone ?? "+225 00 00 00 00 00",
      clientEmail: company.email ?? "contact@example.ci",
      clientSellerName: owner.name,
      createdAt: issueDate,
    };

    const invoice = await prisma.invoice.upsert({
      where: { number },
      update: { ...data, fneStatus: "NON_SOUMISE", fneReference: null, fneToken: null, fneVerificationUrl: null, fneRemoteId: null, fneCertifiedAt: null, fneError: null },
      create: { number, ...data },
    });

    await prisma.invoiceCustomTax.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
    for (const l of lines) {
      await prisma.invoiceLine.create({ data: { invoiceId: invoice.id, ...l } as Prisma.InvoiceLineUncheckedCreateInput });
    }
    if (spec.footerTax) {
      await prisma.invoiceCustomTax.create({
        data: { invoiceId: invoice.id, name: spec.footerTax[0], rate: spec.footerTax[1] },
      });
    }

    await prisma.payment.deleteMany({ where: { invoiceId: invoice.id } });
    if (paid > 0) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id, amount: paid, method: spec.method as never,
          reference: `VIR-${2026}-${String(index).padStart(4, "0")}`,
          paidAt: shift(spec.issued + int(8, 26)),
          note: spec.paid === "partial" ? "Acompte de 40 % à la commande." : null,
        },
      });
    }

    /* Certification réelle via le client FNE (mode simulateur). */
    if (spec.certify) {
      certified += 1;
      const full = await prisma.invoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: { lines: { include: { customTaxes: true } }, customTaxes: true },
      });

      const payload = {
        invoiceType: "sale" as const,
        paymentMethod: PAYMENT_METHOD_API[full.paymentMethod],
        template: full.fneTemplate as "B2B" | "B2C" | "B2G" | "B2F",
        isRne: false,
        ...(full.fneTemplate === "B2B" && full.clientNcc ? { clientNcc: full.clientNcc } : {}),
        clientCompanyName: full.clientCompanyName,
        clientPhone: full.clientPhone,
        clientEmail: full.clientEmail,
        clientSellerName: full.clientSellerName ?? undefined,
        pointOfSale: full.pointOfSale,
        establishment: full.establishment,
        commercialMessage: full.commercialMessage ?? undefined,
        footer: full.footer ?? undefined,
        foreignCurrency: full.foreignCurrency ?? "",
        foreignCurrencyRate: full.foreignCurrencyRate,
        items: full.lines.sort((a, b) => a.position - b.position).map((l) => ({
          reference: l.reference ?? undefined, description: l.description,
          quantity: l.quantity, amount: l.unitPrice,
          discount: l.discount || undefined, measurementUnit: l.unit,
          taxes: [l.vatCode],
        })),
        customTaxes: full.customTaxes.filter((t) => !t.lineId).map((t) => ({ name: t.name, amount: t.rate })),
        discount: full.discount || undefined,
      };

      const balance = (await prisma.organization.findUniqueOrThrow({ where: { id: "org" } })).fneStickerBalance;
      const result = await signInvoice(payload, {
        ncc: org.ncc, sequence: certified, stickerBalance: balance,
      });

      await prisma.fneLog.create({
        data: {
          endpoint: "/external/invoices/sign", method: "POST", mode: result.mode,
          statusCode: result.status, success: result.ok, durationMs: result.durationMs,
          requestBody: payload as never,
          responseBody: (result.ok ? result.data : result.error) as never,
          errorCode: result.ok ? null : result.error.error,
          errorMessage: result.ok ? null : result.error.message,
          invoiceId: invoice.id, userId: owner.id,
          createdAt: shift(spec.issued, NOW),
        },
      });

      if (result.ok) {
        const token = result.data.invoice?.token ?? "";
        const returned = result.data.invoice?.items ?? [];
        const ordered = full.lines.sort((a, b) => a.position - b.position);
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            fneStatus: "CERTIFIEE",
            fneReference: result.data.reference,
            fneToken: token,
            fneVerificationUrl: result.data.token,
            fneRemoteId: result.data.invoice?.id ?? null,
            fneCertifiedAt: shift(spec.issued),
            fneStickerBalance: result.data.balance_sticker,
            fneWarning: result.data.warning,
          },
        });
        for (const [i, line] of ordered.entries()) {
          await prisma.invoiceLine.update({
            where: { id: line.id }, data: { fneItemId: returned[i]?.id ?? null },
          });
        }
        await prisma.organization.update({
          where: { id: "org" }, data: { fneStickerBalance: result.data.balance_sticker },
        });
      }
    }
  }

  /* Un avoir certifié, pour que le parcours complet soit visible. */
  const target = await prisma.invoice.findUnique({
    where: { number: sequenceNumber("F", 6, 2026) },
    include: { lines: true },
  });
  if (target && target.fneRemoteId) {
    const noteNumber = sequenceNumber("A", 1, 2026);
    const existing = await prisma.creditNote.findUnique({ where: { number: noteNumber } });
    if (existing) await prisma.creditNote.delete({ where: { id: existing.id } });

    const line = target.lines[0];
    const note = await prisma.creditNote.create({
      data: {
        number: noteNumber, invoiceId: target.id,
        reason: "Deux participants absents à la session de formation — remboursement au prorata.",
        issuedAt: shift(-36), createdById: owner.id,
        lines: { create: [{ invoiceLineId: line.id, quantity: 2 }] },
      },
    });
    const org2 = await prisma.organization.findUniqueOrThrow({ where: { id: "org" } });
    const { refundInvoice } = await import("../src/lib/fne/client");
    const res = await refundInvoice(
      target.fneRemoteId,
      { items: [{ id: line.fneItemId ?? "unknown", quantity: 2 }] },
      { ncc: org2.ncc, sequence: 1, stickerBalance: org2.fneStickerBalance },
    );
    await prisma.fneLog.create({
      data: {
        endpoint: `/external/invoices/${target.fneRemoteId}/refund`, method: "POST",
        mode: res.mode, statusCode: res.status, success: res.ok, durationMs: res.durationMs,
        requestBody: { items: [{ id: line.fneItemId, quantity: 2 }] } as never,
        responseBody: (res.ok ? res.data : res.error) as never,
        errorCode: res.ok ? null : res.error.error,
        errorMessage: res.ok ? null : res.error.message,
        invoiceId: target.id, userId: owner.id, createdAt: shift(-36),
      },
    });
    if (res.ok) {
      await prisma.creditNote.update({
        where: { id: note.id },
        data: {
          fneReference: res.data.reference, fneToken: res.data.token.split("/").pop(),
          fneVerificationUrl: res.data.token, fneStickerBalance: res.data.balance_sticker,
          certifiedAt: shift(-36),
        },
      });
      await prisma.invoice.update({ where: { id: target.id }, data: { fneStatus: "AVOIR_EMIS" } });
      await prisma.organization.update({
        where: { id: "org" }, data: { fneStickerBalance: res.data.balance_sticker },
      });
    }
  }

  /* Une tentative rejetée, pour que le journal montre aussi un échec. */
  const rejected = await prisma.invoice.findFirst({ where: { fneStatus: "NON_SOUMISE" } });
  if (rejected) {
    await prisma.fneLog.create({
      data: {
        endpoint: "/external/invoices/sign", method: "POST", mode: "mock",
        statusCode: 400, success: false, durationMs: 96,
        requestBody: { template: "B2B", clientNcc: "", clientCompanyName: rejected.clientCompanyName } as never,
        responseBody: { message: "Client NCC is required for B2B template", error: "bad_request", statusCode: 400 } as never,
        errorCode: "bad_request",
        errorMessage: "Client NCC is required for B2B template",
        invoiceId: rejected.id, createdAt: shift(-6),
      },
    });
  }

  console.log(`  Factures          · ${INVOICES.length} dont ${certified} certifiées FNE, 1 avoir`);
}

/* ══════════════════════════════ Support ════════════════════════════ */

async function seedTickets() {
  const companies = await prisma.company.findMany({
    where: { status: { in: ["CLIENT", "PARTENAIRE"] } },
    include: { contacts: true },
  });
  const agents = await prisma.user.findMany({ where: { role: { in: ["SUPPORT", "MANAGER"] } } });

  const TICKETS: Array<{ subject: string; company: string; priority: string; status: string; opened: number; category: string; body: string }> = [
    { subject: "Échec de certification FNE sur les factures du jour", company: "Prosuma", priority: "P1", status: "EN_COURS", opened: -0.2, category: "Conformité FNE", body: "Depuis ce matin 8 h, la plateforme renvoie une erreur 401 sur toutes nos certifications. Aucune facture ne peut être remise aux clients en caisse." },
    { subject: "Lenteur de l'application mobile après la mise à jour", company: "NSIA Banque CI", priority: "P2", status: "EN_COURS", opened: -1.4, category: "Performance", body: "Les temps de réponse de l'écran de consultation de solde sont passés de 400 ms à plus de 4 s depuis la version 3.2.1." },
    { subject: "Demande d'ajout d'un point de vente", company: "Prosuma", priority: "P3", status: "EN_ATTENTE_CLIENT", opened: -3, category: "Demande d'évolution", body: "Nous ouvrons un nouveau magasin à Yopougon et souhaitons le déclarer comme point de vente FNE distinct." },
    { subject: "Certificat SSL expirant dans 12 jours", company: "Wave Mobile Money", priority: "P2", status: "NOUVEAU", opened: -0.6, category: "Infrastructure", body: "Alerte automatique de supervision : le certificat de l'API de production expire le 21 septembre." },
    { subject: "Erreur d'affichage des montants en euros", company: "Sahel Digital Partners", priority: "P3", status: "RESOLU", opened: -9, category: "Anomalie", body: "Les factures B2F affichent le taux de change avec trois décimales au lieu de deux." },
    { subject: "Accès refusé au tableau de bord décisionnel", company: "SIFCA", priority: "P3", status: "RESOLU", opened: -14, category: "Habilitation", body: "Trois utilisateurs du service financier ne voient plus le module Data." },
    { subject: "Sauvegarde nocturne incomplète", company: "Port Autonome d'Abidjan", priority: "P1", status: "RESOLU", opened: -21, category: "Infrastructure", body: "La sauvegarde du 19 août s'est arrêtée à 62 %. Volume disque saturé sur le nœud de stockage secondaire." },
    { subject: "Demande de formation complémentaire", company: "Orange Côte d'Ivoire", priority: "P4", status: "CLOS", opened: -30, category: "Formation", body: "Six nouveaux arrivants dans l'équipe plateforme souhaitent suivre le module DevSecOps." },
    { subject: "Anomalie de calcul de la TVA réduite", company: "CIE — Compagnie Ivoirienne d'Électricité", priority: "P2", status: "RESOLU", opened: -26, category: "Anomalie", body: "Les lignes en TVAB sont calculées à 18 % au lieu de 9 % sur l'export comptable." },
    { subject: "Interruption du service d'hébergement", company: "Wave Mobile Money", priority: "P1", status: "CLOS", opened: -44, category: "Incident majeur", body: "Coupure de 22 minutes sur la zone de disponibilité principale, bascule automatique effectuée." },
    { subject: "Réinitialisation des accès administrateurs", company: "Bridge Bank Group", priority: "P3", status: "CLOS", opened: -38, category: "Habilitation", body: "Suite au départ d'un administrateur, révocation et réémission des jetons d'accès." },
    { subject: "Export comptable illisible sous Sage", company: "Prosuma", priority: "P3", status: "NOUVEAU", opened: -2.1, category: "Intégration", body: "Le fichier CSV généré utilise un séparateur point-virgule non reconnu par notre import Sage." },
    { subject: "Question sur le solde de stickers électroniques", company: "NSIA Banque CI", priority: "P4", status: "EN_ATTENTE_CLIENT", opened: -5, category: "Conformité FNE", body: "Comment recharger le stock de stickers depuis l'espace DGI ? Notre solde approche du seuil d'alerte." },
    { subject: "Double imputation sur le rapport de temps", company: "Port Autonome d'Abidjan", priority: "P3", status: "EN_COURS", opened: -1.1, category: "Anomalie", body: "Deux imputations identiques apparaissent sur la semaine 36 pour un même consultant." },
    { subject: "Demande d'ouverture d'un environnement de test", company: "CIE — Compagnie Ivoirienne d'Électricité", priority: "P4", status: "NOUVEAU", opened: -0.9, category: "Demande d'évolution", body: "Nous souhaitons un environnement de recette isolé avant la mise en production de novembre." },
  ];

  let n = 0;
  for (const t of TICKETS) {
    n += 1;
    const number = `MT-T-2026-${String(n).padStart(4, "0")}`;
    const company = companies.find((c) => c.name === t.company);
    if (!company) continue;
    const contact = company.contacts.find((c) => c.isPrimary) ?? company.contacts[0];
    const agent = agents[n % agents.length];
    const createdAt = shift(t.opened);
    const resolved = ["RESOLU", "CLOS"].includes(t.status);

    const data = {
      subject: t.subject, description: t.body, status: t.status as never,
      priority: t.priority as never, category: t.category,
      slaDueAt: new Date(createdAt.getTime() + SLA_HOURS[t.priority as keyof typeof SLA_HOURS] * 3_600_000),
      resolvedAt: resolved ? shift(t.opened + int(1, 4)) : null,
      companyId: company.id, contactId: contact?.id ?? null,
      assigneeId: t.status === "NOUVEAU" ? null : agent.id,
      createdAt,
    };
    const ticket = await prisma.ticket.upsert({
      where: { number }, update: data, create: { number, ...data },
    });

    await prisma.ticketMessage.deleteMany({ where: { ticketId: ticket.id } });
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id, authorName: contact ? `${contact.firstName} ${contact.lastName}` : "Client",
        body: t.body, internal: false, createdAt,
      },
    });
    if (t.status !== "NOUVEAU") {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id, authorId: agent.id, authorName: agent.name,
          body: "Bonjour, nous prenons en charge votre demande. Un diagnostic est en cours, nous revenons vers vous dans les meilleurs délais.",
          internal: false, createdAt: shift(t.opened + 0.1),
        },
      });
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id, authorId: agent.id, authorName: agent.name,
          body: "Note interne : reproduit sur l'environnement de recette, correctif identifié côté service de facturation.",
          internal: true, createdAt: shift(t.opened + 0.2),
        },
      });
    }
    if (resolved) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id, authorId: agent.id, authorName: agent.name,
          body: "Le correctif est déployé en production et vérifié. Nous clôturons ce ticket, n'hésitez pas à le rouvrir si le comportement persiste.",
          internal: false, createdAt: shift(t.opened + int(1, 4)),
        },
      });
    }
  }
  console.log(`  Support           · ${TICKETS.length} tickets`);
}

/* ═════════════════════════════ Activités ═══════════════════════════ */

async function seedActivities() {
  await prisma.activity.deleteMany({});
  const companies = await prisma.company.findMany();
  const contacts = await prisma.contact.findMany();
  const opportunities = await prisma.opportunity.findMany({ where: { stage: { notIn: ["GAGNE", "PERDU"] } } });
  const owners = await prisma.user.findMany({ where: { role: { in: ["SALES", "MANAGER", "SUPER_ADMIN"] } } });

  const SUBJECTS: Record<string, string[]> = {
    APPEL: ["Point d'avancement hebdomadaire", "Relance sur la proposition commerciale", "Qualification du besoin", "Appel de courtoisie trimestriel"],
    EMAIL: ["Envoi de la proposition détaillée", "Transmission des références clients", "Relance après atelier", "Envoi du compte rendu"],
    REUNION: ["Atelier de cadrage fonctionnel", "Comité de pilotage mensuel", "Soutenance de l'offre", "Restitution de l'audit"],
    NOTE: ["Compte rendu d'échange", "Point de vigilance budgétaire", "Retour du comité d'investissement"],
    TACHE: ["Préparer le chiffrage détaillé", "Constituer le dossier d'appel d'offres", "Relancer le service achats", "Planifier la démonstration"],
  };

  let count = 0;
  for (let i = 0; i < 46; i++) {
    const type = pick(["APPEL", "EMAIL", "REUNION", "NOTE", "TACHE"]);
    const opp = opportunities.length ? pick(opportunities) : null;
    const company = opp ? companies.find((c) => c.id === opp.companyId)! : pick(companies);
    const contact = contacts.filter((c) => c.companyId === company.id)[0] ?? null;
    const offset = int(-45, 21);
    const past = offset < 0;
    await prisma.activity.create({
      data: {
        type: type as never,
        subject: pick(SUBJECTS[type]),
        description: null,
        status: (past ? (chance(0.85) ? "TERMINEE" : "ANNULEE") : "PLANIFIEE") as never,
        dueAt: shift(offset + rnd()),
        doneAt: past && chance(0.85) ? shift(offset) : null,
        ownerId: pick(owners).id,
        companyId: company.id,
        contactId: contact?.id ?? null,
        opportunityId: opp && chance(0.7) ? opp.id : null,
        createdAt: shift(offset - int(1, 5)),
      },
    });
    count += 1;
  }
  console.log(`  Activités         · ${count} interactions`);
}

/* ═══════════════════════ Contenus de la vitrine ════════════════════ */

async function seedContent() {
  const PAGES = [
    {
      slug: "expertise-ingenierie", section: "expertise", position: 1,
      title: "Ingénierie logicielle",
      subtitle: "Des applications taillées pour vos métiers",
      body: "Nos équipes conçoivent et développent des applications web et mobiles sur mesure, de l'atelier de cadrage à l'exploitation. Next.js, Java, .NET, React Native : nous choisissons la technologie qui sert votre besoin, pas l'inverse.",
    },
    {
      slug: "expertise-conformite", section: "expertise", position: 2,
      title: "Conformité FNE",
      subtitle: "Votre facturation en règle avec la DGI",
      body: "Depuis la loi de finances 2025, la facture normalisée électronique est obligatoire. Nous interfaçons votre système de facturation à la plateforme FNE par API : certification des factures de vente, des avoirs et des bordereaux d'achat, gestion du sticker électronique et du QR code de vérification.",
    },
    {
      slug: "expertise-infogerance", section: "expertise", position: 3,
      title: "Infogérance & cloud",
      subtitle: "Vos plateformes supervisées 24 h sur 24",
      body: "Hébergement souverain, supervision permanente, sauvegardes chiffrées et tierce maintenance applicative avec un engagement de prise en charge sous quatre heures sur les incidents critiques.",
    },
    {
      slug: "expertise-cybersecurite", section: "expertise", position: 4,
      title: "Cybersécurité",
      subtitle: "Anticiper plutôt que subir",
      body: "Tests d'intrusion, revue de configuration, plan de remédiation priorisé et supervision continue par notre centre opérationnel de sécurité.",
    },
    {
      slug: "a-propos", section: "page", position: 1,
      title: "Markel Technology",
      subtitle: "L'ingénierie logicielle au service des entreprises ivoiriennes",
      body: "Fondée à Abidjan en 2018, Markel Technology accompagne banques, opérateurs, industriels et institutions publiques dans la conception, l'intégration et l'exploitation de leurs systèmes d'information. Nos quarante collaborateurs interviennent depuis le Plateau, au plus près de vos équipes.",
    },
  ];
  for (const p of PAGES) {
    await prisma.contentPage.upsert({
      where: { slug: p.slug },
      update: { ...p, published: true },
      create: { ...p, published: true },
    });
  }
  console.log(`  Contenus          · ${PAGES.length} blocs éditoriaux`);
}

main()
  .catch((e) => {
    console.error("\n✖ Seed en échec :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
