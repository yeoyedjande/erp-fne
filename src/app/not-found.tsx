import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-4">Erreur 404</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">Page introuvable</h1>
      <p className="mt-3 max-w-prose text-base text-ink-3">
        Le lien que vous avez suivi ne correspond à aucune page de la plateforme. Il a
        peut-être été déplacé, ou l&apos;élément auquel il renvoyait a été supprimé.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <LinkButton href="/tableau-de-bord" icon="dashboard">Retour au tableau de bord</LinkButton>
        <LinkButton href="/" variant="secondary">Voir le site public</LinkButton>
      </div>
    </main>
  );
}
