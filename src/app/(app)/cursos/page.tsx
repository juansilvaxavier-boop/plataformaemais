import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, Button, EmptyState } from "@/components/ui";
import { getCourseProgressPercent } from "@/lib/enrollment";
import { CourseCard } from "@/components/course-card";
import { CourseRow } from "@/components/course-row";
import { EnrollButton } from "./enroll-button";
import { Play } from "lucide-react";

export default async function CursosPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [courses, enrollments] = await Promise.all([
    prisma.course.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } }),
    prisma.enrollment.findMany({
      where: { userId, courseId: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (courses.length === 0) {
    return <EmptyState title="Nenhum curso publicado ainda" description="Volte em breve." />;
  }

  const enrollmentByCourseId = new Map(enrollments.map((e) => [e.courseId!, e]));

  const percentByCourseId = new Map<string, number>();
  for (const e of enrollments) {
    if (e.courseId) percentByCourseId.set(e.courseId, await getCourseProgressPercent(userId, e.courseId));
  }

  const continueWatching = courses.filter((c) => enrollmentByCourseId.get(c.id)?.status === "IN_PROGRESS");

  const rowsByCategory = new Map<string, typeof courses>();
  for (const c of courses) {
    const list = rowsByCategory.get(c.category) ?? [];
    list.push(c);
    rowsByCategory.set(c.category, list);
  }

  const featured =
    continueWatching[0] ??
    courses.find((c) => !enrollmentByCourseId.has(c.id)) ??
    courses[0];
  const featuredEnrollment = enrollmentByCourseId.get(featured.id);

  return (
    <div className="-mt-2">
      {/* Hero em destaque, no estilo "vitrine" */}
      <div className="relative rounded-2xl overflow-hidden mb-10 bg-gradient-to-br from-[#0b6350] via-[#0a4e3f] to-slate-900 text-white">
        {featured.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- capa é URL arbitrária definida pelo instrutor
          <img
            src={featured.coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative p-8 md:p-12 max-w-2xl">
          <Badge tone="info" className="mb-3">
            {featuredEnrollment ? "Continue assistindo" : "Em destaque"}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{featured.title}</h1>
          <p className="text-white/80 mb-6 line-clamp-3">{featured.description}</p>
          {featuredEnrollment ? (
            <Link href={`/cursos/${featured.id}`}>
              <Button size="md" className="bg-white text-slate-900 hover:bg-slate-100">
                <Play size={16} fill="currentColor" /> Continuar curso
              </Button>
            </Link>
          ) : (
            <EnrollButton courseId={featured.id} />
          )}
        </div>
      </div>

      {continueWatching.length > 0 && (
        <CourseRow title="Continuar assistindo">
          {continueWatching.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              enrolled
              percent={percentByCourseId.get(c.id)}
            />
          ))}
        </CourseRow>
      )}

      {[...rowsByCategory.entries()].map(([category, list]) => (
        <CourseRow key={category} title={category}>
          {list.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              enrolled={enrollmentByCourseId.has(c.id)}
              percent={percentByCourseId.get(c.id)}
            />
          ))}
        </CourseRow>
      ))}
    </div>
  );
}
