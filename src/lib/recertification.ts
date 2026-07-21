import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

/**
 * Verifica cursos com período de recertificação configurado e, quando o prazo
 * de validade expira, reabre a matrícula (exigindo nova conclusão completa das
 * aulas e avaliações) e notifica o colaborador. Pensado para ser disparado por
 * um agendador externo (cron) ou manualmente pelo administrador — ver README
 * para configuração em produção.
 */
export async function runRecertificationCheck(): Promise<{ created: number }> {
  const now = new Date();

  const completedEnrollments = await prisma.enrollment.findMany({
    where: {
      status: "COMPLETED",
      completedAt: { not: null },
      course: { recertificationPeriodMonths: { not: null } },
    },
    include: { course: true },
  });

  let created = 0;

  for (const enrollment of completedEnrollments) {
    if (!enrollment.completedAt || !enrollment.course?.recertificationPeriodMonths || !enrollment.courseId) {
      continue;
    }

    const dueDate = new Date(enrollment.completedAt);
    dueDate.setMonth(dueDate.getMonth() + enrollment.course.recertificationPeriodMonths);

    if (dueDate > now) continue;

    const lessonIds = (
      await prisma.lesson.findMany({ where: { module: { courseId: enrollment.courseId } }, select: { id: true } })
    ).map((l) => l.id);
    const quizIds = (
      await prisma.quiz.findMany({ where: { module: { courseId: enrollment.courseId } }, select: { id: true } })
    ).map((q) => q.id);

    await prisma.$transaction([
      prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "NOT_STARTED",
          assignedReason: "RECERTIFICATION",
          startedAt: null,
          completedAt: null,
          dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.lessonProgress.deleteMany({ where: { userId: enrollment.userId, lessonId: { in: lessonIds } } }),
      prisma.quizAttempt.deleteMany({ where: { userId: enrollment.userId, quizId: { in: quizIds } } }),
    ]);

    await notifyUser({
      userId: enrollment.userId,
      type: "RECERTIFICATION_DUE",
      title: "Recertificação necessária",
      body: `O treinamento "${enrollment.course.title}" venceu e precisa ser refeito dentro de 30 dias para manter a conformidade.`,
      alsoSlack: true,
    });

    await logAudit({
      userId: enrollment.userId,
      action: "RECERTIFICATION_TRIGGERED",
      entityType: "Course",
      entityId: enrollment.courseId,
    });

    created += 1;
  }

  return { created };
}
