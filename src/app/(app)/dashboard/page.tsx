import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { getCourseProgressPercent } from "@/lib/enrollment";
import { getTotalPoints } from "@/lib/gamification";
import { getPersonalizedSuggestions } from "@/lib/ai/content-generation";
import { CourseCard } from "@/components/course-card";
import { CourseRow } from "@/components/course-row";
import { Flame, Trophy, Award, Bell } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [enrollments, points, streak, badgeCount, unreadNotifications, suggestions] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId, courseId: { not: null }, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } },
      include: { course: true },
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
    getTotalPoints(userId),
    prisma.streakRecord.findUnique({ where: { userId } }),
    prisma.userBadge.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
    getPersonalizedSuggestions(userId, 3),
  ]);

  const progress = new Map<string, number>();
  for (const e of enrollments) {
    if (e.courseId) progress.set(e.courseId, await getCourseProgressPercent(userId, e.courseId));
  }

  return (
    <div>
      <PageHeader title={`Olá, ${session!.user.name?.split(" ")[0]}`} description="Continue sua jornada de aprendizado." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="text-center">
          <Trophy className="mx-auto text-amber-500 mb-1" size={20} />
          <p className="text-xl font-bold text-slate-900">{points}</p>
          <p className="text-xs text-slate-500">Pontos</p>
        </Card>
        <Card className="text-center">
          <Flame className="mx-auto text-orange-500 mb-1" size={20} />
          <p className="text-xl font-bold text-slate-900">{streak?.currentStreak ?? 0}</p>
          <p className="text-xs text-slate-500">Dias seguidos</p>
        </Card>
        <Card className="text-center">
          <Award className="mx-auto text-indigo-500 mb-1" size={20} />
          <p className="text-xl font-bold text-slate-900">{badgeCount}</p>
          <p className="text-xs text-slate-500">Badges</p>
        </Card>
        <Link href="/notificacoes">
          <Card className="text-center hover:border-indigo-300">
            <Bell className="mx-auto text-slate-500 mb-1" size={20} />
            <p className="text-xl font-bold text-slate-900">{unreadNotifications}</p>
            <p className="text-xs text-slate-500">Não lidas</p>
          </Card>
        </Link>
      </div>

      {enrollments.length === 0 ? (
        <>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Continue de onde parou</h2>
          <EmptyState title="Você não tem cursos em andamento." description="Explore o catálogo de cursos." />
        </>
      ) : (
        <CourseRow title="Continue de onde parou">
          {enrollments.map((e) => (
            <CourseCard
              key={e.id}
              course={{
                id: e.course!.id,
                title: e.course!.title,
                category: e.course!.category,
                coverUrl: e.course!.coverUrl,
              }}
              enrolled
              percent={progress.get(e.courseId!)}
            />
          ))}
        </CourseRow>
      )}

      {suggestions.length > 0 && (
        <CourseRow title="Sugestões para você (IA)">
          {suggestions.map((c) => (
            <CourseCard
              key={c.id}
              course={{ id: c.id, title: c.title, category: c.category, coverUrl: c.coverUrl }}
              enrolled={false}
            />
          ))}
        </CourseRow>
      )}
    </div>
  );
}
