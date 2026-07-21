import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button, Input, Label, Select } from "@/components/ui";
import { createBadge, deleteBadge } from "./actions";
import { Trash2 } from "lucide-react";

export default async function BadgesPage() {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const badges = await prisma.badge.findMany({ include: { _count: { select: { users: true } } } });

  return (
    <div>
      <PageHeader title="Badges & Gamificação" description="Configure conquistas concedidas automaticamente." />

      <Card className="mb-6">
        <form action={createBadge} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Nome</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input name="description" required />
          </div>
          <div>
            <Label>Critério</Label>
            <Select name="type" defaultValue="COURSE_COMPLETIONS">
              <option value="COURSE_COMPLETIONS">Cursos concluídos</option>
              <option value="CERTIFICATES">Certificados emitidos</option>
              <option value="STREAK">Sequência de dias (streak)</option>
              <option value="QUIZ_PERFECT">Quizzes com nota 100%</option>
            </Select>
          </div>
          <div>
            <Label>Valor (quantidade/dias)</Label>
            <Input name="value" type="number" min={1} defaultValue={1} />
          </div>
          <div className="md:col-span-4">
            <Button type="submit">Criar badge</Button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {badges.map((b) => (
          <Card key={b.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{b.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{b.description}</p>
                <p className="text-xs text-slate-400 mt-2">{b._count.users} conquistada(s)</p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await deleteBadge(b.id);
                }}
              >
                <button className="text-slate-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
