import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge, ProgressBar, EmptyState } from "@/components/ui";
import { getCourseProgressPercent } from "@/lib/enrollment";
import { EnrollButton } from "./enroll-button";

const STATUS_LABEL: Record<string, { label: string; tone: "default" | "success" | "warning" | "info" }> = {
  NOT_STARTED: { label: "Não iniciado", tone: "default" },
  IN_PROGRESS: { label: "Em andamento", tone: "info" },
  COMPLETED: { label: "Concluído", tone: "success" },
  OVERDUE: { label: "Atrasado", tone: "warning" },
  EXPIRED: { label: "Expirado", tone: "warning" },
};

export default async function CursosPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [enrollments, allCourses] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId, courseId: { not: null } },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const catalog = allCourses.filter((c) => !enrolledCourseIds.has(c.id));

  const progressByCourse = new Map<string, number>();
  for (const e of enrollments) {
    if (e.courseId) progressByCourse.set(e.courseId, await getCourseProgressPercent(userId, e.courseId));
  }

  return (
    <div>
      <PageHeader title="Meus Cursos" description="Treinamentos atribuídos e disponíveis para você." />

      {enrollments.length === 0 ? (
        <EmptyState title="Nenhum curso atribuído ainda" description="Explore o catálogo abaixo." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {enrollments.map((e) => (
            <Link key={e.id} href={`/cursos/${e.courseId}`}>
              <Card className="hover:border-indigo-300 transition-colors h-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <Badge tone={STATUS_LABEL[e.status].tone}>{STATUS_LABEL[e.status].label}</Badge>
                  <Badge>{e.course?.category}</Badge>
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{e.course?.title}</h3>
                <p className="text-xs text-slate-500 mb-3 line-clamp-2 flex-1">{e.course?.description}</p>
                <ProgressBar percent={progressByCourse.get(e.courseId!) ?? 0} />
                <p className="text-xs text-slate-400 mt-1">{progressByCourse.get(e.courseId!) ?? 0}% concluído</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold text-slate-800 mb-4">Catálogo</h2>
      {catalog.length === 0 ? (
        <EmptyState title="Você já está matriculado em todos os cursos publicados." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <Badge className="mb-2 w-fit">{c.category}</Badge>
              <h3 className="font-semibold text-slate-800 mb-1">{c.title}</h3>
              <p className="text-xs text-slate-500 mb-4 line-clamp-3 flex-1">{c.description}</p>
              <EnrollButton courseId={c.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
