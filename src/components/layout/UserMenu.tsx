"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";

export function UserMenu({
  name, email, roleLabel, accent, isAdmin, signOutAction,
}: {
  name: string; email: string; roleLabel: string; accent: string;
  isAdmin: boolean; signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button" onClick={() => setOpen((v) => !v)}
        aria-expanded={open} aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md border border-transparent px-1.5 py-1 transition-colors hover:bg-surface-2"
      >
        <Avatar name={name} accent={accent} size={28} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[9rem] truncate text-sm font-medium text-ink">{name}</span>
          <span className="block text-2xs uppercase tracking-wider text-ink-4">{roleLabel}</span>
        </span>
        <Icon name="chevronDown" size={14} className="text-ink-4" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border border-line bg-surface p-1.5 shadow-2">
          <div className="border-b border-line px-2.5 pb-3 pt-2">
            <p className="text-base font-medium text-ink">{name}</p>
            <p className="mt-0.5 truncate text-sm text-ink-3">{email}</p>
          </div>

          {isAdmin && (
            <Link href="/administration" onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-2.5 rounded px-2.5 py-2 text-base text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
              <Icon name="settings" size={16} className="text-ink-4" />
              Administration
            </Link>
          )}
          <Link href="/" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded px-2.5 py-2 text-base text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
            <Icon name="external" size={16} className="text-ink-4" />
            Voir le site public
          </Link>

          <form action={signOutAction} className="mt-1 border-t border-line pt-1">
            <button type="submit"
              className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-base text-ink-2 transition-colors hover:bg-danger-soft hover:text-danger">
              <Icon name="logout" size={16} />
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
