import Link from "next/link";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button, Input, Label, Select, Textarea, Badge } from "@/components/ui";
import { createExternalTraining } from "./actions";
import { formatDate } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  PRESENCIAL: "Presencial",
  WORKSHOP: "Workshop",
  CONFERENCIA: "Conferência",
  EXTERNO: "Externo",
  OUTRO: "Outro",
};

const STATUS_TONE: Record<string, "default" | "success" | "warning" | "danger"> = {
  AGENDADO: "warning",
  REALIZADO: "success",
  CANCELADO: "danger",
};

export default async function ExternalTrainingsPage() {
  const session = await auth();
  assertRole(session?.user?.role, "INSTRUCTOR");

  const trainings = await prisma.externalTraining.findMany({
    include: { _count: { select: { participants: true } } },
    orderBy: { startDate: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Treinamentos Presenciais e Externos"
        description="Registro e acompanhamento centralizado de capacitações fora do ambiente online (aulas presenciais, workshops, treinamentos externos)."
      />

      <Card className="mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Novo treinamento</h2>
        <form action={createExternalTraining} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Título</Label>
            <Input name="title" required />
          </div>
          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <Textarea name="description" rows={2} required />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select name="type" defaultValue="PRESENCIAL">
              <option value="PRESENCIAL">Presencial</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="CONFERENCIA">Conferência</option>
              <option value="EXTERNO">Externo (com instrutor externo)</option>
              <option value="OUTRO">Outro</option>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Input name="category" placeholder="Ex.: Liderança, Técnico, Segurança" required />
          </div>
          <div>
            <Label>Instituição / Instrutor externo</Label>
            <Input name="provider" placeholder="Ex.: SENAI, João Consultor" />
          </div>
          <div>
            <Label>Local</Label>
            <Input name="location" placeholder="Ex.: Auditório matriz, Online" />
          </div>
          <div>
            <Label>Data de início</Label>
            <Input name="startDate" type="date" required />
          </div>
          <div>
            <Label>Data de término (opcional)</Label>
            <Input name="endDate" type="date" />
          </div>
          <div>
            <Label>Carga horária (horas)</Label>
            <Input name="durationHours" type="number" min={0} step="0.5" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Criar e gerenciar participantes</Button>
          </div>
        </form>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Treinamento</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Participantes</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trainings.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/treinamentos-externos/${t.id}`}
                    className="font-medium text-indigo-700 hover:underline"
                  >
                    {t.title}
                  </Link>
                  <div className="text-xs text-slate-400">{t.category}</div>
                </td>
                <td className="px-4 py-3 text-slate-500">{TYPE_LABEL[t.type]}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(t.startDate)}</td>
                <td className="px-4 py-3 text-slate-500">{t._count.participants}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                </td>
              </tr>
            ))}
            {trainings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Nenhum treinamento presencial/externo registrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
