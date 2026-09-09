import type { NextAuthConfig } from "next-auth";

/** Configuration partagée entre le middleware (edge) et le serveur. */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/connexion", error: "/connexion" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.name = user.name;
        token.clientCompanyId = (user as { clientCompanyId?: string | null }).clientCompanyId ?? null;
        token.accentToken = (user as { accentToken?: string }).accentToken ?? "brand";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string) ?? "SALES";
        session.user.clientCompanyId = (token.clientCompanyId as string | null) ?? null;
        session.user.accentToken = (token.accentToken as string) ?? "brand";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
