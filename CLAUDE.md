# Markel CRM — instructions de projet

CRM et facturation conforme **FNE** (Facture Normalisée Électronique, DGI Côte d'Ivoire)
pour **Markel Technology**, ESN basée à Abidjan.

## Source de vérité visuelle

`design/FICHE-DESIGN.md` **fait foi**. Aucune couleur, aucune police, aucun rayon ne se
décide contre elle. Ses décisions d'absence sont des décisions : **pas de mode sombre**,
pas de dégradé, pas d'ombre colorée, pas d'icône multicolore.

Si un export Claude Design est déposé sous `design/`, il devient prioritaire : le lire
intégralement et régénérer la fiche à partir de lui, sans jamais modifier l'export.

## Règles non négociables

1. **Aucune couleur ni taille de police codée en dur dans un composant.** Tout passe par
   les jetons de `src/app/globals.css`, exposés à Tailwind dans `tailwind.config.ts`
   (`bg-surface`, `text-ink-3`, `border-line`, `text-brand`…). Un `#` hexadécimal dans un
   `.tsx` est un bug, sauf dans les constantes de série de graphique de `src/lib/charts.ts`
   qui lisent elles-mêmes les jetons.
2. **Le doré (`gold`) est réservé à la conformité FNE.** Nulle part ailleurs.
3. Les polices se chargent par `next/font` dans `src/app/layout.tsx`, avec pile de repli.
4. Montants, références FNE, NCC et codes projet toujours en `font-mono` + `tabular-nums`,
   via le composant `<Amount />` ou l'utilitaire `formatXOF`.
5. Chaque page et chaque Server Action vérifie le rôle via `requireRole()` de
   `src/lib/auth-guard.ts`. Jamais de confiance dans le client.
6. Tout écrit métier significatif passe par `logActivity()` → table `AuditLog`.

## Pile

Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · PostgreSQL + Prisma 6 ·
Auth.js 5 (credentials + bcrypt) · Recharts · TanStack Table · qrcode.

Pas de librairie de composants tierce : les primitives sont écrites aux jetons du design
dans `src/components/ui/`.

## Rôles

| Rôle | Périmètre |
|---|---|
| `SUPER_ADMIN` | Tout, y compris administration, paramètres, journal, clé API FNE |
| `MANAGER` | Tout le métier (commercial, facturation, projets, support), pas l'administration |
| `SALES` | Sociétés, contacts, pipeline, devis, activités, catalogue (lecture) |
| `SUPPORT` | Tickets, contacts, sociétés (lecture), activités |
| `CLIENT` | Portail client uniquement, restreint à sa propre société |

## Intégration FNE

`src/lib/fne/` implémente la procédure d'interfaçage DGI de mai 2025 :
`POST /external/invoices/sign` (vente et bordereau d'achat) et
`POST /external/invoices/{id}/refund` (avoir), authentification `Bearer <API_KEY>`.

Deux modes, choisis par la variable `FNE_MODE` :
- `mock` (**défaut**) — simulateur local fidèle au contrat de l'API : mêmes champs, même
  format de référence, même gestion des erreurs 400/401/500, décrément du solde de
  stickers. Aucun appel réseau. C'est le mode des environnements de démonstration.
- `live` — appels HTTP réels vers `FNE_BASE_URL` avec `FNE_API_KEY`.

Tout appel, réussi ou non, est journalisé dans `FneLog` (requête, réponse, code, latence).
Ne jamais journaliser la clé API.

## Commandes

```bash
npm run dev        # développement
npm run build      # prisma generate + next build
npm run db:migrate # prisma migrate deploy (pré-déploiement Railway)
npm run db:seed    # seed idempotent
```
