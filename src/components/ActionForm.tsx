"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./ui/Icon";

export interface ActionState {
  ok?: boolean;
  message?: string;
  reference?: string;
}

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const VARIANT = {
  primary: "bg-brand text-white border-brand hover:bg-brand-2",
  secondary: "bg-surface text-ink border-line-2 hover:bg-surface-2",
  gold: "bg-gold text-white border-gold hover:brightness-110",
  danger: "bg-surface text-danger border-danger/30 hover:bg-danger-soft",
} as const;

export function Submit({
  children, pendingLabel, icon, variant = "primary", size = "md", full, disabled,
}: {
  children: ReactNode; pendingLabel?: string; icon?: IconName;
  variant?: keyof typeof VARIANT; size?: "sm" | "md"; full?: boolean; disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55",
        size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-base",
        full && "w-full",
        VARIANT[variant],
      )}
    >
      {pending ? (
        <>
          <Icon name="refresh" size={15} className="animate-spin" />
          {pendingLabel ?? "En cours…"}
        </>
      ) : (
        <>
          {icon && <Icon name={icon} size={15} />}
          {children}
        </>
      )}
    </button>
  );
}

/**
 * Formulaire relié à une Server Action, avec restitution du résultat.
 * Toutes les écritures de la plateforme passent par ici.
 */
export function ActionForm({
  action, children, className, hidden,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className={className}>
      {hidden &&
        Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}

      {children}

      {state.message && (
        <p
          role="status"
          className={cn(
            "mt-3 flex items-start gap-2 rounded-md border px-3.5 py-2.5 text-base",
            state.ok
              ? "border-success/15 bg-success-soft text-success"
              : "border-danger/15 bg-danger-soft text-danger",
          )}
        >
          <Icon name={state.ok ? "check" : "warning"} size={16} className="mt-0.5 shrink-0" />
          <span>{state.message}</span>
        </p>
      )}
    </form>
  );
}
