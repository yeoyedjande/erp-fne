"use client";

import { useState } from "react";
import { ActionForm, Submit } from "@/components/ActionForm";
import { TICKET_STATUS } from "@/lib/business";
import type { replyTicketAction, setTicketStatusAction } from "./actions";

export function ReplyForm({
  action, ticketId,
}: { action: typeof replyTicketAction; ticketId: string }) {
  const [internal, setInternal] = useState(false);

  return (
    <ActionForm action={action} hidden={{ ticketId }} className="space-y-3">
      <textarea
        name="body" required rows={4}
        placeholder={internal ? "Note visible uniquement par l'équipe Markel…" : "Votre réponse au client…"}
        aria-label="Message"
        className="field resize-y"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox" name="internal" checked={internal}
            onChange={(e) => setInternal(e.target.checked)}
            className="h-4 w-4 rounded border-line-2 accent-[color:var(--brand)]"
          />
          Note interne — invisible depuis le portail client
        </label>
        <Submit icon="mail">{internal ? "Ajouter la note" : "Répondre"}</Submit>
      </div>
    </ActionForm>
  );
}

export function StatusSwitcher({
  action, ticketId, current,
}: { action: typeof setTicketStatusAction; ticketId: string; current: string }) {
  return (
    <ActionForm action={action} hidden={{ ticketId }} className="flex flex-wrap gap-2">
      <select
        name="status" defaultValue={current} aria-label="Statut du ticket"
        className="field h-9 w-auto min-w-[12rem] text-sm"
      >
        {Object.entries(TICKET_STATUS).map(([v, m]) => (
          <option key={v} value={v}>{m.label}</option>
        ))}
      </select>
      <Submit variant="secondary">Mettre à jour</Submit>
    </ActionForm>
  );
}
