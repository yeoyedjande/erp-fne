"use client";

import { useState } from "react";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/ui/Icon";
import { PIPELINE_ORDER, STAGE_LABELS } from "@/lib/business";
import type { moveStageAction } from "./actions";

export function StageMover({
  action, opportunityId, current,
}: {
  action: typeof moveStageAction;
  opportunityId: string;
  current: string;
}) {
  const [stage, setStage] = useState(current);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-ink-3 transition-colors hover:text-brand"
      >
        <Icon name="arrowRight" size={12} />
        Déplacer
      </button>
    );
  }

  return (
    <ActionForm action={action} hidden={{ opportunityId }} className="mt-2.5">
      <select
        name="stage" value={stage} onChange={(e) => setStage(e.target.value)}
        aria-label="Nouvelle étape"
        className="field h-8 w-full text-xs"
      >
        {PIPELINE_ORDER.map((s) => (
          <option key={s} value={s}>{STAGE_LABELS[s]}</option>
        ))}
      </select>

      {stage === "PERDU" && (
        <input
          name="lostReason" required placeholder="Raison de la perte"
          aria-label="Raison de la perte"
          className="field mt-1.5 h-8 text-xs"
        />
      )}

      <div className="mt-1.5 flex gap-1.5">
        <Submit size="sm">Valider</Submit>
        <button
          type="button"
          onClick={() => { setOpen(false); setStage(current); }}
          className="inline-flex h-8 items-center rounded-md px-2 text-xs text-ink-3 hover:bg-surface-2"
        >
          Annuler
        </button>
      </div>
    </ActionForm>
  );
}
