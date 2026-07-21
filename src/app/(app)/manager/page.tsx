import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { getCourseProgressPercent } from "@/lib/enrollment";
import { getTotalPoints } from "@/lib/gamification";

export default async function ManagerDashboardPage() {
  const session = await auth();
  assertRole(session?.user?.role, "MANAGER");

  const reports = await prisma.user.findMany({
    where: session!.user.role === "ADMIN" ? {} : { managerId: session!.user.id },
    include: {
      department: true,
      enrollments: { where: { courseId: { not: null } }, include: { course: true } },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();

  const reportData = await Promise.all(
    reports.map(async (u) => {
      const completed = u.enrollments.filter((e) => e.status === "COMPLETED").length;
      const overdue = u.enrollments.filter((e) => e.dueDate && e.dueDate < now && e.status !== "COMPLETED");
      const points = await getTotalPoints(u.id);
      const enrollmentRows = await Promise.all(
        u.enrollments.map(async (e) => ({
          id: e.id,
          title: e.course?.title ?? "-",
          status: e.status,
          dueDate: e.dueDate,
          percent: e.courseId ? await getCourseProgressPercent(u.id, e.courseId) : 0,
        }))
      );
      return { user: u, completed, overdueCount: overdue.length, points, enrollmentRows };
    })
  );

  return (
    <div>
      <PageHeader
        title="Painel do Gestor"
        description={
          session!.user.role === "ADMIN"
            ? "Visão executiva de todos os colaboradores."
            : "Acompanhe o progresso e as notas dos seus liderados diretos."
        }
      />

      {reportData.length === 0 ? (
        <EmptyState title="Nenhum liderado direto vinculado a você ainda." />
      ) : (
        <div className="space-y-4">
          {reportData.map(({ user: u, completed, overdueCount, points, enrollmentRows }) => (
            <Card key={u.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{u.name}</h3>
                  <p className="text-xs text-slate-500">
                    {u.jobTitle ?? "-"} · {u.department?.name ?? "-"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge tone="info">{points} pts</Badge>
                  <Badge tone="success">{completed} concluído(s)</Badge>
                  {overdueCount > 0 && <Badge tone="warning">{overdueCount} atrasado(s)</Badge>}
                </div>
              </div>

              <table className="w-full text-xs">
                <thead className="text-slate-400 text-left">
                  <tr>
                    <th className="py-1 font-medium">Curso</th>
                    <th className="py-1 font-medium">Progresso</th>
                    <th className="py-1 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollmentRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="py-1.5">{row.title}</td>
                      <td className="py-1.5">{row.percent}%</td>
                      <td className="py-1.5">
                        <Badge
                          tone={
                            row.status === "COMPLETED"
                              ? "success"
                              : row.dueDate && row.dueDate < now
                              ? "warning"
                              : "default"
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {enrollmentRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-2 text-slate-400">
                        Nenhuma matrícula.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
