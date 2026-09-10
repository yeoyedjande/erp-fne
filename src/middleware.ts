import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

/** Routes ouvertes sans session. Tout le reste exige une authentification.
 *  `/etat` doit en faire partie : c'est le point de contrôle interrogé par la
 *  plateforme d'hébergement, qui n'a pas de session. */
const PUBLIC = [
  "/", "/connexion", "/verification", "/acces-refuse", "/etat",
];

const isPublic = (path: string) =>
  PUBLIC.includes(path) || path.startsWith("/verification/");

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const signedIn = Boolean(req.auth?.user);

  if (!signedIn && !isPublic(pathname)) {
    const url = new URL("/connexion", req.nextUrl.origin);
    url.searchParams.set("suite", pathname);
    return NextResponse.redirect(url);
  }

  // Un client connecté n'a rien à faire dans le back-office.
  if (signedIn && req.auth?.user?.role === "CLIENT") {
    const allowed = pathname.startsWith("/portail") || isPublic(pathname);
    if (!allowed) return NextResponse.redirect(new URL("/portail", req.nextUrl.origin));
  }

  if (signedIn && pathname === "/connexion") {
    const target = req.auth?.user?.role === "CLIENT" ? "/portail" : "/tableau-de-bord";
    return NextResponse.redirect(new URL(target, req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)"],
};
