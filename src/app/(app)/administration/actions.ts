"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertCapability } from "@/lib/auth-guard";
import { logActivity } from "@/lib/audit";
import { ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export interface ActionState { ok?: boolean; message?: string }

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "SALES", "SUPPORT", "CLIENT"]),
});

export async function setUserRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await assertCapability("admin.access");
  const parsed = roleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Rôle invalide." };
  const { userId, role } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, message: "Utilisateur introuvable." };

  // Garde-fou : ne jamais laisser la plateforme sans Super Admin actif.
  if (target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    const remaining = await prisma.user.count({
      where: { role: "SUPER_ADMIN", active: true, id: { not: userId } },
    });
    if (remaining === 0) {
      return { ok: false, message: "Impossible : il doit rester au moins un Super Admin actif." };
    }
  }
  if (role === "CLIENT" && !target.clientCompanyId) {
    return {
      ok: false,
      message: "Un compte client doit être rattaché à une société. Créez-le depuis la fiche société.",
    };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  await logActivity({
    user: admin, action: "UPDATE", entity: "User", entityId: userId,
    summary: `Rôle de ${target.name} : ${ROLE_LABELS[target.role as Role]} → ${ROLE_LABELS[role as Role]}`,
  });

  revalidatePath("/administration");
  return { ok: true, message: `${target.name} est désormais ${ROLE_LABELS[role as Role]}.` };
}

export async function toggleUserActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await assertCapability("admin.access");
  const userId = String(formData.get("userId") ?? "");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, message: "Utilisateur introuvable." };
  if (target.id === admin.id) {
    return { ok: false, message: "Vous ne pouvez pas désactiver votre propre compte." };
  }
  if (target.active && target.role === "SUPER_ADMIN") {
    const remaining = await prisma.user.count({
      where: { role: "SUPER_ADMIN", active: true, id: { not: userId } },
    });
    if (remaining === 0) {
      return { ok: false, message: "Impossible : il doit rester au moins un Super Admin actif." };
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { active: !target.active } });
  await logActivity({
    user: admin, action: "UPDATE", entity: "User", entityId: userId,
    summary: `${target.name} ${target.active ? "désactivé" : "réactivé"}`,
  });

  revalidatePath("/administration");
  return {
    ok: true,
    message: `${target.name} ${target.active ? "désactivé" : "réactivé"}.`,
  };
}

const passwordSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(10, "Le mot de passe doit faire au moins 10 caractères."),
});

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await assertCapability("admin.access");
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }
  const { userId, password } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, message: "Utilisateur introuvable." };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  // Le mot de passe n'apparaît jamais dans le journal.
  await logActivity({
    user: admin, action: "RESET_PASSWORD", entity: "User", entityId: userId,
    summary: `Mot de passe de ${target.name} réinitialisé`,
  });

  revalidatePath("/administration");
  return { ok: true, message: `Mot de passe de ${target.name} mis à jour.` };
}

const settingSchema = z.object({ key: z.string().min(1), value: z.string().max(200) });

export async function updateSettingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await assertCapability("admin.access");
  const parsed = settingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Paramètre invalide." };
  const { key, value } = parsed.data;

  const setting = await prisma.setting.findUnique({ where: { key } });
  if (!setting) return { ok: false, message: "Paramètre inconnu." };

  await prisma.setting.update({ where: { key }, data: { value } });
  await logActivity({
    user: admin, action: "UPDATE", entity: "Setting", entityId: key,
    summary: `${setting.label} : ${setting.value} → ${value}`,
  });

  revalidatePath("/administration");
  return { ok: true, message: `${setting.label} enregistré.` };
}

const contentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2),
  subtitle: z.string().max(160).optional(),
  body: z.string().min(10, "Le contenu doit faire au moins dix caractères."),
});

/** Édition des blocs éditoriaux affichés sur la vitrine publique. */
export async function updateContentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await assertCapability("admin.access");
  const parsed = contentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }
  const { id, title, subtitle, body } = parsed.data;

  await prisma.contentPage.update({
    where: { id },
    data: { title, subtitle: subtitle || null, body },
  });
  await logActivity({
    user: admin, action: "UPDATE", entity: "ContentPage", entityId: id,
    summary: `Contenu « ${title} » modifié`,
  });

  revalidatePath("/administration");
  revalidatePath("/");
  return { ok: true, message: "Contenu mis à jour et publié sur le site." };
}
