"use client";

import { useState } from "react";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/ui/Icon";
import { ROLE_LABELS } from "@/lib/permissions";
import type {
  resetPasswordAction, setUserRoleAction, toggleUserActiveAction,
  updateContentAction, updateSettingAction,
} from "./actions";

export function RoleSelector({
  action, userId, current, disabled,
}: {
  action: typeof setUserRoleAction; userId: string; current: string; disabled?: boolean;
}) {
  return (
    <ActionForm action={action} hidden={{ userId }} className="flex items-center gap-1.5">
      <select
        name="role" defaultValue={current} disabled={disabled}
        aria-label="Rôle de l'utilisateur"
        className="field h-8 w-auto min-w-[9.5rem] text-xs"
      >
        {Object.entries(ROLE_LABELS).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <Submit size="sm" variant="secondary" disabled={disabled}>OK</Submit>
    </ActionForm>
  );
}

export function ToggleActive({
  action, userId, active, disabled,
}: {
  action: typeof toggleUserActiveAction; userId: string; active: boolean; disabled?: boolean;
}) {
  return (
    <ActionForm action={action} hidden={{ userId }}>
      <Submit size="sm" variant={active ? "danger" : "secondary"} disabled={disabled}>
        {active ? "Désactiver" : "Réactiver"}
      </Submit>
    </ActionForm>
  );
}

export function PasswordReset({
  action, userId, name,
}: { action: typeof resetPasswordAction; userId: string; name: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <Icon name="lock" size={12} />
        Mot de passe
      </button>
    );
  }

  return (
    <ActionForm action={action} hidden={{ userId }} className="min-w-[16rem]">
      <label className="mb-1 block text-xs text-ink-3">
        Nouveau mot de passe de {name}
      </label>
      <div className="flex gap-1.5">
        <input
          name="password" type="text" minLength={10} required autoFocus
          placeholder="10 caractères minimum"
          aria-label="Nouveau mot de passe"
          className="field h-8 text-xs"
        />
        <Submit size="sm">Définir</Submit>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-8 items-center rounded-md px-2 text-xs text-ink-3 hover:bg-surface-2"
        >
          <Icon name="x" size={13} />
        </button>
      </div>
    </ActionForm>
  );
}

export function SettingRow({
  action, settingKey, label, value, group,
}: {
  action: typeof updateSettingAction;
  settingKey: string; label: string; value: string; group: string;
}) {
  return (
    <ActionForm
      action={action}
      hidden={{ key: settingKey }}
      className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-0"
    >
      <div className="min-w-0">
        <p className="text-base text-ink">{label}</p>
        <p className="font-mono text-2xs tracking-normal text-ink-4">{settingKey} · {group}</p>
      </div>
      <div className="flex gap-1.5">
        <input
          name="value" defaultValue={value} aria-label={label}
          className="field h-8 w-36 font-mono text-xs tabular-nums"
        />
        <Submit size="sm" variant="secondary">Enregistrer</Submit>
      </div>
    </ActionForm>
  );
}

export function ContentEditor({
  action, page,
}: {
  action: typeof updateContentAction;
  page: { id: string; slug: string; title: string; subtitle: string | null; body: string };
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="border-b border-line py-3 last:border-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-medium text-ink">{page.title}</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-ink-3">{page.body}</p>
            <p className="mt-1 font-mono text-2xs tracking-normal text-ink-4">{page.slug}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line-2 px-2.5 text-xs text-ink-2 transition-colors hover:bg-surface-2"
          >
            <Icon name="edit" size={12} />
            Modifier
          </button>
        </div>
      </div>
    );
  }

  return (
    <ActionForm
      action={action}
      hidden={{ id: page.id }}
      className="space-y-2.5 border-b border-line py-4 last:border-0"
    >
      <input
        name="title" defaultValue={page.title} required
        aria-label="Titre" className="field font-medium"
      />
      <input
        name="subtitle" defaultValue={page.subtitle ?? ""}
        aria-label="Sous-titre" placeholder="Sous-titre" className="field text-sm"
      />
      <textarea
        name="body" defaultValue={page.body} required rows={5}
        aria-label="Contenu" className="field resize-y text-sm"
      />
      <div className="flex gap-2">
        <Submit size="sm" icon="check">Publier</Submit>
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
