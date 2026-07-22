import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button, Input, Label } from "@/components/ui";
import { createDepartment, deleteDepartment, createJobRole, deleteJobRole } from "./actions";
import { Trash2 } from "lucide-react";

export default async function DepartamentosPage() {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const departments = await prisma.department.findMany({
    include: { _count: { select: { users: true } }, jobRoles: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Departamentos" description="Gerencie os departamentos da organização." />

      <Card className="mb-6">
        <form action={createDepartment} className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="name">Novo departamento</Label>
            <Input id="name" name="name" placeholder="Ex.: Recursos Humanos" required />
          </div>
          <Button type="submit">Adicionar</Button>
        </form>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Colaboradores</th>
              <th className="px-4 py-3 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {departments.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3">{d.name}</td>
                <td className="px-4 py-3">{d._count.users}</td>
                <td className="px-4 py-3">
                  <form
                    action={async () => {
                      "use server";
                      await deleteDepartment(d.id);
                    }}
                  >
                    <button className="text-slate-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  Nenhum departamento cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="mt-8">
        <h2 className="font-semibold text-slate-800 mb-1">Cargos por departamento</h2>
        <p className="text-sm text-slate-500 mb-4">
          Cadastre os cargos existentes em cada departamento. Eles aparecem como sugestão ao
          cadastrar um colaborador.
        </p>

        {departments.length === 0 && (
          <p className="text-sm text-slate-400">Cadastre um departamento primeiro.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {departments.map((d) => (
            <Card key={d.id}>
              <h3 className="font-medium text-slate-800 mb-3">{d.name}</h3>

              <div className="flex flex-wrap gap-2 mb-3">
                {d.jobRoles.map((jr) => (
                  <span
                    key={jr.id}
                    className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 rounded-full pl-3 pr-1.5 py-1"
                  >
                    {jr.name}
                    <form
                      action={async () => {
                        "use server";
                        await deleteJobRole(jr.id);
                      }}
                    >
                      <button className="text-slate-400 hover:text-red-600" title="Remover cargo">
                        <Trash2 size={12} />
                      </button>
                    </form>
                  </span>
                ))}
                {d.jobRoles.length === 0 && (
                  <span className="text-xs text-slate-400">Nenhum cargo cadastrado.</span>
                )}
              </div>

              <form action={createJobRole} className="flex items-end gap-2">
                <input type="hidden" name="departmentId" value={d.id} />
                <div className="flex-1">
                  <Label className="text-xs">Novo cargo</Label>
                  <Input name="name" placeholder="Ex.: Analista de Marketing" required />
                </div>
                <Button type="submit" size="sm">
                  Adicionar
                </Button>
              </form>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
