import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button, Input, Label } from "@/components/ui";
import { createCompetencySkill } from "./actions";
import { cn } from "@/lib/utils";

export default async function CompetenciasPage() {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const [skills, users, levels] = await Promise.all([
    prisma.competencySkill.findMany({ orderBy: { category: "asc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 50 }),
    prisma.userCompetency.findMany(),
  ]);

  const levelMap = new Map(levels.map((l) => [`${l.userId}:${l.competencySkillId}`, l.level]));

  function levelColor(level: number) {
    if (level === 0) return "bg-red-50 text-red-500";
    if (level <= 2) return "bg-amber-50 text-amber-600";
    return "bg-emerald-50 text-emerald-700";
  }

  return (
    <div>
      <PageHeader
        title="Matriz de Competências"
        description="Mapeamento das habilidades adquiridas e lacunas de treinamento por colaborador."
      />

      <Card className="mb-6">
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">Nova competência</h3>
        <form action={createCompetencySkill} className="flex gap-3 items-end">
          <div className="flex-1">
            <Label>Nome</Label>
            <Input name="name" placeholder="Ex.: Excel Avançado" required />
          </div>
          <div className="flex-1">
            <Label>Categoria</Label>
            <Input name="category" placeholder="Ex.: Ferramentas" required />
          </div>
          <Button type="submit">Adicionar</Button>
        </form>
      </Card>

      <Card className="p-0 overflow-x-auto">
        <table className="text-xs min-w-full">
          <thead className="bg-slate-50 text-slate-500 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium sticky left-0 bg-slate-50">Colaborador</th>
              {skills.map((s) => (
                <th key={s.id} className="px-3 py-2 font-medium whitespace-nowrap">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2 font-medium text-slate-700 sticky left-0 bg-white">{u.name}</td>
                {skills.map((s) => {
                  const level = levelMap.get(`${u.id}:${s.id}`) ?? 0;
                  return (
                    <td key={s.id} className="px-3 py-2 text-center">
                      <span className={cn("inline-block w-7 h-7 leading-7 rounded-full font-semibold", levelColor(level))}>
                        {level}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            {skills.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-slate-400">
                  Cadastre competências e vincule-as aos cursos para visualizar a matriz.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
