import { Suspense } from "react";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { NAVIGATION } from "@/lib/navigation";
import { SidebarDesktop, SidebarMobile } from "@/components/layout/Sidebar";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";
import type { Role } from "@prisma/client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === "CLIENT") redirect("/portail");

  const [org, notifications] = await Promise.all([
    prisma.organization.findUnique({ where: { id: "org" } }),
    prisma.notification.findMany({
      where: { userId: user.id, read: false },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  /* La navigation est filtrée par capacité : un rôle ne voit jamais un menu
     hors de son périmètre. Chaque page revérifie de son côté. */
  const groups = NAVIGATION.map((g) => ({
    ...g,
    items: g.items.filter((i) => can(user.role, i.capability)),
  })).filter((g) => g.items.length > 0);

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/connexion" });
  }

  return (
    <div className="min-h-dvh lg:pl-[--sidebar-w]">
      {/* La barre latérale est en position fixe : elle doit rester hors de
          l'en-tête. Un ancêtre portant backdrop-filter deviendrait son bloc
          conteneur et la réduirait à la hauteur de l'en-tête. */}
      <SidebarDesktop groups={groups} stickerBalance={org?.fneStickerBalance ?? 0} />

      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="flex h-[--topbar-h] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <SidebarMobile groups={groups} stickerBalance={org?.fneStickerBalance ?? 0} />

          <Suspense fallback={<div className="h-9 w-full max-w-sm" />}>
            <GlobalSearch />
          </Suspense>

          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell
              items={notifications.map((n) => ({
                id: n.id, title: n.title, body: n.body,
                href: n.href, tone: n.tone, createdAt: n.createdAt.toISOString(),
              }))}
            />
            <UserMenu
              name={user.name} email={user.email}
              roleLabel={ROLE_LABELS[user.role as Role] ?? user.role}
              accent={user.accentToken}
              isAdmin={can(user.role, "admin.access")}
              signOutAction={doSignOut}
            />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-content">{children}</div>
      </main>
    </div>
  );
}
