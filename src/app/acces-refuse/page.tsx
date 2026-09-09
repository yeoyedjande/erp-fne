import { LinkButton, Callout, Badge } from "@/components/ui";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import { requireUser } from "@/lib/auth-guard";
import type { Role } from "@prisma/client";

export const metadata = { title: "Accès refusé" };

export default async function AccessDenied() {
  const user = await requireUser();
  const role = user.role as Role;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-16">
      <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-4">Erreur 403</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">
        Cette page dépasse votre périmètre
      </h1>
      <p className="mt-3 text-base text-ink-3">
        Chaque page et chaque action de la plateforme vérifie votre rôle côté serveur.
        Votre compte n&apos;a pas les droits nécessaires pour celle-ci.
      </p>

      <div className="mt-6">
        <Callout tone="brand" icon="lock" title={`Votre rôle : ${ROLE_LABELS[role] ?? role}`}>
          {ROLE_DESCRIPTIONS[role] ?? "Rôle non reconnu."}
        </Callout>
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        <LinkButton href="/tableau-de-bord" icon="dashboard">Retour au tableau de bord</LinkButton>
        <LinkButton href="/" variant="secondary">Site public</LinkButton>
      </div>

      <p className="mt-8 text-sm text-ink-4">
        Connecté en tant que <Badge tone="neutral">{user.email}</Badge>. Si vous pensez
        qu&apos;il s&apos;agit d&apos;une erreur, contactez un Super Admin.
      </p>
    </main>
  );
}
