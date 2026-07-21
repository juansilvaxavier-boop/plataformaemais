import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notifications";

export const POINTS = {
  LESSON_COMPLETED: 10,
  QUIZ_PASSED: 20,
  COURSE_COMPLETED: 50,
  CERTIFICATE_ISSUED: 30,
  FEEDBACK_GIVEN: 5,
} as const;

export async function awardPoints(userId: string, points: number, reason: string, refId?: string) {
  await prisma.pointsLedger.create({
    data: { userId, points, reason, refId },
  });
}

export async function getTotalPoints(userId: string): Promise<number> {
  const result = await prisma.pointsLedger.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}

/** Atualiza a sequência (streak) diária de estudo do usuário. */
export async function registerDailyActivity(userId: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const streak = await prisma.streakRecord.findUnique({ where: { userId } });

  if (!streak) {
    return prisma.streakRecord.create({
      data: { userId, currentStreak: 1, longestStreak: 1, lastActivityAt: now },
    });
  }

  const last = streak.lastActivityAt;
  const lastDay = last ? new Date(last.getFullYear(), last.getMonth(), last.getDate()) : null;

  if (lastDay && lastDay.getTime() === today.getTime()) {
    return streak; // já registrado hoje
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const isConsecutive = lastDay && today.getTime() - lastDay.getTime() === oneDayMs;
  const nextStreak = isConsecutive ? streak.currentStreak + 1 : 1;

  return prisma.streakRecord.update({
    where: { userId },
    data: {
      currentStreak: nextStreak,
      longestStreak: Math.max(nextStreak, streak.longestStreak),
      lastActivityAt: now,
    },
  });
}

type BadgeCriteria =
  | { type: "COURSE_COMPLETIONS"; count: number }
  | { type: "CERTIFICATES"; count: number }
  | { type: "STREAK"; days: number }
  | { type: "QUIZ_PERFECT"; count: number };

/** Avalia todas as badges ainda não conquistadas e concede as que atingirem o critério. */
export async function checkAndAwardBadges(userId: string) {
  const [badges, earnedIds, completedCourses, certificates, streak, perfectQuizzes] =
    await Promise.all([
      prisma.badge.findMany(),
      prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
      prisma.enrollment.count({ where: { userId, courseId: { not: null }, status: "COMPLETED" } }),
      prisma.certificate.count({ where: { userId } }),
      prisma.streakRecord.findUnique({ where: { userId } }),
      prisma.quizAttempt.count({ where: { userId, score: 100 } }),
    ]);

  const earned = new Set(earnedIds.map((b) => b.badgeId));
  const newlyAwarded: string[] = [];

  for (const badge of badges) {
    if (earned.has(badge.id)) continue;
    const criteria = badge.criteria as unknown as BadgeCriteria;
    let met = false;

    switch (criteria.type) {
      case "COURSE_COMPLETIONS":
        met = completedCourses >= criteria.count;
        break;
      case "CERTIFICATES":
        met = certificates >= criteria.count;
        break;
      case "STREAK":
        met = (streak?.currentStreak ?? 0) >= criteria.days;
        break;
      case "QUIZ_PERFECT":
        met = perfectQuizzes >= criteria.count;
        break;
    }

    if (met) {
      await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
      newlyAwarded.push(badge.name);
      await notifyUser({
        userId,
        type: "BADGE_EARNED",
        title: "Nova conquista desbloqueada!",
        body: `Você ganhou a badge "${badge.name}". Continue assim!`,
      });
    }
  }

  return newlyAwarded;
}

export async function getLeaderboard(params: { departmentId?: string; limit?: number }) {
  const users = await prisma.user.findMany({
    where: params.departmentId ? { departmentId: params.departmentId } : undefined,
    select: {
      id: true,
      name: true,
      departmentId: true,
      department: { select: { name: true } },
      points: { select: { points: true } },
    },
  });

  return users
    .map((u) => ({
      userId: u.id,
      name: u.name,
      department: u.department?.name ?? "-",
      totalPoints: u.points.reduce((sum, p) => sum + p.points, 0),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, params.limit ?? 20);
}
