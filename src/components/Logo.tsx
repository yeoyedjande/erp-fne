import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Marque Markel Technology.
 *
 * ⚠️ `public/logo-markel.svg` est un SUBSTITUT. Le logo officiel m'a été montré
 * mais son fichier n'a jamais atteint le disque : je n'ai pu ni en extraire les
 * couleurs exactes, ni en reproduire fidèlement le monogramme manuscrit.
 *
 * Pour le remplacer : déposer le fichier vectoriel officiel sous
 * `public/logo-markel.svg` (même nom, même chemin). Aucun code à modifier —
 * toute la plateforme le reprendra : vitrine, back-office, page de connexion,
 * portail client et en-tête des factures imprimées.
 *
 * Si l'original n'existe qu'en PNG, le déposer sous `public/logo-markel.png`
 * et changer l'extension dans `SOURCE` ci-dessous.
 */
const SOURCE = "/logo-markel.svg";

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <img
      src={SOURCE}
      alt="Markel Technology"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Marque complète : symbole + raison sociale sur deux lignes. */
export function Wordmark({
  href = "/", tone = "ink", size = 32,
}: { href?: string | null; tone?: "ink" | "invert"; size?: number }) {
  const contenu = (
    <>
      <LogoMark size={size} />
      <span className="leading-tight">
        <span
          className={cn(
            "block font-display font-semibold",
            size >= 32 ? "text-md" : "text-base",
            tone === "invert" ? "text-white" : "text-ink",
          )}
        >
          Markel
        </span>
        <span
          className={cn(
            "block text-2xs uppercase tracking-[0.14em]",
            tone === "invert" ? "text-white/60" : "text-ink-4",
          )}
        >
          Technology
        </span>
      </span>
    </>
  );

  if (!href) return <span className="inline-flex items-center gap-2.5">{contenu}</span>;

  return (
    <Link href={href} className="inline-flex items-center gap-2.5">
      {contenu}
    </Link>
  );
}
