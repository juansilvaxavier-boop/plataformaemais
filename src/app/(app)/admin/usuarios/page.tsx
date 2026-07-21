import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button, Input, Label, Select, Badge } from "@/components/ui";
import { createUser } from "./actions";
import { RoleSelect, ActiveToggle } from "./role-select";

export default async function UsuariosPage() {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const [users, departments, managers] = await Promise.all([
    prisma.user.findMany({
      include: { department: true, manager: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: { in: ["MANAGER", "ADMIN"] } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Colaboradores"
        description="Cadastre colaboradores e gerencie papéis (RBAC) e departamentos."
      />

      <Card className="mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Novo colaborador</h2>
        <form action={createUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Nome</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>Senha inicial</Label>
            <Input name="password" type="password" required minLength={6} />
          </div>
          <div>
            <Label>Cargo</Label>
            <Input name="jobTitle" placeholder="Ex.: Analista de Marketing" />
          </div>
          <div>
            <Label>Papel (RBAC)</Label>
            <Select name="role" defaultValue="EMPLOYEE">
              <option value="EMPLOYEE">Colaborador</option>
              <option value="INSTRUCTOR">Instrutor</option>
              <option value="MANAGER">Gestor</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </div>
          <div>
            <Label>Departamento</Label>
            <Select name="departmentId" defaultValue="">
              <option value="">-</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Gestor direto</Label>
            <Select name="managerId" defaultValue="">
              <option value="">-</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-3">
            <Button type="submit">Cadastrar colaborador</Button>
          </div>
        </form>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Departamento</th>
              <th className="px-4 py-3 font-medium">Gestor</th>
              <th className="px-4 py-3 font-medium">Papel</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3 text-slate-500">{u.department?.name ?? "-"}</td>
                <td className="px-4 py-3 text-slate-500">{u.manager?.name ?? "-"}</td>
                <td className="px-4 py-3">
                  <RoleSelect userId={u.id} role={u.role} />
                </td>
                <td className="px-4 py-3">
                  {u.active ? (
                    <Badge tone="success">Ativo</Badge>
                  ) : (
                    <Badge tone="danger">Inativo</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ActiveToggle userId={u.id} active={u.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
