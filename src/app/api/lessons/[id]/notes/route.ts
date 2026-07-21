import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id: lessonId } = await params;
  const notes = await prisma.note.findMany({
    where: { userId: session.user.id, lessonId },
    orderBy: { timestampSeconds: "asc" },
  });
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id: lessonId } = await params;
  const body = await req.json().catch(() => null);
  const timestampSeconds = Number(body?.timestampSeconds);
  const content = String(body?.content ?? "").trim();

  if (!content || !Number.isFinite(timestampSeconds)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: { userId: session.user.id, lessonId, timestampSeconds, content },
  });

  return NextResponse.json({ note });
}
