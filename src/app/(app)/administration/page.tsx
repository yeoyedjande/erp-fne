import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { ROLE_CAPABILITIES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import { formatDateTime, formatRelative } from "@/lib/format";
import {
  Avatar, Badge, Card, CardHeader, DefRow, EmptyState, Icon,
  PageHeader, StatCard, TableShell, Td, Th, Tr,
} from "@/components/ui";
import type { Role } from "@prisma/client";
import {
  resetPasswordAction, setUserRoleAction, toggleUserActiveAction,
  updateContentAction, updateSettingAction,
} from "./actions";
import { ContentEditor, PasswordReset, RoleSelector, SettingRow, ToggleActive } from "./AdminControls";

export const metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

const ACTION_TONE: Record<string, "brand" | "success" | "warning" | "danger" | "gold" | "neutral"> = {
  CREATE: "success", UPDATE: "brand", DELETE: "danger",
  CERTIFY: "gold", CERTIFY_BATCH: "gold", CREDIT_NOTE: "violet" as never,
  PAYMENT: "success", ISSUE: "brand", LOGIN: "neutral", RESET_PASSWORD: "warning",
};

export default async function AdminPage() {
  const current = await requireCapability("admin.access");

  const [users, settings, contents, logs, org] = await Promise.all([
    prisma.user.findMany({
      include: { clientCompany: { select: { name: true } } },
      orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    }),
    prisma.setting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] }),
    prisma.contentPage.findMany({ orderBy: [{ section: "asc" }, { position: "asc" }] }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.organization.findUniqueOrThrow({ where: { id: "org" } }),
  ]);

  const superAdmins = users.filter((u) => u.role === "SUPER_ADMIN" && u.active);
  const grouped = settings.reduce(
    (acc, s) => ({ ...acc, [s.group]: [...(acc[s.group] ?? []), s] }),
    {} as Record<string, typeof settings>,
  );

  return (
    <>
      <PageHeader
        title="Administration"
        subtitle="Comptes, rôles, règles métier, contenus publics et journal d'activité."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Comptes actifs" value={String(users.filter((u) => u.active).length)} icon="users" tone="brand" />
        <StatCard label="Super Admins" value={String(superAdmins.length)} icon="shield" tone="danger" />
        <StatCard label="Paramètres métier" value={String(settings.length)} icon="settings" tone="teal" />
        <StatCard label="Blocs éditoriaux" value={String(contents.length)} icon="file" tone="violet" />
      </div>

      <div className="space-y-6">
        {/* Utilisateurs */}
        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader
              title="Utilisateurs et rôles"
              subtitle="Le rôle détermine ce que chaque compte voit et peut faire. Le contrôle est fait côté serveur sur chaque page et chaque action."
              icon="users"
            />
          </div>
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[900px] border-collapse text-base">
              <thead>
                <tr>
                  <Th>Utilisateur</Th>
                  <Th>Fonction</Th>
                  <Th>Rôle</Th>
                  <Th>Dernière connexion</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = u.id === current.id;
                  return (
                    <Tr key={u.id} className={u.active ? undefined : "opacity-55"}>
                      <Td>
                        <span className="flex items-center gap-2.5">
                          <Avatar name={u.name} accent={u.accentToken} size={30} />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 font-medium text-ink">
                              {u.name}
                              {self && <Badge tone="brand">vous</Badge>}
                              {!u.active && <Badge tone="neutral">désactivé</Badge>}
                            </span>
                            <span className="block truncate text-xs text-ink-4">{u.email}</span>
                          </span>
                        </span>
                      </Td>
                      <Td className="text-sm text-ink-3">
                        {u.jobTitle ?? "—"}
                        {u.clientCompany && (
                          <span className="mt-0.5 block text-xs text-ink-4">
                            Portail : {u.clientCompany.name}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <RoleSelector
                          action={setUserRoleAction} userId={u.id}
                          current={u.role} disabled={self}
                        />
                      </Td>
                      <Td className="text-sm text-ink-3">
                        {u.lastLoginAt ? formatRelative(u.lastLoginAt) : "Jamais"}
                      </Td>
                      <Td align="right">
                        <span className="flex items-center justify-end gap-1.5">
                          <PasswordReset action={resetPasswordAction} userId={u.id} name={u.name} />
                          <ToggleActive
                            action={toggleUserActiveAction} userId={u.id}
                            active={u.active} disabled={self}
                          />
                        </span>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Matrice des rôles */}
          <Card>
            <CardHeader
              title="Périmètre des rôles"
              subtitle="Capacités vérifiées à chaque requête"
              icon="shield"
            />
            <ul className="space-y-4">
              {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                <li key={role} className="border-b border-line pb-4 last:border-0 last:pb-0">
                  <p className="flex items-center gap-2 font-medium text-ink">
                    <Icon name="lock" size={14} className="text-ink-4" />
                    {ROLE_LABELS[role]}
                    <span className="ml-auto font-mono text-xs tabular-nums text-ink-4">
                      {ROLE_CAPABILITIES[role].length} capacités
                    </span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-3">
                    {ROLE_DESCRIPTIONS[role]}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ROLE_CAPABILITIES[role].map((c) => (
                      <span
                        key={c}
                        className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-2xs tracking-normal text-ink-3"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Identité fiscale */}
          <Card>
            <CardHeader
              title="Identité de l'entreprise"
              subtitle="Reprise sur chaque facture et transmise à la plateforme FNE"
              icon="building"
            />
            <dl className="text-base">
              <DefRow label="Raison sociale">{org.legalName}</DefRow>
              <DefRow label="NCC" mono>{org.ncc}</DefRow>
              <DefRow label="RCCM" mono>{org.rccm}</DefRow>
              <DefRow label="Régime fiscal">{org.taxRegime}</DefRow>
              <DefRow label="Adresse">{org.addressLine}</DefRow>
              <DefRow label="Ville">{org.city}, {org.country}</DefRow>
              <DefRow label="Téléphone" mono>{org.phone}</DefRow>
              <DefRow label="E-mail">{org.email}</DefRow>
              <DefRow label="Banque">{org.bankName ?? "—"}</DefRow>
              <DefRow label="Compte" mono>{org.bankAccount ?? "—"}</DefRow>
              <DefRow label="Stickers FNE" mono>{org.fneStickerBalance}</DefRow>
            </dl>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Paramètres */}
          <Card>
            <CardHeader
              title="Règles métier"
              subtitle="Seuils et délais appliqués par la plateforme"
              icon="settings"
            />
            {Object.entries(grouped).map(([group, rows]) => (
              <section key={group} className="mb-5 last:mb-0">
                <p className="eyebrow mb-1">{group}</p>
                {rows.map((s) => (
                  <SettingRow
                    key={s.key} action={updateSettingAction} settingKey={s.key}
                    label={s.label} value={s.value} group={s.group}
                  />
                ))}
              </section>
            ))}
          </Card>

          {/* Contenus publics */}
          <Card>
            <CardHeader
              title="Contenus du site public"
              subtitle="Modifiés ici, publiés immédiatement sur la vitrine"
              icon="file"
            />
            {contents.length === 0 ? (
              <EmptyState icon="file" title="Aucun contenu" />
            ) : (
              contents.map((c) => (
                <ContentEditor key={c.id} action={updateContentAction} page={c} />
              ))
            )}
          </Card>
        </div>

        {/* Journal */}
        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader
              title="Journal d'activité"
              subtitle="Trente dernières écritures significatives. Aucun secret n'y figure."
              icon="list"
            />
          </div>
          {logs.length === 0 ? (
            <EmptyState icon="list" title="Journal vide" />
          ) : (
            <TableShell className="border-0 shadow-none">
              <thead>
                <tr>
                  <Th>Action</Th>
                  <Th>Objet</Th>
                  <Th>Détail</Th>
                  <Th>Auteur</Th>
                  <Th align="right">Date</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <Tr key={l.id}>
                    <Td>
                      <Badge tone={ACTION_TONE[l.action] ?? "neutral"}>{l.action}</Badge>
                    </Td>
                    <Td className="font-mono text-xs text-ink-3">{l.entity}</Td>
                    <Td className="max-w-[26rem] text-sm text-ink-2">{l.summary}</Td>
                    <Td className="text-sm text-ink-3">{l.userLabel}</Td>
                    <Td align="right" className="text-xs tabular-nums text-ink-4">
                      {formatDateTime(l.createdAt)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>
      </div>
    </>
  );
}
