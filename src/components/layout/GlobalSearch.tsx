"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/** Recherche transverse — « / » place le curseur, Entrée ouvre les résultats. */
export function GlobalSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(params.get("q") ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) router.push(`/recherche?q=${encodeURIComponent(value.trim())}`);
      }}
      className="relative hidden w-full max-w-sm md:block"
      role="search"
    >
      <Icon
        name="search" size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"
      />
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Rechercher une société, une facture, un ticket…"
        aria-label="Recherche transverse"
        className="field h-9 pl-9 pr-9 text-sm"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line-2 bg-surface-2 px-1.5 py-0.5 font-mono text-2xs text-ink-4">
        /
      </kbd>
    </form>
  );
}
