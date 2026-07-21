import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader, Badge, ProgressBar, EmptyState } from "@/components/ui";
import { getCourseProgressPercent } from "@/lib/enrollment";
import { getTotalPoints } from "@/lib/gamification";
import { getPersonalizedSuggestions } from "@/lib/ai/content-generation";
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

      <h2 className="text-lg font-semibold text-slate-800 mb-3">Continue de onde parou</h2>
      {enrollments.length === 0 ? (
        <EmptyState title="Você não tem cursos em andamento." description="Explore o catálogo de cursos." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {enrollments.map((e) => (
            <Link key={e.id} href={`/cursos/${e.courseId}`}>
              <Card className="hover:border-indigo-300">
                <div className="flex items-center justify-between mb-2">
                  <Badge>{e.course?.category}</Badge>
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{e.course?.title}</h3>
                <ProgressBar percent={progress.get(e.courseId!) ?? 0} />
              </Card>
            </Link>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Sugestões para você (IA)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestions.map((c) => (
              <Link key={c.id} href={`/cursos/${c.id}`}>
                <Card className="hover:border-indigo-300 h-full">
                  <Badge tone="info" className="mb-2 w-fit">
                    {c.category}
                  </Badge>
                  <h3 className="font-semibold text-slate-800 text-sm">{c.title}</h3>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
