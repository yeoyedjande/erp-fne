import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can, type Capability } from "./permissions";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  clientCompanyId: string | null;
  accentToken: string;
}

/** Session obligatoire. Redirige vers la connexion si absente. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return session.user as SessionUser;
}

/**
 * Session + capacité obligatoires. Un CLIENT qui atteint une page du
 * back-office est renvoyé sur son portail, jamais sur une page vide.
 */
export async function requireCapability(capability: Capability): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, capability)) {
    if (user.role === "CLIENT") redirect("/portail");
    redirect("/acces-refuse");
  }
  return user;
}

/** Variante pour les Server Actions : lève au lieu de rediriger. */
export async function assertCapability(capability: Capability): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Authentification requise.");
  const user = session.user as SessionUser;
  if (!can(user.role, capability)) {
    throw new Error("Votre rôle ne vous autorise pas cette action.");
  }
  return user;
}

/** Portail client : la société de rattachement est obligatoire. */
export async function requirePortalUser(): Promise<SessionUser & { clientCompanyId: string }> {
  const user = await requireUser();
  if (user.role !== "CLIENT" || !user.clientCompanyId) redirect("/tableau-de-bord");
  return user as SessionUser & { clientCompanyId: string };
}
