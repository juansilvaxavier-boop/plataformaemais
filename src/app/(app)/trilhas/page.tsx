import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";

const STATUS_LABEL: Record<string, { label: string; tone: "default" | "success" | "info" }> = {
  NOT_STARTED: { label: "Não iniciado", tone: "default" },
  IN_PROGRESS: { label: "Em andamento", tone: "info" },
  COMPLETED: { label: "Concluído", tone: "success" },
};

export default async function TrilhasEmployeePage() {
  const session = await auth();
  const userId = session!.user.id;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId, learningPathId: { not: null } },
    include: { learningPath: { include: { courses: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Trilhas de Aprendizagem" description="Formações completas atribuídas ao seu cargo ou departamento." />

      {enrollments.length === 0 ? (
        <EmptyState title="Nenhuma trilha atribuída ainda." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrollments.map((e) => (
            <Link key={e.id} href={`/trilhas/${e.learningPathId}`}>
              <Card className="hover:border-indigo-300 h-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <Badge tone={STATUS_LABEL[e.status]?.tone ?? "default"}>
                    {STATUS_LABEL[e.status]?.label ?? e.status}
                  </Badge>
                  <Badge tone="info">{e.learningPath?.courses.length} curso(s)</Badge>
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{e.learningPath?.title}</h3>
                <p className="text-xs text-slate-500 flex-1">{e.learningPath?.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
