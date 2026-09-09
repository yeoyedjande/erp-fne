"use client";

import { useState } from "react";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/ui/Icon";
import { PAYMENT_METHOD_LABELS } from "@/lib/fne/constants";
import { formatXOF } from "@/lib/format";
import type { certifyAction, createCreditNoteAction, issueInvoiceAction, recordPaymentAction } from "../actions";

export function IssueForm({
  action, invoiceId,
}: { action: typeof issueInvoiceAction; invoiceId: string }) {
  return (
    <ActionForm action={action} hidden={{ invoiceId }}>
      <Submit icon="check" variant="secondary">Émettre la facture</Submit>
    </ActionForm>
  );
}

export function CertifyForm({
  action, invoiceId, disabled,
}: { action: typeof certifyAction; invoiceId: string; disabled?: boolean }) {
  return (
    <ActionForm action={action} hidden={{ invoiceId }}>
      <Submit icon="seal" variant="gold" pendingLabel="Transmission à la DGI…" disabled={disabled}>
        Certifier auprès de la DGI
      </Submit>
    </ActionForm>
  );
}

export function PaymentForm({
  action, invoiceId, remaining,
}: { action: typeof recordPaymentAction; invoiceId: string; remaining: number }) {
  const [amount, setAmount] = useState(String(remaining));

  return (
    <ActionForm action={action} hidden={{ invoiceId }} className="space-y-3">
      <div>
        <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-ink-2">
          Montant reçu
        </label>
        <div className="flex gap-2">
          <input
            id="amount" name="amount" type="number" min={1} max={remaining} required
            value={amount} onChange={(e) => setAmount(e.target.value)}
            className="field font-mono tabular-nums"
          />
          <button
            type="button"
            onClick={() => setAmount(String(remaining))}
            className="shrink-0 rounded-md border border-line-2 px-3 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2"
          >
            Solde
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-4">Reste dû : {formatXOF(remaining)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="method" className="mb-1.5 block text-sm font-medium text-ink-2">
            Moyen de paiement
          </label>
          <select id="method" name="method" defaultValue="TRANSFER" className="field">
            {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="paidAt" className="mb-1.5 block text-sm font-medium text-ink-2">
            Date de règlement
          </label>
          <input
            id="paidAt" name="paidAt" type="date"
            defaultValue={new Date().toISOString().slice(0, 10)} className="field"
          />
        </div>
      </div>

      <div>
        <label htmlFor="reference" className="mb-1.5 block text-sm font-medium text-ink-2">
          Référence <span className="font-normal text-ink-4">(facultatif)</span>
        </label>
        <input id="reference" name="reference" placeholder="VIR-2026-0142" className="field font-mono text-sm" />
      </div>

      <Submit icon="plus" full>Enregistrer le règlement</Submit>
    </ActionForm>
  );
}

export function CreditNoteForm({
  action, invoiceId,
}: { action: typeof createCreditNoteAction; invoiceId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-danger/30 bg-surface px-3.5 text-base font-medium text-danger transition-colors hover:bg-danger-soft"
      >
        <Icon name="refresh" size={15} />
        Émettre un avoir
      </button>
    );
  }

  return (
    <ActionForm action={action} hidden={{ invoiceId }} className="rounded-md border border-danger/25 bg-danger-soft/50 p-4">
      <p className="text-base font-medium text-ink">Facture d&apos;avoir</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-3">
        L&apos;avoir porte sur la totalité des lignes et sera transmis à la plateforme FNE
        (API #2, <span className="font-mono text-xs">/invoices/&#123;id&#125;/refund</span>).
        Cette opération consomme un sticker électronique et ne peut pas être annulée.
      </p>

      <div className="mt-3">
        <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-ink-2">
          Motif de l&apos;avoir
        </label>
        <textarea
          id="reason" name="reason" required rows={3}
          placeholder="Prestation non réalisée, erreur de facturation, remise commerciale accordée après coup…"
          className="field resize-y"
        />
      </div>

      <div className="mt-3 flex gap-2">
        <Submit icon="refresh" variant="danger" pendingLabel="Transmission à la DGI…">
          Confirmer et certifier l&apos;avoir
        </Submit>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-9 items-center rounded-md border border-line-2 px-3.5 text-base text-ink-2 transition-colors hover:bg-surface-2"
        >
          Annuler
        </button>
      </div>
    </ActionForm>
  );
}
