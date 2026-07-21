"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

export async function resetPassword(
  token: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (password.length < 6) {
    return { success: false, error: "A senha deve ter ao menos 6 caracteres." };
  }

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return { success: false, error: "Link inválido ou expirado. Solicite um novo." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await notifyUser({
    userId,
    type: "GENERAL",
    title: "Senha alterada",
    body: "Sua senha foi redefinida com sucesso. Se não foi você, contate o administrador imediatamente.",
    alsoEmail: true,
  });

  await logAudit({ userId, action: "PASSWORD_RESET_COMPLETED", entityType: "User", entityId: userId });

  return { success: true };
}
