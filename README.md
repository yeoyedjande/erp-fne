# Markel CRM — CRM et facturation normalisée FNE

Plateforme de gestion commerciale de **Markel Technology** (ESN, Abidjan-Plateau),
avec interfaçage à la **plateforme FNE** de la Direction Générale des Impôts de
Côte d'Ivoire.

La facture normalisée électronique n'est pas un module ajouté au CRM : c'est
l'axe autour duquel la facturation est construite. Chaque facture porte son
régime fiscal (B2B, B2C, B2G, B2F), son code de TVA au sens de la nomenclature
DGI, ses taxes spécifiques, et — une fois certifiée — le sticker électronique
en trois éléments imposé par la procédure.

---

## Table d'accès

L'application n'est pas encore déployée : cette session ne dispose d'aucun
identifiant Railway. La séquence de mise en ligne est donnée plus bas ; une fois
exécutée, remplacez `<URL>` par le domaine attribué.

| Espace | URL | Email | Mot de passe | Rôle |
|---|---|---|---|---|
| Site public | `<URL>/` | — | — | anonyme |
| Vérification de facture | `<URL>/verification` | — | — | anonyme |
| Administration | `<URL>/connexion` | `admin@markel-technology.ci` | `Admin2026!` | Super Admin |
| Gestion | `<URL>/connexion` | `gestion@markel-technology.ci` | `Gestion2026!` | Gestionnaire |
| Commercial | `<URL>/connexion` | `commercial@markel-technology.ci` | `Commercial2026!` | Commercial |
| Support | `<URL>/connexion` | `support@markel-technology.ci` | `Support2026!` | Support |
| Portail client | `<URL>/portail` | `client@nsia-banque.ci` | `Client2026!` | Client (NSIA Banque) |

Deux comptes secondaires partagent les mots de passe de leur rôle :
`seydou.ouattara@markel-technology.ci` (Gestionnaire) et
`nadia.bamba@markel-technology.ci` (Commercial).

> **Ces mots de passe sont assumés pour une démonstration.** Changez-les avant
> tout usage réel : Administration → Utilisateurs → « Mot de passe ».

---

## Ce que fait la plateforme

**Conformité FNE.** Certification des factures de vente et des bordereaux
d'achat (`POST /external/invoices/sign`), émission d'avoirs
(`POST /external/invoices/{id}/refund`), authentification `Bearer`, gestion des
quatre régimes de TVA (`TVA` 18 %, `TVAB` 9 %, `TVAC` et `TVAD` exonérés), taxes
spécifiques à la ligne comme au pied de facture (AIRSI, GRA, DTD), suivi du
stock de stickers électroniques, journal intégral des échanges avec la DGI, et
page publique de vérification ouverte par le QR code.

**Commercial.** Sociétés et contacts, pipeline en kanban à probabilité imposée
par l'étape, devis avec conversion en facture, catalogue d'offres.

**Facturation.** Émission, règlements partiels, relances implicites par
échéance, avoirs, document imprimable aux mentions légales complètes.

**Delivery.** Projets, tâches, feuilles de temps, santé budgétaire calculée en
comparant la consommation à l'avancement déclaré.

**Support.** Tickets avec engagements de service (P1 4 h, P2 8 h, P3 24 h,
P4 72 h), notes internes invisibles du portail client.

**Administration.** Utilisateurs et rôles, règles métier paramétrables, contenus
de la vitrine éditables, journal d'activité.

**Portail client.** Espace cloisonné : un client ne voit que sa société, jamais
un brouillon, jamais une note interne.

---

## Règles métier appliquées

| Règle | Valeur | Où |
|---|---|---|
| Devise | XOF, sans décimale | `src/lib/format.ts` |
| TVA normale / réduite / exonérée | 18 % / 9 % / 0 % | `src/lib/fne/constants.ts` |
| Probabilité de pipeline par étape | 10 / 25 / 50 / 75 / 100 / 0 % | `src/lib/business.ts` |
| Validité d'un devis | 30 jours | `src/lib/business.ts` |
| Délai de règlement | 30 jours | `src/lib/business.ts` |
| Pénalité de retard | 1,5 % par mois entamé | `src/lib/business.ts` |
| Remise maximale — Commercial / Gestionnaire | 15 % / 30 % | `src/lib/business.ts` |
| SLA support P1–P4 | 4 / 8 / 24 / 72 heures | `src/lib/business.ts` |
| Seuil d'alerte stickers FNE | 50 | `src/lib/fne/constants.ts` |

### Cascade de calcul fiscal

```
net ligne     = quantité × P.U. HT × (1 − remise_ligne / 100)
base HT       = Σ net ligne × (1 − remise_globale / 100)
base ligne    = net ligne × (1 − remise_globale / 100)      ← prorata
TVA ligne     = base ligne × taux(code TVA)
taxe spéc.    = base ligne (ou base HT au pied) × taux
TTC           = base HT + Σ TVA + Σ taxes spécifiques
```

Vérifiée sur l'exemple de la documentation DGI : deux articles remisés à 10 %
avec une remise globale de 10 % donnent une base HT de 680 400 XOF, soit
exactement l'écart `amount − vatAmount` de la réponse publiée par la DGI.
`npm run verify:fne` rejoue ce contrôle.

---

## Mode d'interfaçage FNE

| Variable | Défaut | Effet |
|---|---|---|
| `FNE_MODE` | `mock` | `mock` : simulateur local. `live` : appels réels. |
| `FNE_BASE_URL` | `http://54.247.95.108/ws` | Environnement de test DGI, ou URL de production. |
| `FNE_API_KEY` | — | Clé délivrée par la DGI après validation des spécimens. |
| `FNE_VERIFICATION_BASE` | `http://54.247.95.108/fr/verification` | Base des URL de vérification. |
| `SEED_ON_DEPLOY` | `false` | `true` rejoue le seed en pré-déploiement. À n'activer qu'au premier déploiement. |

Le **simulateur n'est pas un bouchon** : il applique les mêmes validations que la
plateforme (NCC obligatoire en B2B, devise et taux obligatoires en B2F, point de
vente et établissement non vides, lignes non vides, quantités strictement
positives), renvoie les mêmes codes 400 / 401 / 500, produit une référence au
format normalisé `NCC + AA + séquence sur 9 chiffres`, et décrémente le stock de
stickers. Passer en production ne demande que deux variables d'environnement.

**Mise en production réelle** : la DGI impose une procédure préalable —
inscription sur la plateforme de test, développement de l'interfaçage, envoi de
spécimens de factures à `support.fne@dgi.gouv.ci`, validation par la DGI, puis
communication de l'URL de production et affichage de la clé API dans l'onglet
« Paramétrage » de votre espace FNE.

---

## Développement local

```bash
npm install
cp .env.example .env          # renseignez DATABASE_URL et AUTH_SECRET
npx prisma migrate deploy     # applique les migrations
npm run db:seed               # jeu de démonstration idempotent
npm run dev                   # http://localhost:3000
```

`AUTH_SECRET` se génère avec `openssl rand -base64 32`.

Le seed est **idempotent** : il peut être rejoué à volonté, il produit toujours
la même démonstration (générateur pseudo-aléatoire à graine fixe). Il fait
réellement passer les factures par le client FNE, ce qui alimente le journal des
appels avec des succès, un rejet 400 et un avoir.

### Vérification

```bash
npm run verify:fne
```

Contrôle la cascade fiscale sur l'exemple DGI, le refus d'une facture B2B sans
NCC, une certification réelle avec décrément du stock de stickers, et l'émission
d'un avoir — puis restaure l'état de démonstration.

---

## Déploiement sur Railway

Deux chemins. Le premier ne demande aucune ligne de commande.

### A. Depuis GitHub (recommandé)

1. Sur [railway.com](https://railway.com) : **New Project → Deploy from GitHub repo**,
   choisissez `yeoyedjande/erp-fne`, branche `main`.
2. Dans le projet : **New → Database → Add PostgreSQL**. Railway injecte
   `DATABASE_URL` automatiquement dans le service applicatif.
3. Onglet **Variables** du service applicatif :

   | Variable | Valeur |
   |---|---|
   | `AUTH_SECRET` | sortie de `openssl rand -base64 32` |
   | `AUTH_TRUST_HOST` | `true` |
   | `FNE_MODE` | `mock` |
   | `SEED_ON_DEPLOY` | `true` — **au premier déploiement seulement** |
   | `NEXTAUTH_URL` | à renseigner à l'étape 5 |

4. Onglet **Settings → Networking → Generate Domain**.
5. Ajoutez `NEXTAUTH_URL=https://<votre-domaine>.up.railway.app`, puis redéployez.
6. **Repassez `SEED_ON_DEPLOY` à `false`** (ou supprimez la variable) pour que les
   déploiements suivants ne rejouent plus le jeu de démonstration.

`railway.json` déclare en pré-déploiement `prisma migrate deploy`, suivi du seed
uniquement si `SEED_ON_DEPLOY=true`. Les migrations passent donc avant chaque
démarrage, sans intervention.

### B. Depuis votre poste, avec la CLI

```bash
npm i -g @railway/cli
railway login

railway init --name markel-crm
railway add --database postgres          # la base AVANT le service

railway variables --set "AUTH_SECRET=$(openssl rand -base64 32)" \
                  --set "AUTH_TRUST_HOST=true" \
                  --set "FNE_MODE=mock" \
                  --set "SEED_ON_DEPLOY=true"

railway up                                # build + migrations + seed
railway domain                            # attribue le domaine public

railway variables --set "NEXTAUTH_URL=https://<domaine>.up.railway.app" \
                  --set "SEED_ON_DEPLOY=false"
railway redeploy
```

### Passage de la conformité FNE en production

```bash
FNE_MODE=live
FNE_BASE_URL=<url de production transmise par la DGI>
FNE_API_KEY=<clé de votre espace FNE, onglet « Paramétrage »>
```

La clé n'est délivrée qu'après validation de vos spécimens de factures par la
DGI (`support.fne@dgi.gouv.ci`). Tant que `FNE_MODE` vaut `mock`, aucune donnée
ne quitte le serveur.

---

## Sécurité des dépendances

`npm audit` doit rester à **zéro vulnérabilité** : Railway refuse de construire
une image qui en contient de niveau critique.

Deux dépendances transitives sont contraintes dans `package.json` → `overrides`,
parce que leurs parents les épinglent :

| Paquet | Pourquoi | À retirer quand |
|---|---|---|
| `postcss` → `$postcss` | `next@15.5.25` épingle `postcss@8.4.31`, vulnérable ([GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) et suivants). L'override aligne toute la chaîne sur la version saine déclarée en devDependency. | Passage à Next 16, qui embarque un postcss corrigé. |
| `deepmerge-ts` → `8.0.2` | `@prisma/config` tire `deepmerge-ts <8`, sujet à une exhaustion de pile ([GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)). Chargeur de configuration du CLI, jamais atteint à l'exécution. | Prisma publiera une 6.x alignée sur `deepmerge-ts@8`. |

Prisma reste volontairement en **6.19.3**. Prisma 7 supprime `url` du bloc
`datasource` au profit d'un adaptateur de driver et d'un `prisma.config.ts` :
c'est une réécriture de la couche d'accès aux données, à mener comme un chantier
propre et non dans un correctif de sécurité.

Après toute montée de version :

```bash
npm audit                 # doit afficher 0 vulnérabilité
npx tsc --noEmit
npm run build
npm run verify:fne        # 12 contrôles de la chaîne FNE
```

## Architecture

```
prisma/
  schema.prisma          modèle de données (montants en entiers XOF)
  seed.ts, seed-data.ts  démonstration idempotente
scripts/
  verifier-fne.ts        harnais de vérification de la chaîne FNE
design/
  FICHE-DESIGN.md        source de vérité visuelle
src/
  lib/fne/
    constants.ts         nomenclature DGI (TVA, templates, moyens de paiement)
    types.ts             contrat de l'API, transcrit fidèlement
    compute.ts           cascade de calcul fiscal
    client.ts            client HTTP + simulateur
    service.ts           certification, avoirs, journalisation
  lib/business.ts        toutes les règles chiffrées
  lib/permissions.ts     capacités par rôle
  lib/auth-guard.ts      gardes serveur (pages et Server Actions)
  app/(app)/             back-office
  app/portail/           portail client
  app/verification/      vérification publique par QR code
```

### Sécurité

Mots de passe hachés avec bcrypt, sessions JWT de 8 heures, contrôle d'accès
vérifié **côté serveur** sur chaque page (`requireCapability`) et chaque Server
Action (`assertCapability`) — la navigation filtrée n'est qu'un confort. Entrées
validées par Zod. La clé API FNE n'apparaît jamais dans le journal des appels.
Un client du portail ne peut pas lire une facture d'une autre société : la
requête filtre sur sa société de rattachement et répond 404.

---

## Limites assumées

- **Aucun déploiement n'a été effectué** : cette session n'avait pas
  d'identifiants Railway. Tout le reste a été vérifié en exécution réelle
  (migrations, seed, connexion, parcours des 34 routes, cloisonnement des rôles,
  certification et avoir).
- Les envois d'e-mail et de SMS sont **simulés** : aucun message ne part.
- Le mode FNE par défaut est le simulateur, conformément à la procédure DGI qui
  exige une validation préalable avant l'accès à la production.
- La création de sociétés, contacts et devis depuis l'interface n'est pas
  exposée : le jeu de démonstration les fournit, et les écritures implémentées
  portent sur les parcours métier (certification, avoir, règlement, conversion
  devis → facture, déplacement d'étape, réponse et statut de ticket,
  rôles, mots de passe, paramètres, contenus).
