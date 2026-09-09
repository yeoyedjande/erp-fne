"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export interface LoginState { error?: string }

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
    if (e instanceof AuthError) {
      return { error: "Identifiants incorrects, ou compte désactivé." };
    }
    throw e; // next-auth signale la redirection réussie par une exception : la laisser remonter.
  }
}
