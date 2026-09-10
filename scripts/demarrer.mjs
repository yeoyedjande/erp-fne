/**
 * Démarrage de production.
 *
 * Railway n'a pas exécuté le `preDeployCommand` déclaré dans railway.json :
 * l'application est partie sur une base vierge et toutes les requêtes Prisma
 * ont échoué. Les migrations sont donc jouées ici, dans la commande de
 * démarrage, qui est le seul point d'entrée dont l'exécution est garantie
 * quelle que soit la plateforme.
 *
 * Séquence :
 *   1. vérifier que DATABASE_URL est présente ;
 *   2. appliquer les migrations (`prisma migrate deploy`, idempotent) ;
 *   3. charger le jeu de démonstration si la base est vide ;
 *   4. démarrer Next.js.
 *
 * Toute erreur d'infrastructure interrompt le démarrage avec un code non nul,
 * pour que la plateforme signale un déploiement en échec plutôt que de servir
 * une application inutilisable.
 */

import { spawn } from "node:child_process";

const PORT = process.env.PORT || "3000";

function run(command, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n▸ ${label}`);
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${label} — code de sortie ${code}`)),
    );
  });
}

function echec(titre, details) {
  console.error(`\n✖ ${titre}\n`);
  for (const ligne of details) console.error(`  ${ligne}`);
  console.error("");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  echec("DATABASE_URL n'est pas définie", [
    "L'ajout d'une base PostgreSQL au projet ne suffit pas : Railway n'injecte",
    "pas automatiquement ses variables dans les autres services.",
    "",
    "Dans le service applicatif → onglet Variables, ajoutez :",
    "",
    "    DATABASE_URL=${{Postgres.DATABASE_URL}}",
    "",
    "(remplacez « Postgres » par le nom exact de votre service de base).",
  ]);
}

if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  echec("AUTH_SECRET n'est pas défini", [
    "Sans ce secret, Auth.js ne peut ni signer ni vérifier les sessions : toute",
    "tentative de connexion échoue, y compris avec les bons identifiants.",
    "",
    "Dans le service applicatif → onglet Variables, ajoutez :",
    "",
    "    AUTH_SECRET=<sortie de : openssl rand -base64 32>",
    "    AUTH_TRUST_HOST=true",
  ]);
}

try {
  await run("npx", ["prisma", "migrate", "deploy"], "Application des migrations");
} catch (e) {
  echec("Les migrations ont échoué", [
    String(e.message),
    "",
    "Causes usuelles : DATABASE_URL pointe vers une base injoignable, ou les",
    "identifiants sont erronés. Vérifiez la référence de variable vers le",
    "service PostgreSQL.",
  ]);
}

// Jeu de démonstration : chargé uniquement si la base ne contient aucun compte.
// SEED_ON_DEPLOY=false le désactive explicitement, SEED_ON_DEPLOY=true le force.
const forcerSeed = process.env.SEED_ON_DEPLOY === "true";
const interdireSeed = process.env.SEED_ON_DEPLOY === "false";

if (!interdireSeed) {
  let baseVide = false;
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    baseVide = (await prisma.user.count()) === 0;
    await prisma.$disconnect();
  } catch (e) {
    console.warn(`  Impossible de vérifier l'état de la base : ${e.message}`);
  }

  if (forcerSeed || baseVide) {
    const raison = baseVide ? "base sans aucun compte" : "SEED_ON_DEPLOY=true";
    try {
      await run("npx", ["prisma", "db", "seed"], `Jeu de démonstration (${raison})`);
    } catch (e) {
      // Un seed en échec ne doit pas empêcher l'application de démarrer :
      // le schéma, lui, est en place.
      console.warn(`\n  Le seed a échoué (${e.message}). L'application démarre quand même.`);
    }
  }
}

console.log(`\n▸ Démarrage de Next.js sur le port ${PORT}\n`);
const serveur = spawn("npx", ["next", "start", "-p", PORT], {
  stdio: "inherit",
  env: process.env,
});
serveur.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => serveur.kill(signal));
}
