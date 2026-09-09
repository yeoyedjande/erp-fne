"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  href: string | null;
  tone: string;
  createdAt: string;
}

const TONE: Record<string, string> = {
  info: "bg-brand", success: "bg-success",
  warning: "bg-warning", danger: "bg-danger",
};

export function NotificationBell({ items }: { items: NotificationItem[] }) {
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
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications (${items.length} non lues)`}
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-ink-2 transition-colors hover:bg-surface-2"
      >
        <Icon name="bell" size={17} />
        {items.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] font-semibold text-white">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border border-line bg-surface shadow-2">
          <p className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">
            Notifications
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-3">Rien de nouveau.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="border-b border-line last:border-0">
                  <Link
                    href={n.href ?? "#"}
                    onClick={() => setOpen(false)}
                    className="flex gap-2.5 px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE[n.tone] ?? TONE.info)} />
                    <span className="min-w-0">
                      <span className="block text-base font-medium text-ink">{n.title}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-ink-3">{n.body}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
