# FICHE DE DESIGN — Markel CRM

> Mode **express** : aucun export Claude Design n'était présent dans le dépôt. Cette
> fiche a donc été *conçue* puis figée ici. À partir de maintenant elle joue le rôle de
> source de vérité : aucune couleur, aucune police, aucune forme ne se décide contre elle.
> Si un export Claude Design est déposé plus tard sous `design/`, il devient prioritaire
> et cette fiche doit être régénérée à partir de lui.

## 1. Direction artistique

**Clair & corporate premium.** Blanc chaud, gris chauds, accent bleu profond, filets fins,
ombres très douces, beaucoup d'air. L'interface doit se lire comme un document
d'entreprise soigné : dense en information, jamais bruyante. Registre : cabinet de conseil
technologique à Abidjan, qui reçoit des directions générales et des DAF.

Une seule dérogation chromatique : le **doré fiscal**, réservé exclusivement à la
conformité FNE (sticker, certification DGI). Il ne sert à rien d'autre — c'est la
signature du produit.

## 2. Palette (jetons `--color-*` dans `globals.css`)

| Jeton | Hex | Usage |
|---|---|---|
| `--bg` | `#FBFAF8` | Fond général de page (blanc chaud, jamais `#fff` pur) |
| `--surface` | `#FFFFFF` | Cartes, tables, panneaux |
| `--surface-2` | `#F4F1EC` | Zones creuses, en-têtes de tableau, états survolés |
| `--surface-3` | `#EAE6DF` | Barres de progression vides, séparateurs pleins |
| `--ink` | `#1A1815` | Texte principal (noir chaud) |
| `--ink-2` | `#3D3934` | Texte secondaire, libellés |
| `--ink-3` | `#6B655C` | Texte tertiaire, métadonnées |
| `--ink-4` | `#8C857A` | Texte désactivé, placeholders |
| `--line` | `#E8E4DD` | Filets par défaut (1px) |
| `--line-2` | `#D8D2C8` | Filets appuyés, bordures de champ au repos |
| `--brand` | `#163A6E` | Accent principal — bleu profond |
| `--brand-2` | `#0E2547` | Bleu appuyé (survol, en-têtes) |
| `--brand-3` | `#2B5CA8` | Bleu clair (liens, graphiques) |
| `--brand-4` | `#7FA3D6` | Bleu pâle (séries secondaires) |
| `--brand-soft` | `#EEF3FB` | Fond de badge / zone accentuée |
| `--gold` | `#8A6410` | **Réservé FNE** — texte et icône de certification |
| `--gold-2` | `#B8860B` | **Réservé FNE** — filets du sticker |
| `--gold-soft` | `#FAF3E2` | **Réservé FNE** — fond du sticker |
| `--success` / `--success-soft` | `#15734E` / `#E8F3EE` | Gagné, payé, certifié, actif |
| `--warning` / `--warning-soft` | `#9A6212` / `#FBF1DF` | En attente, échéance proche, brouillon |
| `--danger` / `--danger-soft` | `#A32B23` / `#FBEBE9` | Perdu, en retard, rejeté, suppression |
| `--violet` / `--violet-soft` | `#5B3E9E` / `#F1ECFB` | Projets, séries de graphique |
| `--teal` / `--teal-soft` | `#0F6B70` / `#E5F2F2` | Support, séries de graphique |

Contrastes vérifiés : `--ink` sur `--bg` = 15,3:1 ; `--ink-3` sur `--bg` = 5,2:1 ;
blanc sur `--brand` = 10,1:1 ; `--gold` sur `--gold-soft` = 6,4:1. Tous ≥ AA.

## 3. Typographie

- **Interface** : `Inter` (variable), repli `ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial`.
- **Titres éditoriaux** (vitrine publique, titres de page, montants de tête) : `Fraunces`
  (serif variable, `opsz` optique), repli `Georgia, "Times New Roman", serif`.
  C'est elle qui porte le « premium ».
- **Chiffres et références** : `JetBrains Mono`, repli `ui-monospace, SFMono-Regular, Menlo, monospace`.
  Obligatoire pour : montants en table, numéros de facture, références FNE, NCC, codes projet.
  Toujours en `font-variant-numeric: tabular-nums`.

Échelle : 11 / 12 / 13 / 14 / 16 / 18 / 22 / 28 / 36 / 48 px. Interlignage 1,5 pour le
corps, 1,15 pour les titres. Interlettrage `-0.02em` au-delà de 22px, `+0.06em` pour les
micro-libellés en capitales (11px).

## 4. Formes, filets, ombres

- **Rayons** : `4px` (badges, champs), `8px` (cartes, boutons), `14px` (panneaux, modales).
  Jamais de pilule sauf pour les pastilles de statut rondes.
- **Filets** : 1px `--line`. La grammaire du produit repose sur les filets, **pas** sur les ombres.
- **Ombres** : trois niveaux seulement, tous très diffus et jamais colorés.
  `--shadow-1: 0 1px 2px rgba(26,24,21,.04), 0 1px 3px rgba(26,24,21,.03)` (cartes),
  `--shadow-2: 0 4px 12px rgba(26,24,21,.06), 0 2px 4px rgba(26,24,21,.04)` (menus),
  `--shadow-3: 0 24px 48px rgba(26,24,21,.12), 0 8px 16px rgba(26,24,21,.06)` (modales).
- **Air** : gouttière de page 32px sur desktop, 16px sur mobile. Espacement vertical
  entre blocs 24px. Padding de carte 20px. Hauteur de ligne de table 48px.

## 5. Décisions d'absence (à respecter)

- **Pas de mode sombre.** Le blanc chaud est l'identité. Aucun `dark:` dans le code.
- **Pas de dégradé** en aplat de fond, sauf le voile unique de la section héros de la vitrine.
- **Pas d'ombre colorée**, pas de glow, pas de néon.
- **Pas d'icônes multicolores** : trait 1,5px, `currentColor` uniquement.
- **Pas d'angles totalement vifs** (0px) ni de très grands rayons (>14px).

## 6. Écrans prévus

**Vitrine publique** (`/`) : héros, chiffres clés, expertises, conformité FNE, références
clients, appel à l'action, pied de page. Bouton « Espace client » et « Connexion ».
Page `/verification/[token]` : vérification publique d'une facture certifiée.

**Back-office** (`/dashboard` …) : barre latérale fixe 248px avec groupes de navigation,
barre supérieure avec fil d'Ariane + recherche globale + notifications + menu utilisateur.
Contenu en gouttière 32px. Écrans : Tableau de bord, Sociétés, Contacts, Pipeline (kanban),
Devis, Factures, Conformité FNE, Projets, Feuilles de temps, Tickets, Activités, Catalogue,
Rapports, Administration (utilisateurs, rôles, paramètres, contenus, journal).

**Portail client** (`/portal`) : version allégée, même grammaire, navigation horizontale.

**États** : vide, chargement (squelettes aux mêmes filets), erreur, accès refusé, 404.

## 7. Contenus et règles chiffrées portés par le design

- Devise **XOF** affichée sans décimale, séparateur de milliers = espace insécable fine.
- TVA normale **18 %** (`TVA`), réduite **9 %** (`TVAB`), exonérée conventionnelle **0 %**
  (`TVAC`), exonérée légale **0 %** (`TVAD`) — nomenclature FNE.
- Probabilités de pipeline affichées telles quelles : 10 / 25 / 50 / 75 / 100 / 0 %.
- SLA support affichés en heures : P1 4h, P2 8h, P3 24h, P4 72h.
- Le sticker FNE se compose **toujours** des trois éléments imposés par la DGI :
  QR code, visuel FNE, référence normalisée en `JetBrains Mono`.
