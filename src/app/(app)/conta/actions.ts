"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";

export async function changeMyPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Não autenticado." };

  if (newPassword.length < 6) {
    return { success: false, error: "A nova senha deve ter ao menos 6 caracteres." };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.passwordHash) {
    return { success: false, error: "Esta conta usa login via SSO e não possui senha local." };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Senha atual incorreta." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await notifyUser({
    userId: user.id,
    type: "GENERAL",
    title: "Senha alterada",
    body: "Sua senha foi alterada com sucesso.",
  });

  await logAudit({ userId: user.id, action: "PASSWORD_CHANGED", entityType: "User", entityId: user.id });

  return { success: true };
}
