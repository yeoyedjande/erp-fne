-- Coordonnées officielles de Markel Technology.
--
-- L'e-mail, le téléphone et le domaine des comptes internes avaient été
-- inventés faute d'information. L'e-mail et le téléphone figurent sur chaque
-- facture ; le domaine sert d'identifiant de connexion.
--
-- Comme pour l'adresse, le WHERE sur l'ancienne valeur évite d'écraser une
-- donnée déjà corrigée depuis l'administration.

UPDATE "Organization"
SET "email"   = 'info@markel-tech.com',
    "phone"   = '+225 05 46 58 03 17',
    "website" = 'https://markel-tech.com'
WHERE "id" = 'org'
  AND "email" = 'contact@markel-technology.ci';

-- Comptes internes : bascule du domaine inventé vers le domaine réel.
-- Les comptes clients, hébergés chez leurs propres sociétés, ne sont pas touchés.
UPDATE "User"
SET "email" = replace("email", '@markel-technology.ci', '@markel-tech.com')
WHERE "email" LIKE '%@markel-technology.ci';

