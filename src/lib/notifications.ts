import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import type { NotificationType } from "@prisma/client";

/**
 * Cria a notificação in-app e replica para os canais configurados: e-mail
 * (via SMTP, quando `SMTP_HOST` está definido) e, opcionalmente, Slack/Teams
 * via webhook de entrada. Sem SMTP configurado, o conteúdo do e-mail
 * continua disponível como notificação in-app (nenhum envio é perdido).
 */
export async function notifyUser(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  alsoEmail?: boolean;
  alsoSlack?: boolean;
  alsoTeams?: boolean;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      channel: "IN_APP",
    },
  });

  if (params.alsoEmail ?? true) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true },
    });
    if (user) {
      await sendEmail({
        to: user.email,
        subject: params.title,
        html: `<p>${params.body}</p>`,
      }).catch(() => undefined);
    }
  }

  if (params.alsoSlack && process.env.SLACK_WEBHOOK_URL) {
    await sendWebhook(process.env.SLACK_WEBHOOK_URL, {
      text: `*${params.title}*\n${params.body}`,
    }).catch(() => undefined);
  }

  if (params.alsoTeams && process.env.TEAMS_WEBHOOK_URL) {
    await sendWebhook(process.env.TEAMS_WEBHOOK_URL, {
      text: `**${params.title}**\n\n${params.body}`,
    }).catch(() => undefined);
  }

  return notification;
}

async function sendWebhook(url: string, payload: Record<string, unknown>) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
