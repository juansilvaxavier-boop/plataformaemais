import { prisma } from "@/lib/db";
import { awardPoints, checkAndAwardBadges, POINTS, registerDailyActivity } from "@/lib/gamification";
import { issueCertificate } from "@/lib/certificate";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import type { Role } from "@prisma/client";

/** Matricula automaticamente o usuário em cursos e trilhas com base em cargo/departamento. */
export async function autoAssignForRole(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const courses = await prisma.course.findMany({
    where: {
      published: true,
      OR: [
        { targetRoles: { some: { role: user.role } } },
        user.departmentId
          ? { targetDepartments: { some: { departmentId: user.departmentId } } }
          : {},
      ],
    },
  });

  for (const course of courses) {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      update: {},
      create: {
        userId,
        courseId: course.id,
        assignedReason: "ROLE",
        status: "NOT_STARTED",
      },
    });
  }

  const paths = await prisma.learningPath.findMany({
    where: {
      OR: [
        { targetRoles: { some: { role: user.role } } },
        user.departmentId
          ? { targetDepartments: { some: { departmentId: user.departmentId } } }
          : {},
      ],
    },
  });

  for (const path of paths) {
    await prisma.enrollment.upsert({
      where: { userId_learningPathId: { userId, learningPathId: path.id } },
      update: {},
      create: {
        userId,
        learningPathId: path.id,
        assignedReason: path.isOnboarding ? "ONBOARDING" : "ROLE",
        status: "NOT_STARTED",
      },
    });
  }

  return { courses: courses.length, paths: paths.length };
}

/** Verifica se todas as aulas do curso foram concluídas e todos os quizzes aprovados. */
export async function evaluateCourseCompletion(userId: string, courseId: string) {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    include: {
      modules: { include: { lessons: true, quizzes: true } },
      competencies: true,
    },
  });

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const allQuizzes = course.modules.flatMap((m) => m.quizzes);

  const lessonProgresses = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: allLessons.map((l) => l.id) } },
  });
  const allLessonsComplete =
    allLessons.length === 0 ||
    allLessons.every((l) => lessonProgresses.find((p) => p.lessonId === l.id)?.completed);

  const passedQuizIds = new Set(
    (
      await prisma.quizAttempt.findMany({
        where: { userId, quizId: { in: allQuizzes.map((q) => q.id) }, passed: true },
        select: { quizId: true },
      })
    ).map((a) => a.quizId)
  );
  const allQuizzesPassed = allQuizzes.every((q) => passedQuizIds.has(q.id));

  if (!allLessonsComplete || !allQuizzesPassed) return { completed: false };

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment || enrollment.status === "COMPLETED") return { completed: enrollment?.status === "COMPLETED" };

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await awardPoints(userId, POINTS.COURSE_COMPLETED, "COURSE_COMPLETED", courseId);

  for (const comp of course.competencies) {
    await prisma.userCompetency.upsert({
      where: { userId_competencySkillId: { userId, competencySkillId: comp.competencySkillId } },
      update: { level: comp.levelGranted },
      create: {
        userId,
        competencySkillId: comp.competencySkillId,
        level: comp.levelGranted,
      },
    });
  }

  const certificate = await issueCertificate({ userId, courseId });
  await awardPoints(userId, POINTS.CERTIFICATE_ISSUED, "CERTIFICATE_ISSUED", certificate.id);

  await notifyUser({
    userId,
    type: "CERTIFICATE_ISSUED",
    title: "Certificado emitido!",
    body: `Parabéns! Você concluiu "${course.title}" e seu certificado já está disponível.`,
    alsoSlack: true,
    alsoTeams: true,
  });

  await logAudit({
    userId,
    action: "COURSE_COMPLETED",
    entityType: "Course",
    entityId: courseId,
    metadata: { certificateId: certificate.id },
  });

  await checkAndAwardBadges(userId);

  await evaluatePathCompletionsForCourse(userId, courseId);

  return { completed: true, certificateId: certificate.id };
}

async function evaluatePathCompletionsForCourse(userId: string, courseId: string) {
  const pathLinks = await prisma.learningPathCourse.findMany({
    where: { courseId },
    include: { learningPath: { include: { courses: true } } },
  });

  for (const link of pathLinks) {
    const path = link.learningPath;
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_learningPathId: { userId, learningPathId: path.id } },
    });
    if (!enrollment || enrollment.status === "COMPLETED") continue;

    const courseIds = path.courses.map((c) => c.courseId);
    const completedCount = await prisma.enrollment.count({
      where: { userId, courseId: { in: courseIds }, status: "COMPLETED" },
    });

    if (completedCount === courseIds.length) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      const certificate = await issueCertificate({ userId, learningPathId: path.id });
      await notifyUser({
        userId,
        type: "CERTIFICATE_ISSUED",
        title: "Trilha concluída!",
        body: `Você concluiu a trilha "${path.title}". Certificado disponível.`,
        alsoSlack: true,
        alsoTeams: true,
      });
      await logAudit({
        userId,
        action: "LEARNING_PATH_COMPLETED",
        entityType: "LearningPath",
        entityId: path.id,
        metadata: { certificateId: certificate.id },
      });
    }
  }
}

export async function touchDailyEngagement(userId: string) {
  await registerDailyActivity(userId);
}

export function isManagerOf(managerRole: Role) {
  return managerRole === "MANAGER" || managerRole === "ADMIN";
}

export async function getCourseProgressPercent(userId: string, courseId: string): Promise<number> {
  const lessons = await prisma.lesson.findMany({ where: { module: { courseId } }, select: { id: true } });
  if (lessons.length === 0) return 0;
  const completedCount = await prisma.lessonProgress.count({
    where: { userId, lessonId: { in: lessons.map((l) => l.id) }, completed: true },
  });
  return Math.round((completedCount / lessons.length) * 100);
}
