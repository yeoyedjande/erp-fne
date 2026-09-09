"use client";

import { useState } from "react";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/ui/Icon";
import type { certifyBatchAction, setStickerBalanceAction } from "./actions";

export function BatchCertify({
  action, count,
}: { action: typeof certifyBatchAction; count: number }) {
  return (
    <ActionForm action={action}>
      <Submit
        icon="seal" variant="gold" disabled={count === 0}
        pendingLabel="Transmission séquentielle à la DGI…"
      >
        {count > 1 ? `Certifier les ${count} factures en attente` : "Certifier la facture en attente"}
      </Submit>
    </ActionForm>
  );
}

export function StickerBalanceForm({
  action, current,
}: { action: typeof setStickerBalanceAction; current: number }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-2 bg-surface px-3 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2"
      >
        <Icon name="edit" size={13} />
        Ajuster le solde
      </button>
    );
  }

  return (
    <ActionForm action={action} className="w-full">
      <p className="mb-2 text-sm leading-relaxed text-ink-3">
        Le rechargement s&apos;effectue sur votre espace FNE. Reportez ici le solde
        affiché par la DGI pour que la plateforme reste synchronisée.
      </p>
      <div className="flex gap-2">
        <input
          name="balance" type="number" min={0} max={100000} required
          defaultValue={current} aria-label="Nouveau solde de stickers"
          className="field h-8 w-32 font-mono text-sm tabular-nums"
        />
        <Submit size="sm">Enregistrer</Submit>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-8 items-center rounded-md px-2.5 text-xs text-ink-3 hover:bg-surface-2"
        >
          Annuler
        </button>
      </div>
    </ActionForm>
  );
}

/** Inspecteur de charge utile — replie le JSON échangé avec la DGI. */
export function PayloadInspector({
  request, response,
}: { request: unknown; response: unknown }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
      >
        <Icon name={open ? "chevronDown" : "chevronRight"} size={12} />
        {open ? "Masquer" : "Inspecter"} la requête et la réponse
      </button>

      {open && (
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          {[
            { label: "Requête envoyée", value: request },
            { label: "Réponse de la plateforme", value: response },
          ].map((b) => (
            <div key={b.label} className="min-w-0 rounded border border-line bg-surface-2/70 p-2.5">
              <p className="eyebrow mb-1.5">{b.label}</p>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-2xs leading-relaxed tracking-normal text-ink-2">
                {JSON.stringify(b.value, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
