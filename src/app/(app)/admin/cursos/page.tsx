import Link from "next/link";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button, Badge } from "@/components/ui";

export default async function AdminCursosPage() {
  const session = await auth();
  assertRole(session?.user?.role, "INSTRUCTOR");

  const courses = await prisma.course.findMany({
    include: { _count: { select: { modules: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Gestão de Cursos"
        description="Crie e organize módulos, aulas, materiais e avaliações."
        action={
          <Link href="/admin/cursos/novo">
            <Button>Novo curso</Button>
          </Link>
        }
      />

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Curso</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Módulos</th>
              <th className="px-4 py-3 font-medium">Matrículas</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/cursos/${c.id}`} className="font-medium text-indigo-700 hover:underline">
                    {c.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{c.category}</td>
                <td className="px-4 py-3 text-slate-500">{c._count.modules}</td>
                <td className="px-4 py-3 text-slate-500">{c._count.enrollments}</td>
                <td className="px-4 py-3">
                  {c.published ? <Badge tone="success">Publicado</Badge> : <Badge>Rascunho</Badge>}
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Nenhum curso criado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
