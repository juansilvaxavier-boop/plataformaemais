import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runRecertificationCheck } from "@/lib/recertification";

/**
 * Aciona a verificação de recertificação. Aceita duas formas de autenticação:
 * uma sessão de administrador logado (usada pelo botão manual em
 * /admin/relatorios) ou uma chave de API via header "x-api-key" (usada pelo
 * agendamento automático via GitHub Actions — ver .github/workflows/recertification-cron.yml).
 */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  const hasValidApiKey = Boolean(apiKey) && apiKey === process.env.CRON_API_KEY;

  if (!hasValidApiKey) {
    const session = await auth();
    if (session?.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
  }

  const result = await runRecertificationCheck();
  return NextResponse.json(result);
}
