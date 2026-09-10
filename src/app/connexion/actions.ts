"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export interface LoginState {
  error?: string;
  /** true lorsque la cause est une panne d'infrastructure, pas une saisie. */
  infrastructure?: boolean;
}

/**
 * Auth.js range sous la même classe `AuthError` les identifiants refusés ET les
 * pannes d'infrastructure : base injoignable, AUTH_SECRET absent, adaptateur en
 * erreur. Les confondre revient à accuser l'utilisateur d'une faute de frappe
 * alors que le service est cassé — c'est exactement ce qui s'est produit en
 * production. On les sépare donc explicitement.
 */
const CAUSES_IDENTIFIANTS = new Set(["CredentialsSignin", "CallbackRouteError"]);

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const suite = String(formData.get("suite") ?? "");

  if (!email || !password) {
    return { error: "Renseignez votre adresse e-mail et votre mot de passe." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: suite && suite.startsWith("/") ? suite : "/tableau-de-bord",
    });
    return {};
  } catch (e) {
    // next-auth signale la redirection réussie par une exception : la laisser remonter.
    if (!(e instanceof AuthError)) throw e;

    const type = (e as AuthError).type ?? "";
    const cause = (e as { cause?: { err?: unknown } }).cause?.err;

    // Un échec d'authorize() remonte en CallbackRouteError : il faut regarder
    // la cause pour distinguer « mot de passe faux » d'une exception interne.
    const panne =
      !CAUSES_IDENTIFIANTS.has(type) ||
      (type === "CallbackRouteError" && cause instanceof Error);

    if (panne) {
      console.error("Connexion impossible — panne du service d'authentification :", {
        type,
        cause: cause instanceof Error ? cause.message : cause,
      });
      return {
        infrastructure: true,
        error:
          "Le service d'authentification est indisponible — ce n'est pas un problème " +
          "d'identifiants. Ouvrez /etat pour le diagnostic.",
      };
    }

    return { error: "Identifiants incorrects, ou compte désactivé." };
  }
}
