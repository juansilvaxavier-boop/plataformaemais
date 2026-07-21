import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader, Badge, Button } from "@/components/ui";
import { getCourseProgressPercent } from "@/lib/enrollment";
import { CheckCircle2, PlayCircle, Award } from "lucide-react";

export default async function LearningPathDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const path = await prisma.learningPath.findUnique({
    where: { id },
    include: { courses: { include: { course: true }, orderBy: { order: "asc" } } },
  });
  if (!path) notFound();

  const courseIds = path.courses.map((pc) => pc.courseId);
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, courseId: { in: courseIds } },
  });
  const enrollmentByCourseId = new Map(enrollments.map((e) => [e.courseId, e]));

  const certificate = await prisma.certificate.findFirst({ where: { userId, learningPathId: id } });

  return (
    <div>
      <PageHeader
        title={path.title}
        description={path.description}
        action={
          certificate && (
            <a href={`/api/certificates/${certificate.id}/pdf`} target="_blank">
              <Button>
                <Award size={16} /> Baixar certificado da trilha
              </Button>
            </a>
          )
        }
      />

      <Card>
        <ol className="space-y-3">
          {await Promise.all(
            path.courses.map(async (pc, idx) => {
              const enrollment = enrollmentByCourseId.get(pc.courseId);
              const percent = enrollment ? await getCourseProgressPercent(userId, pc.courseId) : 0;
              const completed = enrollment?.status === "COMPLETED";
              return (
                <li key={pc.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-semibold">
                      {idx + 1}
                    </span>
                    {completed ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : (
                      <PlayCircle size={18} className="text-slate-400" />
                    )}
                    <span className="font-medium text-slate-800">{pc.course.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={completed ? "success" : "default"}>{percent}%</Badge>
                    <Link href={`/cursos/${pc.courseId}`} className="text-sm text-indigo-600 hover:underline">
                      Abrir
                    </Link>
                  </div>
                </li>
              );
            })
          )}
        </ol>
      </Card>
    </div>
  );
}
