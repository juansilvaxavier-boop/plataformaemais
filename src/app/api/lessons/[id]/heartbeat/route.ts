import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { awardPoints, checkAndAwardBadges, POINTS } from "@/lib/gamification";
import { evaluateCourseCompletion, touchDailyEngagement } from "@/lib/enrollment";
import { notifyUser } from "@/lib/notifications";
import { assertRateLimit } from "@/lib/rate-limit";
import { evaluateHeartbeat } from "@/lib/heartbeat";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Heartbeat legítimo ocorre a cada ~4s por aula assistida; 90/min dá
  // margem para múltiplas abas sem abrir espaço para abuso.
  const rateLimited = assertRateLimit(req, "heartbeat", 90, 60 * 1000, session.user.id);
  if (rateLimited) return rateLimited;

  const { id: lessonId } = await params;
  const body = await req.json().catch(() => null);
  const positionSeconds = Number(body?.positionSeconds);

  if (!Number.isFinite(positionSeconds) || positionSeconds < 0) {
    return NextResponse.json({ error: "Posição inválida." }, { status: 400 });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });
  }

  const duration = lesson.videoDurationSeconds ?? 0;

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
  });

  const currentMax = existing?.maxWatchedSeconds ?? 0;

  // Bloqueia o adiantamento manual da barra: o cliente não pode reportar uma
  // posição muito além do que já foi efetivamente reproduzido e validado.
  const heartbeat = evaluateHeartbeat({ currentMax, positionSeconds, durationSeconds: duration });
  if (!heartbeat.allowed) {
    return NextResponse.json(
      {
        error: "Salto na reprodução detectado. Reprodução contínua é obrigatória.",
        maxWatchedSeconds: heartbeat.maxWatchedSeconds,
      },
      { status: 409 }
    );
  }

  const { newMax, percent, willComplete } = heartbeat;
  const wasAlreadyComplete = existing?.completed ?? false;

  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
    update: {
      maxWatchedSeconds: newMax,
      lastPositionSeconds: positionSeconds,
      percent,
      lastHeartbeatAt: new Date(),
      completed: wasAlreadyComplete || willComplete,
      completedAt: wasAlreadyComplete ? existing?.completedAt : willComplete ? new Date() : null,
    },
    create: {
      userId: session.user.id,
      lessonId,
      maxWatchedSeconds: newMax,
      lastPositionSeconds: positionSeconds,
      percent,
      lastHeartbeatAt: new Date(),
      completed: willComplete,
      completedAt: willComplete ? new Date() : null,
    },
  });

  let newBadges: string[] = [];

  if (willComplete && !wasAlreadyComplete) {
    await awardPoints(session.user.id, POINTS.LESSON_COMPLETED, "LESSON_COMPLETED", lessonId);
    await touchDailyEngagement(session.user.id);

    await prisma.enrollment.updateMany({
      where: { userId: session.user.id, courseId: lesson.module.courseId, status: "NOT_STARTED" },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });

    const result = await evaluateCourseCompletion(session.user.id, lesson.module.courseId);
    newBadges = await checkAndAwardBadges(session.user.id);

    if (!result.completed) {
      // Não concluiu o curso ainda; apenas notifica progresso silenciosamente (sem ruído extra).
    } else {
      await notifyUser({
        userId: session.user.id,
        type: "QUIZ_RESULT",
        title: "Módulo concluído",
        body: `Você concluiu todas as aulas de "${lesson.module.course.title}".`,
      });
    }
  }

  return NextResponse.json({ progress, newBadges });
}
