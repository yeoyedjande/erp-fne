"use client";

import { useState } from "react";
import { ActionForm, Submit } from "@/components/ActionForm";
import type { convertToInvoiceAction, decideQuoteAction } from "./actions";

export function QuoteDecision({
  action, quoteId, status,
}: { action: typeof decideQuoteAction; quoteId: string; status: string }) {
  const [refusing, setRefusing] = useState(false);

  if (refusing) {
    return (
      <ActionForm action={action} hidden={{ quoteId, decision: "REFUSE" }} className="w-full max-w-md">
        <input
          name="refusalReason" required autoFocus
          placeholder="Motif du refus (budget, concurrent, report…)"
          aria-label="Motif du refus"
          className="field"
        />
        <div className="mt-2 flex gap-2">
          <Submit variant="danger" size="sm">Confirmer le refus</Submit>
          <button
            type="button"
            onClick={() => setRefusing(false)}
            className="inline-flex h-8 items-center rounded-md px-2.5 text-xs text-ink-3 hover:bg-surface-2"
          >
            Annuler
          </button>
        </div>
      </ActionForm>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "BROUILLON" && (
        <ActionForm action={action} hidden={{ quoteId, decision: "ENVOYE" }}>
          <Submit icon="mail" variant="primary">Marquer comme envoyé</Submit>
        </ActionForm>
      )}
      {status === "ENVOYE" && (
        <>
          <ActionForm action={action} hidden={{ quoteId, decision: "ACCEPTE" }}>
            <Submit icon="check" variant="primary">Devis accepté</Submit>
          </ActionForm>
          <button
            type="button"
            onClick={() => setRefusing(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-danger/30 bg-surface px-3.5 text-base font-medium text-danger transition-colors hover:bg-danger-soft"
          >
            Devis refusé
          </button>
        </>
      )}
    </div>
  );
}

export function ConvertToInvoice({
  action, quoteId,
}: { action: typeof convertToInvoiceAction; quoteId: string }) {
  return (
    <ActionForm action={action} hidden={{ quoteId }}>
      <Submit icon="invoice" variant="primary" pendingLabel="Création de la facture…">
        Convertir en facture
      </Submit>
    </ActionForm>
  );
}
