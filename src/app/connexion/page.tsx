import Link from "next/link";
import { Wordmark } from "@/components/PublicChrome";
import { Icon } from "@/components/ui/Icon";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const { suite = "" } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 sm:px-8">
          <Wordmark />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-base text-ink-3 transition-colors hover:text-brand"
          >
            <Icon name="chevronLeft" size={14} />
            Retour au site
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-content px-4 py-12 sm:px-8 lg:py-16">
          <LoginForm suite={suite} />
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-ink-4 sm:px-8">
          <p>© {new Date().getFullYear()} Markel Technology SARL</p>
          <p className="font-mono text-xs tabular-nums">NCC 2418562M</p>
        </div>
      </footer>
    </div>
  );
}
