import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button, Input, Label } from "@/components/ui";
import { createDepartment, deleteDepartment } from "./actions";
import { Trash2 } from "lucide-react";

export default async function DepartamentosPage() {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const departments = await prisma.department.findMany({
    include: { _count: { select: { users: true } } },
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
    </div>
  );
}
