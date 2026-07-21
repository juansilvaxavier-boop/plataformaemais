"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendEmail, EMAIL_ENABLED } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Sempre responde com sucesso genérico, esteja o e-mail cadastrado ou não —
 * evita que a tela seja usada para descobrir quais e-mails têm conta na
 * plataforma (enumeração de usuários).
 */
export async function requestPasswordReset(formData: FormData) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  // Limita por IP e por e-mail alvo para dificultar tanto spam quanto
  // enumeração de contas via este formulário público.
  if (!checkRateLimit(`password-reset:ip:${ip}`, 10, 15 * 60 * 1000)) return;

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return;
  if (!checkRateLimit(`password-reset:email:${email}`, 3, 15 * 60 * 1000)) return;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !user.passwordHash) return;

  const token = await createPasswordResetToken(user.id);
  const resetUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/redefinir-senha/${token}`;

  if (!EMAIL_ENABLED) {
    // Sem SMTP configurado: registra no log do servidor (nunca na resposta
    // ao navegador) para permitir testar o fluxo em desenvolvimento.
    console.log(`[password-reset] SMTP não configurado. Link para ${user.email}: ${resetUrl}`);
  }

  await sendEmail({
    to: user.email,
    subject: "Redefinição de senha - EMAIS Urbanismo",
    html: `<p>Olá, ${user.name}.</p><p>Recebemos uma solicitação para redefinir sua senha. Clique no link abaixo (válido por 1 hora):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Se você não solicitou isso, ignore este e-mail.</p>`,
  }).catch(() => undefined);

  await logAudit({
    userId: user.id,
    action: "PASSWORD_RESET_REQUESTED",
    entityType: "User",
    entityId: user.id,
  });
}
