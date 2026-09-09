"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function PrintButton() {
  const router = useRouter();
  return (
    <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-surface px-3.5 text-base text-ink-2 transition-colors hover:bg-surface-2"
      >
        <Icon name="chevronLeft" size={15} />
        Retour
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-brand bg-brand px-3.5 text-base font-medium text-white transition-colors hover:bg-brand-2"
      >
        <Icon name="print" size={15} />
        Imprimer ou enregistrer en PDF
      </button>
    </div>
  );
}
