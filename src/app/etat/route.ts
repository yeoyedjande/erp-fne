import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMode, hasApiKey } from "@/lib/fne/client";

export const dynamic = "force-dynamic";

/**
 * Point de contrôle d'exploitation.
 *
 * Répond 200 quand l'application est réellement utilisable, 503 sinon, avec un
 * diagnostic lisible. Aucune donnée sensible n'est exposée : ni l'URL de la
 * base, ni la clé API FNE — seulement leur présence.
 */
export async function GET() {
  const debut = Date.now();

  const diagnostic: {
    statut: "ok" | "degrade" | "hors-service";
    base: { urlPresente: boolean; joignable: boolean; migree: boolean; peuplee: boolean };
    auth: { secretPresent: boolean; trustHost: boolean; urlPublique: string | null };
    deploiement: {
      commit: string | null;
      branche: string | null;
      depot: string | null;
      messageCommit: string | null;
    };
    fne: { mode: string; cleConfiguree: boolean };
    latenceMs: number;
    message?: string;
  } = {
    statut: "hors-service",
    base: { urlPresente: Boolean(process.env.DATABASE_URL), joignable: false, migree: false, peuplee: false },
    auth: {
      secretPresent: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
      trustHost: process.env.AUTH_TRUST_HOST === "true",
      urlPublique: process.env.NEXTAUTH_URL ?? null,
    },
    // Railway injecte ces variables au build. Elles disent quel commit tourne
    // réellement : le seul moyen de trancher entre « le code n'est pas déployé »
    // et « le code est déployé mais ne fait pas ce qu'on croit ».
    deploiement: {
      commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      branche: process.env.RAILWAY_GIT_BRANCH ?? null,
      depot: process.env.RAILWAY_GIT_REPO_OWNER && process.env.RAILWAY_GIT_REPO_NAME
        ? `${process.env.RAILWAY_GIT_REPO_OWNER}/${process.env.RAILWAY_GIT_REPO_NAME}`
        : null,
      messageCommit: process.env.RAILWAY_GIT_COMMIT_MESSAGE?.split("\n")[0] ?? null,
    },
    fne: { mode: getMode(), cleConfiguree: hasApiKey() },
    latenceMs: 0,
  };

  if (!diagnostic.base.urlPresente) {
    diagnostic.latenceMs = Date.now() - debut;
    diagnostic.message =
      "DATABASE_URL n'est pas définie. Dans le service applicatif, onglet Variables, " +
      "ajoutez une référence vers le service PostgreSQL : DATABASE_URL=${{Postgres.DATABASE_URL}}";
    return NextResponse.json(diagnostic, { status: 503 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    diagnostic.base.joignable = true;
  } catch {
    diagnostic.latenceMs = Date.now() - debut;
    diagnostic.message =
      "La base est injoignable. Vérifiez que la référence de variable pointe vers " +
      "un service PostgreSQL actif dans le même projet.";
    return NextResponse.json(diagnostic, { status: 503 });
  }

  try {
    const comptes = await prisma.user.count();
    diagnostic.base.migree = true;
    diagnostic.base.peuplee = comptes > 0;
    diagnostic.latenceMs = Date.now() - debut;

    if (!diagnostic.base.peuplee) {
      diagnostic.statut = "degrade";
      diagnostic.message =
        "Le schéma est en place mais aucun compte n'existe : le jeu de démonstration " +
        "n'a pas été chargé. Redéployez, ou lancez « npm run db:seed ».";
      return NextResponse.json(diagnostic, { status: 200 });
    }

    if (!diagnostic.auth.secretPresent) {
      diagnostic.statut = "degrade";
      diagnostic.message =
        "AUTH_SECRET n'est pas défini : aucune connexion ne peut aboutir, même avec " +
        "les bons identifiants. Ajoutez AUTH_SECRET (openssl rand -base64 32) et " +
        "AUTH_TRUST_HOST=true dans les variables du service.";
      return NextResponse.json(diagnostic, { status: 200 });
    }

    diagnostic.statut = "ok";
    return NextResponse.json(diagnostic, { status: 200 });
  } catch {
    diagnostic.latenceMs = Date.now() - debut;
    diagnostic.message =
      "La base répond mais le schéma est absent : les migrations n'ont pas été " +
      "appliquées. Elles sont jouées au démarrage — consultez les journaux de déploiement.";
    return NextResponse.json(diagnostic, { status: 503 });
  }
}
