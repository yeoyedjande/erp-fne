import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      clientCompanyId: string | null;
      accentToken: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    clientCompanyId?: string | null;
    accentToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    clientCompanyId?: string | null;
    accentToken?: string;
  }
}
