-- Adresse officielle de Markel Technology.
--
-- L'adresse initiale avait été inventée en l'absence d'information. Elle figure
-- sur chaque facture et est transmise à la plateforme FNE : elle doit être
-- exacte. Cette migration corrige l'enregistrement existant en production, que
-- le seed ne rejoue pas une fois la base peuplée.
--
-- Le WHERE sur l'ancienne valeur garantit qu'une adresse déjà corrigée depuis
-- l'administration ne sera pas écrasée.

UPDATE "Organization"
SET "addressLine" = 'Riviera Palmeraie, Immeuble Walebo 1, 3e étage, bureau 1D — Cocody',
    "city"        = 'Abidjan',
    "country"     = 'Côte d''Ivoire'
WHERE "id" = 'org'
  AND "addressLine" LIKE '%Alpha 2000%';

UPDATE "Organization"
SET "defaultEstablishment" = 'Siège Abidjan-Cocody'
WHERE "id" = 'org'
  AND "defaultEstablishment" = 'Siège Abidjan-Plateau';

-- Les factures déjà émises conservent l'établissement sous lequel elles ont été
-- certifiées : une facture est un document figé, on ne réécrit pas son passé.
-- Seules les factures encore au brouillon suivent la nouvelle valeur.
UPDATE "Invoice"
SET "establishment" = 'Siège Abidjan-Cocody'
WHERE "status" = 'BROUILLON'
  AND "establishment" = 'Siège Abidjan-Plateau';
