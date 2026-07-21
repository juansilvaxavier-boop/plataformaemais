"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { autoAssignForRole } from "@/lib/enrollment";
import { notifyUser } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

export async function createUser(formData: FormData) {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "EMPLOYEE") as Role;
  const jobTitle = String(formData.get("jobTitle") ?? "").trim() || null;
  const departmentId = String(formData.get("departmentId") ?? "") || null;
  const managerId = String(formData.get("managerId") ?? "") || null;

  if (!name || !email || password.length < 6) {
    throw new Error("Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, jobTitle, departmentId, managerId },
  });

  await autoAssignForRole(user.id);

  await notifyUser({
    userId: user.id,
    type: "GENERAL",
    title: "Bem-vindo(a) à EMAIS Urbanismo",
    body: "Sua conta foi criada. Confira seus treinamentos atribuídos.",
  });

  await logAudit({
    userId: session!.user.id,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    metadata: { email, role },
  });

  revalidatePath("/admin/usuarios");
}

export async function updateUserRole(userId: string, role: Role) {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  await prisma.user.update({ where: { id: userId }, data: { role } });
  await autoAssignForRole(userId);

  await logAudit({
    userId: session!.user.id,
    action: "USER_ROLE_UPDATED",
    entityType: "User",
    entityId: userId,
    metadata: { role },
  });

  revalidatePath("/admin/usuarios");
}

export async function toggleUserActive(userId: string, active: boolean) {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  await prisma.user.update({ where: { id: userId }, data: { active } });
  await logAudit({
    userId: session!.user.id,
    action: active ? "USER_REACTIVATED" : "USER_DEACTIVATED",
    entityType: "User",
    entityId: userId,
  });

  revalidatePath("/admin/usuarios");
}
