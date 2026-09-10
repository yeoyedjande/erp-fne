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
    fne: { mode: string; cleConfiguree: boolean };
    latenceMs: number;
    message?: string;
  } = {
    statut: "hors-service",
    base: { urlPresente: Boolean(process.env.DATABASE_URL), joignable: false, migree: false, peuplee: false },
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
