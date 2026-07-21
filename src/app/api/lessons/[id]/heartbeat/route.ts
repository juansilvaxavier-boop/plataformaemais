import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { awardPoints, checkAndAwardBadges, POINTS } from "@/lib/gamification";
import { evaluateCourseCompletion, touchDailyEngagement } from "@/lib/enrollment";
import { notifyUser } from "@/lib/notifications";

// Tolerância para variações naturais do player (buffering, intervalo do heartbeat).
const SEEK_TOLERANCE_SECONDS = 5;
// Percentual mínimo assistido para considerar a aula 100% concluída.
const COMPLETION_THRESHOLD = 0.98;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

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
  if (positionSeconds > currentMax + SEEK_TOLERANCE_SECONDS) {
    return NextResponse.json(
      {
        error: "Salto na reprodução detectado. Reprodução contínua é obrigatória.",
        maxWatchedSeconds: currentMax,
      },
      { status: 409 }
    );
  }

  const newMax = Math.max(currentMax, positionSeconds);
  const percent = duration > 0 ? Math.min(100, (newMax / duration) * 100) : 0;
  const willComplete = duration > 0 && newMax / duration >= COMPLETION_THRESHOLD;
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
