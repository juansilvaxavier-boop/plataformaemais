import nodemailer from "nodemailer";

export const EMAIL_ENABLED = Boolean(process.env.SMTP_HOST);

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!EMAIL_ENABLED) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transporter;
}

/**
 * Envia um e-mail transacional via SMTP quando configurado. Sem
 * `SMTP_HOST` definido, a chamada é ignorada silenciosamente (o conteúdo
 * continua disponível como notificação in-app).
 *
 * Segurança: nunca repasse `to`/`subject`/`html` com conteúdo bruto (raw
 * MIME) nem anexos com caminhos/URLs vindos de entrada do usuário — apenas
 * texto/HTML montado pelo próprio código, para não expor o app à
 * vulnerabilidade conhecida de bypass de disableFileAccess/disableUrlAccess
 * do nodemailer via a opção "raw".
 */
export async function sendEmail(params: { to: string; subject: string; html: string; text?: string }) {
  const client = getTransporter();
  if (!client) return { sent: false as const };

  await client.sendMail({
    from: process.env.SMTP_FROM ?? "Plataforma+ <no-reply@example.com>",
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text ?? params.html.replace(/<[^>]+>/g, " "),
  });

  return { sent: true as const };
}
