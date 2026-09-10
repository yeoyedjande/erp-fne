"use client";

import { useEffect } from "react";

/**
 * En production, Next masque le message d'erreur et ne laisse qu'un « digest ».
 * Cette page donne à l'exploitant de quoi agir plutôt qu'un identifiant opaque.
 */
export default function Error({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Erreur serveur :", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-16">
      <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-4">
        Erreur serveur
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">
        L&apos;application n&apos;a pas pu répondre
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-3">
        Cette page dépend de la base de données. Si le déploiement vient
        d&apos;être créé, la cause la plus fréquente est une base non reliée ou
        des migrations non appliquées.
      </p>

      <div className="mt-6 rounded-md border border-line bg-surface p-4">
        <p className="text-sm font-medium text-ink">Vérifier en une requête</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-3">
          Ouvrez <code className="font-mono text-xs text-brand">/etat</code> : ce
          point de contrôle indique si <code className="font-mono text-xs">DATABASE_URL</code>{" "}
          est définie, si la base répond, si le schéma est migré et si le jeu de
          démonstration est chargé.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-9 items-center rounded-md border border-brand bg-brand px-3.5 text-base font-medium text-white transition-colors hover:bg-brand-2"
        >
          Réessayer
        </button>
        <a
          href="/etat"
          className="inline-flex h-9 items-center rounded-md border border-line-2 bg-surface px-3.5 text-base text-ink-2 transition-colors hover:bg-surface-2"
        >
          Voir le diagnostic
        </a>
      </div>

      {error.digest && (
        <p className="mt-8 font-mono text-xs text-ink-4">
          Référence pour les journaux : {error.digest}
        </p>
      )}
    </main>
  );
}
