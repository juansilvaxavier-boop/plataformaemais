import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { askCourseAssistant } from "@/lib/ai/assistant";
import { assertRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const rateLimited = assertRateLimit(req, "chat", 20, 5 * 60 * 1000, session.user.id);
  if (rateLimited) return rateLimited;

  const body = await req.json().catch(() => null);
  const courseId = String(body?.courseId ?? "");
  const question = String(body?.question ?? "").trim();
  const chatSessionId = body?.chatSessionId ? String(body.chatSessionId) : undefined;

  if (!courseId || !question) {
    return NextResponse.json({ error: "Curso e pergunta são obrigatórios." }, { status: 400 });
  }

  const result = await askCourseAssistant({
    userId: session.user.id,
    courseId,
    chatSessionId,
    question,
  });

  return NextResponse.json(result);
}
