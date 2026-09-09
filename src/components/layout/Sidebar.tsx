"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import type { NavGroup } from "@/lib/navigation";

/**
 * Attention au positionnement : tout élément `position: fixed` de ce fichier
 * doit rester hors de l'en-tête. Celui-ci porte `backdrop-blur`, et un ancêtre
 * avec backdrop-filter devient bloc conteneur de ses descendants fixes — la
 * barre latérale serait alors réduite à la hauteur de l'en-tête. Le tiroir
 * mobile passe donc par un portail vers `document.body`.
 */

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavContent({
  groups, stickerBalance, onNavigate,
}: { groups: NavGroup[]; stickerBalance: number; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col">
      <div className="flex h-[--topbar-h] shrink-0 items-center gap-2.5 border-b border-line px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white">
          <Icon name="code" size={16} strokeWidth={2} />
        </span>
        <span className="leading-tight">
          <span className="block font-display text-md font-semibold text-ink">Markel</span>
          <span className="block text-2xs uppercase tracking-[0.14em] text-ink-4">Technology</span>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="eyebrow mb-1.5 px-2.5">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded px-2.5 py-2 text-base transition-colors duration-150",
                        active
                          ? "bg-brand-soft font-medium text-brand"
                          : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      <Icon name={item.icon} size={16} className={active ? "text-brand" : "text-ink-4"} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Stock de stickers — l'information la plus critique du produit */}
      <div className="shrink-0 border-t border-line p-3">
        <Link
          href="/conformite-fne"
          onClick={onNavigate}
          className="block rounded-md border border-gold-2/30 bg-gold-soft p-3 transition-[filter] hover:brightness-[0.985]"
        >
          <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-gold">
            <Icon name="seal" size={13} />
            Stickers FNE
          </p>
          <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-ink">
            {stickerBalance}
          </p>
          <p className="text-xs text-ink-3">certifications restantes</p>
        </Link>
      </div>
    </nav>
  );
}

/** Panneau fixe — à monter à la racine de la mise en page, jamais dans l'en-tête. */
export function SidebarDesktop({
  groups, stickerBalance,
}: { groups: NavGroup[]; stickerBalance: number }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[--sidebar-w] border-r border-line bg-surface lg:block">
      <NavContent groups={groups} stickerBalance={stickerBalance} />
    </aside>
  );
}

/** Déclencheur dans l'en-tête, tiroir rendu par portail vers document.body. */
export function SidebarMobile({
  groups, stickerBalance,
}: { groups: NavGroup[]; stickerBalance: number }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const drawer = (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink/25" onClick={() => setOpen(false)} aria-hidden />
      <div className="absolute inset-y-0 left-0 w-[min(84vw,var(--sidebar-w))] border-r border-line bg-surface shadow-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer la navigation"
          className="absolute right-2 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded text-ink-3 hover:bg-surface-2"
        >
          <Icon name="x" size={16} />
        </button>
        <NavContent groups={groups} stickerBalance={stickerBalance} onNavigate={() => setOpen(false)} />
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir la navigation"
        aria-expanded={open}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-2 text-ink-2 transition-colors hover:bg-surface-2 lg:hidden"
      >
        <Icon name="menu" size={17} />
      </button>

      {open && mounted && createPortal(drawer, document.body)}
    </>
  );
}
