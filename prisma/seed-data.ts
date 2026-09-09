/** Données de référence de la démonstration — Markel Technology, Abidjan. */

export const ORG = {
  name: "Markel Technology",
  legalName: "MARKEL TECHNOLOGY SARL",
  ncc: "2418562M",
  rccm: "CI-ABJ-2018-B-14237",
  taxRegime: "Réel Normal d'Imposition",
  addressLine: "Immeuble Alpha 2000, 12e étage — Rue du Commerce, Plateau",
  city: "Abidjan",
  country: "Côte d'Ivoire",
  phone: "+225 27 20 31 45 60",
  email: "contact@markel-technology.ci",
  website: "https://markel-technology.ci",
  bankName: "Société Générale Côte d'Ivoire",
  bankAccount: "CI93 0161 0100 0074 2185 6201 88",
  defaultPointOfSale: "01",
  defaultEstablishment: "Siège Abidjan-Plateau",
  commercialMessage: "Markel Technology — l'ingénierie logicielle au service des entreprises ivoiriennes.",
  invoiceFooter:
    "Règlement à 30 jours. Pénalité de retard de 1,5 % par mois entamé. Facture certifiée par la plateforme FNE de la DGI.",
  fneStickerBalance: 412,
};

export const USERS = [
  {
    email: "admin@markel-technology.ci", name: "Yédjané Yeo", role: "SUPER_ADMIN",
    jobTitle: "Directeur Général", phone: "+225 07 07 12 34 56",
    password: "Admin2026!", accentToken: "brand",
  },
  {
    email: "gestion@markel-technology.ci", name: "Aïcha Koné", role: "MANAGER",
    jobTitle: "Directrice des Opérations", phone: "+225 07 08 45 12 90",
    password: "Gestion2026!", accentToken: "violet",
  },
  {
    email: "commercial@markel-technology.ci", name: "Bakary Traoré", role: "SALES",
    jobTitle: "Responsable Commercial", phone: "+225 05 64 23 78 11",
    password: "Commercial2026!", accentToken: "teal",
  },
  {
    email: "support@markel-technology.ci", name: "Fatou Diallo", role: "SUPPORT",
    jobTitle: "Ingénieure Support N2", phone: "+225 01 42 09 66 32",
    password: "Support2026!", accentToken: "warning",
  },
  {
    email: "seydou.ouattara@markel-technology.ci", name: "Seydou Ouattara", role: "MANAGER",
    jobTitle: "Directeur Technique", phone: "+225 07 11 88 44 21",
    password: "Gestion2026!", accentToken: "success",
  },
  {
    email: "nadia.bamba@markel-technology.ci", name: "Nadia Bamba", role: "SALES",
    jobTitle: "Chargée de comptes", phone: "+225 05 90 33 17 05",
    password: "Commercial2026!", accentToken: "danger",
  },
];

export const CLIENT_USER = {
  email: "client@nsia-banque.ci", name: "Marc-Aurèle N'Guessan",
  role: "CLIENT", jobTitle: "Directeur des Systèmes d'Information",
  phone: "+225 27 20 31 07 44", password: "Client2026!", accentToken: "brand",
};

type Seeded = {
  name: string; legalName: string; ncc: string | null; rccm: string | null;
  industry: string; size: string; status: string; tier: string; fneTemplate: string;
  city: string; country: string; email: string; phone: string; website: string | null;
  addressLine: string; source: string; tags: string[];
};

export const COMPANIES: Seeded[] = [
  {
    name: "NSIA Banque CI", legalName: "NSIA BANQUE CÔTE D'IVOIRE SA",
    ncc: "9704521B", rccm: "CI-ABJ-1995-B-00321", industry: "Banque & Assurance",
    size: "Grand compte", status: "CLIENT", tier: "STRATEGIQUE", fneTemplate: "B2B",
    city: "Abidjan", country: "Côte d'Ivoire", email: "dsi@nsia-banque.ci",
    phone: "+225 27 20 31 07 00", website: "https://nsiabanque.ci",
    addressLine: "8-10 Avenue Joseph Anoma, Plateau", source: "Recommandation",
    tags: ["core banking", "mobile", "PSD2"],
  },
  {
    name: "Orange Côte d'Ivoire", legalName: "ORANGE CÔTE D'IVOIRE SA",
    ncc: "9601234C", rccm: "CI-ABJ-1996-B-01120", industry: "Télécommunications",
    size: "Grand compte", status: "CLIENT", tier: "STRATEGIQUE", fneTemplate: "B2B",
    city: "Abidjan", country: "Côte d'Ivoire", email: "achats@orange.ci",
    phone: "+225 27 21 23 45 00", website: "https://orange.ci",
    addressLine: "Immeuble Orange, Boulevard Valéry Giscard d'Estaing, Marcory",
    source: "Appel d'offres", tags: ["télécom", "API", "haute dispo"],
  },
  {
    name: "SIFCA", legalName: "GROUPE SIFCA SA", ncc: "8802341S",
    rccm: "CI-ABJ-1988-B-00214", industry: "Agro-industrie", size: "Grand compte",
    status: "CLIENT", tier: "CLE", fneTemplate: "B2B", city: "Abidjan",
    country: "Côte d'Ivoire", email: "si@sifca.ci", phone: "+225 27 22 40 60 00",
    website: "https://groupesifca.com", addressLine: "Rue des Carrossiers, Zone 3, Treichville",
    source: "Salon SITIC", tags: ["ERP", "supply chain"],
  },
  {
    name: "Port Autonome d'Abidjan", legalName: "PORT AUTONOME D'ABIDJAN",
    ncc: "7100112P", rccm: "CI-ABJ-1971-B-00007", industry: "Secteur public",
    size: "Institution", status: "CLIENT", tier: "STRATEGIQUE", fneTemplate: "B2G",
    city: "Abidjan", country: "Côte d'Ivoire", email: "dsi@paa.ci",
    phone: "+225 27 21 23 80 00", website: "https://portabidjan.ci",
    addressLine: "Boulevard du Port, Treichville", source: "Appel d'offres public",
    tags: ["B2G", "douane", "logistique"],
  },
  {
    name: "Prosuma", legalName: "PROSUMA SA", ncc: "9203456P",
    rccm: "CI-ABJ-1992-B-00876", industry: "Distribution", size: "Grand compte",
    status: "CLIENT", tier: "CLE", fneTemplate: "B2B", city: "Abidjan",
    country: "Côte d'Ivoire", email: "informatique@prosuma.ci",
    phone: "+225 27 21 75 90 00", website: null,
    addressLine: "Zone Industrielle de Vridi", source: "Recommandation",
    tags: ["retail", "caisse", "FNE"],
  },
  {
    name: "CIE — Compagnie Ivoirienne d'Électricité", legalName: "CIE SA",
    ncc: "9005678E", rccm: "CI-ABJ-1990-B-00445", industry: "Énergie",
    size: "Grand compte", status: "CLIENT", tier: "CLE", fneTemplate: "B2B",
    city: "Abidjan", country: "Côte d'Ivoire", email: "dsi@cie.ci",
    phone: "+225 27 20 20 80 00", website: "https://cie.ci",
    addressLine: "1 Avenue Christiani, Treichville", source: "Appel d'offres",
    tags: ["facturation", "relève", "mobile"],
  },
  {
    name: "Wave Mobile Money", legalName: "WAVE CI SA", ncc: "1904567W",
    rccm: "CI-ABJ-2019-B-08812", industry: "Fintech", size: "ETI",
    status: "CLIENT", tier: "CLE", fneTemplate: "B2B", city: "Abidjan",
    country: "Côte d'Ivoire", email: "tech@wave.com",
    phone: "+225 07 00 10 20 30", website: "https://wave.com",
    addressLine: "Cocody Riviera Golf, Immeuble Tandem", source: "Entrant web",
    tags: ["fintech", "scalabilité"],
  },
  {
    name: "Société Ivoirienne de Raffinage", legalName: "SIR SA", ncc: "6200891R",
    rccm: "CI-ABJ-1962-B-00019", industry: "Pétrole & Gaz", size: "Grand compte",
    status: "PROSPECT", tier: "STRATEGIQUE", fneTemplate: "B2B", city: "Abidjan",
    country: "Côte d'Ivoire", email: "achats@sir.ci", phone: "+225 27 21 75 44 00",
    website: "https://sir.ci", addressLine: "Boulevard de Petit Bassam, Vridi",
    source: "Prospection directe", tags: ["industrie", "maintenance"],
  },
  {
    name: "CNPS", legalName: "CAISSE NATIONALE DE PRÉVOYANCE SOCIALE",
    ncc: "6800045C", rccm: "CI-ABJ-1968-B-00003", industry: "Secteur public",
    size: "Institution", status: "PROSPECT", tier: "STRATEGIQUE", fneTemplate: "B2G",
    city: "Abidjan", country: "Côte d'Ivoire", email: "dsi@cnps.ci",
    phone: "+225 27 20 25 20 00", website: "https://cnps.ci",
    addressLine: "Avenue Lamblin, Plateau", source: "Appel d'offres public",
    tags: ["B2G", "dématérialisation"],
  },
  {
    name: "Carré d'Or Immobilier", legalName: "CARRÉ D'OR SARL", ncc: "1502345I",
    rccm: "CI-ABJ-2015-B-05512", industry: "Immobilier", size: "PME",
    status: "CLIENT", tier: "STANDARD", fneTemplate: "B2B", city: "Abidjan",
    country: "Côte d'Ivoire", email: "contact@carredor.ci",
    phone: "+225 05 55 12 34 78", website: null,
    addressLine: "Cocody Angré 7e Tranche", source: "Entrant web",
    tags: ["PME", "site web"],
  },
  {
    name: "AGL Côte d'Ivoire", legalName: "AFRICA GLOBAL LOGISTICS CI",
    ncc: "9807654L", rccm: "CI-ABJ-1998-B-02234", industry: "Transport & Logistique",
    size: "Grand compte", status: "PROSPECT", tier: "CLE", fneTemplate: "B2B",
    city: "Abidjan", country: "Côte d'Ivoire", email: "it.ci@aglgroup.com",
    phone: "+225 27 21 75 60 00", website: "https://aglgroup.com",
    addressLine: "Terminal à conteneurs, Port d'Abidjan", source: "Salon SITIC",
    tags: ["logistique", "IoT"],
  },
  {
    name: "Kaydan Group", legalName: "KAYDAN GROUP SA", ncc: "1703456K",
    rccm: "CI-ABJ-2017-B-07001", industry: "Immobilier", size: "ETI",
    status: "PROSPECT", tier: "STANDARD", fneTemplate: "B2B", city: "Abidjan",
    country: "Côte d'Ivoire", email: "dg@kaydan.ci", phone: "+225 27 22 47 88 00",
    website: null, addressLine: "Riviera Faya, Cocody", source: "Recommandation",
    tags: ["CRM", "PME"],
  },
  {
    name: "Nestlé Côte d'Ivoire", legalName: "NESTLÉ CÔTE D'IVOIRE SA",
    ncc: "5900123N", rccm: "CI-ABJ-1959-B-00011", industry: "Agroalimentaire",
    size: "Grand compte", status: "PARTENAIRE", tier: "CLE", fneTemplate: "B2B",
    city: "Abidjan", country: "Côte d'Ivoire", email: "procurement.ci@nestle.com",
    phone: "+225 27 21 75 22 00", website: "https://nestle-cwa.com",
    addressLine: "Zone Industrielle de Yopougon", source: "Partenariat",
    tags: ["partenaire", "intégration"],
  },
  {
    name: "Bridge Bank Group", legalName: "BRIDGE BANK GROUP CI SA",
    ncc: "0603456B", rccm: "CI-ABJ-2006-B-03345", industry: "Banque & Assurance",
    size: "ETI", status: "CLIENT", tier: "STANDARD", fneTemplate: "B2B",
    city: "Abidjan", country: "Côte d'Ivoire", email: "si@bridgebankgroup.com",
    phone: "+225 27 20 21 40 00", website: null,
    addressLine: "Avenue Noguès, Plateau", source: "Recommandation",
    tags: ["banque", "conformité"],
  },
  {
    name: "Sahel Digital Partners", legalName: "SAHEL DIGITAL PARTNERS SAS",
    ncc: null, rccm: "FR-75-2021-B-99120", industry: "Conseil", size: "PME",
    status: "CLIENT", tier: "STANDARD", fneTemplate: "B2F", city: "Paris",
    country: "France", email: "contact@saheldigital.fr",
    phone: "+33 1 45 22 18 90", website: "https://saheldigital.fr",
    addressLine: "18 rue de Londres, 75009 Paris", source: "Réseau",
    tags: ["international", "B2F", "EUR"],
  },
  {
    name: "Mairie de Cocody", legalName: "MAIRIE DE COCODY", ncc: "8000012M",
    rccm: null, industry: "Secteur public", size: "Institution",
    status: "INACTIF", tier: "PETIT", fneTemplate: "B2G", city: "Abidjan",
    country: "Côte d'Ivoire", email: "informatique@mairiecocody.ci",
    phone: "+225 27 22 44 10 00", website: null,
    addressLine: "Boulevard Latrille, Cocody", source: "Appel d'offres public",
    tags: ["B2G", "dormant"],
  },
];

export const CONTACTS: Array<{
  company: string; firstName: string; lastName: string; jobTitle: string;
  email: string; phone: string; isPrimary: boolean;
}> = [
  { company: "NSIA Banque CI", firstName: "Marc-Aurèle", lastName: "N'Guessan", jobTitle: "Directeur des Systèmes d'Information", email: "client@nsia-banque.ci", phone: "+225 27 20 31 07 44", isPrimary: true },
  { company: "NSIA Banque CI", firstName: "Sylvie", lastName: "Adjoua", jobTitle: "Responsable Digital", email: "s.adjoua@nsia-banque.ci", phone: "+225 07 45 12 88 03", isPrimary: false },
  { company: "Orange Côte d'Ivoire", firstName: "Ibrahim", lastName: "Cissé", jobTitle: "Head of IT Platforms", email: "i.cisse@orange.ci", phone: "+225 07 89 11 22 33", isPrimary: true },
  { company: "Orange Côte d'Ivoire", firstName: "Léa", lastName: "Kouassi", jobTitle: "Acheteuse IT", email: "l.kouassi@orange.ci", phone: "+225 05 12 90 44 76", isPrimary: false },
  { company: "SIFCA", firstName: "Amadou", lastName: "Sangaré", jobTitle: "DSI Groupe", email: "a.sangare@sifca.ci", phone: "+225 27 22 40 60 12", isPrimary: true },
  { company: "Port Autonome d'Abidjan", firstName: "Bernard", lastName: "Yao", jobTitle: "Chef de Département SI", email: "b.yao@paa.ci", phone: "+225 27 21 23 80 45", isPrimary: true },
  { company: "Port Autonome d'Abidjan", firstName: "Mariam", lastName: "Touré", jobTitle: "Cheffe de Projet Digitalisation", email: "m.toure@paa.ci", phone: "+225 01 03 55 62 18", isPrimary: false },
  { company: "Prosuma", firstName: "Jean-Claude", lastName: "Beugré", jobTitle: "Directeur Informatique", email: "jc.beugre@prosuma.ci", phone: "+225 27 21 75 90 21", isPrimary: true },
  { company: "CIE — Compagnie Ivoirienne d'Électricité", firstName: "Rachelle", lastName: "Gnamien", jobTitle: "Responsable Applications Métier", email: "r.gnamien@cie.ci", phone: "+225 07 66 21 09 54", isPrimary: true },
  { company: "Wave Mobile Money", firstName: "Kevin", lastName: "Aholou", jobTitle: "Engineering Manager", email: "k.aholou@wave.com", phone: "+225 07 00 10 20 41", isPrimary: true },
  { company: "Société Ivoirienne de Raffinage", firstName: "Dramane", lastName: "Coulibaly", jobTitle: "Directeur Maintenance", email: "d.coulibaly@sir.ci", phone: "+225 27 21 75 44 18", isPrimary: true },
  { company: "CNPS", firstName: "Estelle", lastName: "Aka", jobTitle: "Directrice de la Transformation", email: "e.aka@cnps.ci", phone: "+225 27 20 25 20 33", isPrimary: true },
  { company: "Carré d'Or Immobilier", firstName: "Ousmane", lastName: "Fofana", jobTitle: "Gérant", email: "o.fofana@carredor.ci", phone: "+225 05 55 12 34 78", isPrimary: true },
  { company: "AGL Côte d'Ivoire", firstName: "Pauline", lastName: "Zadi", jobTitle: "IT Business Partner", email: "p.zadi@aglgroup.com", phone: "+225 27 21 75 60 22", isPrimary: true },
  { company: "Kaydan Group", firstName: "Serge", lastName: "Assamoi", jobTitle: "Directeur Général Adjoint", email: "s.assamoi@kaydan.ci", phone: "+225 27 22 47 88 12", isPrimary: true },
  { company: "Nestlé Côte d'Ivoire", firstName: "Grace", lastName: "Ehui", jobTitle: "Responsable Achats IT", email: "g.ehui@ci.nestle.com", phone: "+225 27 21 75 22 41", isPrimary: true },
  { company: "Bridge Bank Group", firstName: "Karim", lastName: "Doumbia", jobTitle: "Responsable Conformité SI", email: "k.doumbia@bridgebankgroup.com", phone: "+225 27 20 21 40 15", isPrimary: true },
  { company: "Sahel Digital Partners", firstName: "Camille", lastName: "Perrin", jobTitle: "Associée", email: "c.perrin@saheldigital.fr", phone: "+33 1 45 22 18 92", isPrimary: true },
  { company: "Mairie de Cocody", firstName: "Franck", lastName: "Kacou", jobTitle: "Chef de service informatique", email: "f.kacou@mairiecocody.ci", phone: "+225 27 22 44 10 22", isPrimary: true },
];

export const PRODUCTS = [
  { sku: "DEV-WEB-J", name: "Développement applicatif web — jour/homme", category: "Ingénierie logicielle", unitPrice: 285_000, unit: "jour", vatCode: "TVA", recurring: false, description: "Conception et développement d'applications web sur mesure (Next.js, Java, .NET)." },
  { sku: "DEV-MOB-J", name: "Développement mobile — jour/homme", category: "Ingénierie logicielle", unitPrice: 310_000, unit: "jour", vatCode: "TVA", recurring: false, description: "Applications iOS et Android natives ou React Native." },
  { sku: "INT-ERP-J", name: "Intégration ERP / SI — jour/homme", category: "Intégration", unitPrice: 340_000, unit: "jour", vatCode: "TVA", recurring: false, description: "Intégration SAP, Odoo, Sage et interfaçage de systèmes tiers." },
  { sku: "FNE-CONNECT", name: "Connecteur FNE — licence annuelle", category: "Conformité fiscale", unitPrice: 4_500_000, unit: "licence", vatCode: "TVA", recurring: true, description: "Connecteur certifié d'interfaçage à la plateforme FNE de la DGI, mises à jour réglementaires incluses." },
  { sku: "FNE-SETUP", name: "Mise en conformité FNE — forfait", category: "Conformité fiscale", unitPrice: 2_850_000, unit: "forfait", vatCode: "TVA", recurring: false, description: "Cadrage, interfaçage API, jeu de tests DGI et accompagnement à la validation." },
  { sku: "TMA-MENS", name: "Tierce maintenance applicative — mensuel", category: "Infogérance", unitPrice: 1_750_000, unit: "mois", vatCode: "TVA", recurring: true, description: "Maintenance corrective et évolutive, engagement de service P1 4 h." },
  { sku: "CLOUD-MENS", name: "Hébergement cloud infogéré — mensuel", category: "Infogérance", unitPrice: 950_000, unit: "mois", vatCode: "TVA", recurring: true, description: "Hébergement souverain, supervision 24/7, sauvegardes chiffrées." },
  { sku: "SEC-AUDIT", name: "Audit de cybersécurité — forfait", category: "Cybersécurité", unitPrice: 6_200_000, unit: "forfait", vatCode: "TVA", recurring: false, description: "Test d'intrusion, revue de configuration et plan de remédiation priorisé." },
  { sku: "SEC-SOC", name: "Supervision sécurité (SOC) — mensuel", category: "Cybersécurité", unitPrice: 2_400_000, unit: "mois", vatCode: "TVA", recurring: true, description: "Détection et réponse aux incidents, veille sur les vulnérabilités." },
  { sku: "AMOA-J", name: "Conseil & AMOA — jour/homme", category: "Conseil", unitPrice: 395_000, unit: "jour", vatCode: "TVA", recurring: false, description: "Cadrage stratégique, schéma directeur, pilotage de programme." },
  { sku: "FORM-J", name: "Formation professionnelle — jour", category: "Formation", unitPrice: 450_000, unit: "jour", vatCode: "TVAB", recurring: false, description: "Formation certifiante en présentiel ou à distance (taux réduit 9 %)." },
  { sku: "DATA-BI-J", name: "Data & Business Intelligence — jour/homme", category: "Data", unitPrice: 325_000, unit: "jour", vatCode: "TVA", recurring: false, description: "Entrepôt de données, tableaux de bord décisionnels, industrialisation." },
  { sku: "LIC-PAA", name: "Licence plateforme portuaire — annuel", category: "Édition logicielle", unitPrice: 12_000_000, unit: "licence", vatCode: "TVAC", recurring: true, description: "Licence annuelle exonérée par convention d'établissement (TVAC)." },
  { sku: "SUP-24-7", name: "Support Premium 24/7 — mensuel", category: "Infogérance", unitPrice: 1_250_000, unit: "mois", vatCode: "TVA", recurring: true, description: "Astreinte permanente, ligne dédiée, intervention garantie sous 4 h." },
];
