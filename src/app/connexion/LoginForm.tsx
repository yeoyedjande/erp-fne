"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { login, type LoginState } from "./actions";

const DEMO_ACCOUNTS = [
  { email: "admin@markel-tech.com", password: "Admin2026!", name: "Yédjané Yeo", role: "Super Admin", scope: "Accès total, administration et clé API FNE" },
  { email: "gestion@markel-tech.com", password: "Gestion2026!", name: "Aïcha Koné", role: "Gestionnaire", scope: "Tout le métier, certification FNE comprise" },
  { email: "commercial@markel-tech.com", password: "Commercial2026!", name: "Bakary Traoré", role: "Commercial", scope: "Sociétés, pipeline, devis, activités" },
  { email: "support@markel-tech.com", password: "Support2026!", name: "Fatou Diallo", role: "Support", scope: "Tickets et suivi des engagements de service" },
  { email: "client@nsia-banque.ci", password: "Client2026!", name: "Marc-Aurèle N'Guessan", role: "Client", scope: "Portail client, périmètre NSIA Banque uniquement" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-brand bg-brand px-5 text-md font-medium text-white transition-colors hover:bg-brand-2 disabled:opacity-60"
    >
      {pending ? "Connexion en cours…" : "Se connecter"}
      {!pending && <Icon name="arrowRight" size={17} />}
    </button>
  );
}

export function LoginForm({ suite }: { suite: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});
  const [email, setEmail] = useState("admin@markel-tech.com");
  const [password, setPassword] = useState("Admin2026!");
  const [reveal, setReveal] = useState(false);

  return (
    <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-14">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Connexion</h1>
        <p className="mt-1.5 text-base text-ink-3">
          Accédez à la plateforme de gestion Markel Technology.
        </p>

        <form action={formAction} className="mt-7 space-y-4">
          <input type="hidden" name="suite" value={suite} />

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-2">
              Adresse e-mail
            </label>
            <input
              id="email" name="email" type="email" required autoComplete="username"
              value={email} onChange={(e) => setEmail(e.target.value)} className="field"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password" name="password" type={reveal ? "text" : "password"} required
                autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} className="field pr-10"
              />
              <button
                type="button" onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-4 transition-colors hover:text-ink-2"
              >
                <Icon name="eye" size={16} />
              </button>
            </div>
          </div>

          {state.error && (
            <div
              role="alert"
              className={
                state.infrastructure
                  ? "rounded-md border border-warning/20 bg-warning-soft px-3.5 py-3 text-base text-warning"
                  : "rounded-md border border-danger/15 bg-danger-soft px-3.5 py-2.5 text-base text-danger"
              }
            >
              <p className="flex items-start gap-2">
                <Icon name="warning" size={16} className="mt-0.5 shrink-0" />
                <span>{state.error}</span>
              </p>
              {state.infrastructure && (
                <a
                  href="/etat"
                  className="mt-2 inline-flex items-center gap-1 pl-6 text-sm font-medium underline"
                >
                  Voir le diagnostic
                  <Icon name="arrowRight" size={13} />
                </a>
              )}
            </div>
          )}

          <SubmitButton />
        </form>
      </div>

      <div className="lg:border-l lg:border-line lg:pl-14">
        <p className="eyebrow">Comptes de démonstration</p>
        <p className="mt-2 max-w-prose text-base text-ink-3">
          Cliquez sur un compte pour préremplir le formulaire. Chaque rôle voit un
          périmètre différent — c&apos;est vérifié côté serveur sur chaque page et
          chaque action.
        </p>

        <ul className="mt-5 grid gap-2.5">
          {DEMO_ACCOUNTS.map((a) => {
            const active = a.email === email;
            return (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => { setEmail(a.email); setPassword(a.password); }}
                  className={`w-full rounded-md border p-3.5 text-left transition-colors duration-150 ${
                    active
                      ? "border-brand bg-brand-soft"
                      : "border-line bg-surface hover:border-line-2 hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink">{a.name}</span>
                    <span
                      className={`rounded border px-2 py-0.5 text-xs font-medium ${
                        active
                          ? "border-brand/20 bg-surface text-brand"
                          : "border-line-2 bg-surface-2 text-ink-3"
                      }`}
                    >
                      {a.role}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-3">{a.scope}</p>
                  <p className="mt-2 font-mono text-xs text-ink-4">
                    {a.email} · {a.password}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-xs leading-relaxed text-ink-4">
          Ces mots de passe sont assumés pour un environnement de démonstration.
          Changez-les avant tout usage réel — la procédure est décrite dans le README.
        </p>
      </div>
    </div>
  );
}
