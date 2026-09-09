"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./ui/Icon";

/** Filtres pilotés par l'URL : partageables, restaurés au rechargement. */
export function Filters({
  search = true,
  searchPlaceholder = "Rechercher…",
  selects = [],
}: {
  search?: boolean;
  searchPlaceholder?: string;
  selects?: Array<{ name: string; label: string; options: Array<{ value: string; label: string }> }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const update = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const active = [...params.keys()].filter((k) => params.get(k)).length > 0;

  return (
    <div className={cn("mb-5 flex flex-wrap items-center gap-2.5", pending && "opacity-60")}>
      {search && (
        <div className="relative min-w-[15rem] flex-1 sm:max-w-xs">
          <Icon
            name="search" size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"
          />
          <input
            defaultValue={params.get("q") ?? ""}
            onChange={(e) => update("q", e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="field h-9 pl-9 text-sm"
          />
        </div>
      )}

      {selects.map((s) => (
        <select
          key={s.name}
          aria-label={s.label}
          defaultValue={params.get(s.name) ?? ""}
          onChange={(e) => update(s.name, e.target.value)}
          className="field h-9 w-auto min-w-[10rem] appearance-none pr-8 text-sm"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B655C' stroke-width='1.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
            backgroundSize: "16px",
          }}
        >
          <option value="">{s.label}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}

      {active && (
        <button
          type="button"
          onClick={() => start(() => router.replace(pathname, { scroll: false }))}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Icon name="x" size={14} />
          Réinitialiser
        </button>
      )}
    </div>
  );
}
