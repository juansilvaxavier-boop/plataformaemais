import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, Button, EmptyState } from "@/components/ui";
import { getCourseProgressPercent } from "@/lib/enrollment";
import { EnrollButton } from "./enroll-button";
import { CourseBrowser, type BrowsableCourse } from "./course-browser";
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

  const items: BrowsableCourse[] = courses.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    coverUrl: c.coverUrl,
    description: c.description,
    enrolled: enrollmentByCourseId.has(c.id),
    inProgress: enrollmentByCourseId.get(c.id)?.status === "IN_PROGRESS",
    percent: percentByCourseId.get(c.id),
  }));

  const featured =
    items.find((c) => c.inProgress) ?? items.find((c) => !c.enrolled) ?? items[0];
  const featuredCourse = courses.find((c) => c.id === featured.id)!;

  return (
    <div className="-mt-2">
      {/* Hero em destaque, no estilo "vitrine" */}
      <div className="relative rounded-2xl overflow-hidden mb-10 bg-gradient-to-br from-[#0b6350] via-[#0a4e3f] to-slate-900 text-white">
        {featuredCourse.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- capa é URL arbitrária definida pelo instrutor
          <img
            src={featuredCourse.coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative p-8 md:p-12 max-w-2xl">
          <Badge tone="info" className="mb-3">
            {featured.enrolled ? "Continue assistindo" : "Em destaque"}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{featuredCourse.title}</h1>
          <p className="text-white/80 mb-6 line-clamp-3">{featuredCourse.description}</p>
          {featured.enrolled ? (
            <Link href={`/cursos/${featuredCourse.id}`}>
              <Button size="md" className="bg-white text-slate-900 hover:bg-slate-100">
                <Play size={16} fill="currentColor" /> Continuar curso
              </Button>
            </Link>
          ) : (
            <EnrollButton courseId={featuredCourse.id} />
          )}
        </div>
      </div>

      <CourseBrowser items={items} />
    </div>
  );
}
