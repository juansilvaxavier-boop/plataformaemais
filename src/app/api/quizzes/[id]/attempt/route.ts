import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { awardPoints, checkAndAwardBadges, POINTS } from "@/lib/gamification";
import { evaluateCourseCompletion, touchDailyEngagement } from "@/lib/enrollment";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id: quizId } = await params;
  const body = await req.json().catch(() => null);
  const answers = body?.answers as Record<string, string[]> | undefined;
  if (!answers) {
    return NextResponse.json({ error: "Respostas ausentes." }, { status: 400 });
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { include: { options: true } },
      module: { include: { course: true } },
    },
  });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz não encontrado." }, { status: 404 });
  }

  let correctCount = 0;
  for (const question of quiz.questions) {
    const correctOptionIds = new Set(
      question.options.filter((o) => o.isCorrect).map((o) => o.id)
    );
    const givenIds = new Set(answers[question.id] ?? []);
    const isCorrect =
      correctOptionIds.size === givenIds.size &&
      [...correctOptionIds].every((id) => givenIds.has(id));
    if (isCorrect) correctCount += 1;
  }

  const score =
    quiz.questions.length > 0 ? Math.round((correctCount / quiz.questions.length) * 100) : 0;
  const passed = score >= quiz.passingScore;

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId: session.user.id,
      score,
      passed,
      answers,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "QUIZ_ATTEMPT",
    entityType: "Quiz",
    entityId: quizId,
    metadata: { score, passed },
  });

  await notifyUser({
    userId: session.user.id,
    type: "QUIZ_RESULT",
    title: passed ? "Você foi aprovado!" : "Nota abaixo do necessário",
    body: `Resultado do quiz "${quiz.title}": ${score}% (nota de corte: ${quiz.passingScore}%).`,
  });

  let newBadges: string[] = [];
  let courseCompleted = false;

  if (passed) {
    await awardPoints(session.user.id, POINTS.QUIZ_PASSED, "QUIZ_PASSED", quizId);
    await touchDailyEngagement(session.user.id);

    if (quiz.module?.courseId) {
      const result = await evaluateCourseCompletion(session.user.id, quiz.module.courseId);
      courseCompleted = result.completed ?? false;
    }
    newBadges = await checkAndAwardBadges(session.user.id);
  }

  return NextResponse.json({ attempt, courseCompleted, newBadges });
}
