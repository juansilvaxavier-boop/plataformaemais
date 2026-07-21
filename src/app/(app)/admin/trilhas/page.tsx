import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button, Input, Label, Textarea, Badge } from "@/components/ui";
import { createLearningPath, deleteLearningPath } from "./actions";
import { PathRolesForm, PathDepartmentsForm, AddCourseToPath, RemoveCourseButton } from "./client-widgets";
import { Trash2 } from "lucide-react";

export default async function TrilhasPage() {
  const session = await auth();
  assertRole(session?.user?.role, "INSTRUCTOR");

  const [paths, departments, courses] = await Promise.all([
    prisma.learningPath.findMany({
      include: { targetRoles: true, targetDepartments: true, courses: { include: { course: true }, orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.course.findMany({ orderBy: { title: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Trilhas de Aprendizagem"
        description="Agrupe cursos em formações completas (ex.: Onboarding, Liderança)."
      />

      <Card className="mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Nova trilha</h2>
        <form action={createLearningPath} className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input name="title" required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea name="description" rows={2} required />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="isOnboarding" /> Trilha de onboarding (matrícula automática para novos colaboradores)
          </label>
          <Button type="submit">Criar trilha</Button>
        </form>
      </Card>

      <div className="space-y-6">
        {paths.map((path) => (
          <Card key={path.id}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-800">
                  {path.title} {path.isOnboarding && <Badge tone="info">Onboarding</Badge>}
                </h3>
                <p className="text-sm text-slate-500">{path.description}</p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await deleteLearningPath(path.id);
                }}
              >
                <button className="text-slate-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Papéis-alvo</Label>
                <PathRolesForm pathId={path.id} selected={path.targetRoles.map((r) => r.role)} />
              </div>
              <div>
                <Label>Departamentos-alvo</Label>
                <PathDepartmentsForm
                  pathId={path.id}
                  departments={departments}
                  selected={path.targetDepartments.map((d) => d.departmentId)}
                />
              </div>
            </div>

            <div>
              <Label>Cursos na trilha (sequencial)</Label>
              <ol className="space-y-1 mb-3 list-decimal list-inside text-sm">
                {path.courses.map((pc) => (
                  <li key={pc.id} className="flex items-center justify-between">
                    <span>{pc.course.title}</span>
                    <RemoveCourseButton pathId={path.id} courseId={pc.courseId} />
                  </li>
                ))}
                {path.courses.length === 0 && <p className="text-slate-400 text-sm">Nenhum curso adicionado.</p>}
              </ol>
              <AddCourseToPath
                pathId={path.id}
                courses={courses.filter((c) => !path.courses.some((pc) => pc.courseId === c.id))}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
