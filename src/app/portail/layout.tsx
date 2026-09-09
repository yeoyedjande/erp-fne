import Link from "next/link";
import { signOut } from "@/auth";
import { requirePortalUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/PublicChrome";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePortalUser();
  const company = await prisma.company.findUnique({
    where: { id: user.clientCompanyId },
    select: { name: true },
  });

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/connexion" });
  }

  const links = [
    { href: "/portail", label: "Aperçu", icon: "dashboard" as const },
    { href: "/portail/factures", label: "Mes factures", icon: "invoice" as const },
    { href: "/portail/tickets", label: "Mes demandes", icon: "lifebuoy" as const },
    { href: "/portail/projets", label: "Mes projets", icon: "folder" as const },
  ];

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Wordmark />
            <span className="hidden h-6 w-px bg-line sm:block" />
            <span className="hidden text-sm text-ink-3 sm:block">Espace client</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-sm font-medium text-ink">{user.name}</span>
              <span className="block text-xs text-ink-4">{company?.name}</span>
            </span>
            <Avatar name={user.name} accent={user.accentToken} size={30} />
            <form action={doSignOut}>
              <button
                type="submit"
                aria-label="Se déconnecter"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line-2 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <Icon name="logout" size={16} />
              </button>
            </form>
          </div>
        </div>

        <nav className="mx-auto max-w-content px-4 sm:px-8">
          <ul className="-mb-px flex gap-1 overflow-x-auto">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-base text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
                >
                  <Icon name={l.icon} size={15} className="text-ink-4" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-content px-4 py-8 sm:px-8">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-ink-4 sm:px-8">
          <p>Markel Technology SARL — Espace client</p>
          <Link href="/verification" className="hover:text-brand">
            Vérifier une facture certifiée
          </Link>
        </div>
      </footer>
    </div>
  );
}
