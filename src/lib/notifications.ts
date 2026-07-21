import { prisma } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

/**
 * Cria a notificação in-app e, quando configurado, replica para Slack/Teams
 * via webhook de entrada. E-mail é registrado como notificação (canal EMAIL);
 * a entrega real depende de um provedor SMTP/transacional configurado em produção.
 */
export async function notifyUser(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
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
