import Link from "next/link";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge, Label } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { deleteExternalTraining } from "../actions";
import {
  AddParticipantForm,
  ParticipantRow,
  CompetencyForm,
  StatusSelect,
} from "./client-widgets";
import { ArrowLeft, Trash2 } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  PRESENCIAL: "Presencial",
  WORKSHOP: "Workshop",
  CONFERENCIA: "Conferência",
  EXTERNO: "Externo",
  OUTRO: "Outro",
};

export default async function ExternalTrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  assertRole(session?.user?.role, "INSTRUCTOR");

  const [training, allUsers, skills] = await Promise.all([
    prisma.externalTraining.findUniqueOrThrow({
      where: { id },
      include: {
        participants: { include: { user: true }, orderBy: { createdAt: "asc" } },
        competencies: true,
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.competencySkill.findMany({ orderBy: { name: "asc" } }),
  ]);

  const participantUserIds = new Set(training.participants.map((p) => p.userId));
  const candidates = allUsers.filter((u) => !participantUserIds.has(u.id));

  return (
    <div>
      <Link
        href="/admin/treinamentos-externos"
        className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-4"
      >
        <ArrowLeft size={14} /> Voltar
      </Link>

      <PageHeader
        title={training.title}
        description={`${TYPE_LABEL[training.type]} · ${training.category}`}
        action={
          <form
            action={async () => {
              "use server";
              await deleteExternalTraining(training.id);
            }}
          >
            <button className="text-slate-400 hover:text-red-600 flex items-center gap-1 text-sm">
              <Trash2 size={16} /> Excluir
            </button>
          </form>
        }
      />

      <Card className="mb-6">
        <p className="text-sm text-slate-600 mb-4">{training.description}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <p className="text-xs text-slate-400">Instituição/Instrutor</p>
            <p className="text-slate-700">{training.provider ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Local</p>
            <p className="text-slate-700">{training.location ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Data</p>
            <p className="text-slate-700">
              {formatDate(training.startDate)}
              {training.endDate && ` – ${formatDate(training.endDate)}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Carga horária</p>
            <p className="text-slate-700">{training.durationHours ? `${training.durationHours}h` : "-"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label className="mb-0">Status:</Label>
          <StatusSelect trainingId={training.id} status={training.status} />
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <Label>Competências desenvolvidas neste treinamento</Label>
          <CompetencyForm
            trainingId={training.id}
            skills={skills}
            initial={training.competencies.map((c) => ({ skillId: c.competencySkillId, level: c.levelGranted }))}
          />
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-800 mb-4">
          Participantes <Badge tone="info">{training.participants.length}</Badge>
        </h3>
        <div className="space-y-3 mb-4">
          {training.participants.map((p) => (
            <ParticipantRow
              key={p.id}
              trainingId={training.id}
              participant={{
                id: p.id,
                userName: p.user.name,
                attended: p.attended,
                certificateUrl: p.certificateUrl,
                notes: p.notes,
              }}
            />
          ))}
          {training.participants.length === 0 && (
            <p className="text-sm text-slate-400">Nenhum participante adicionado ainda.</p>
          )}
        </div>
        <AddParticipantForm trainingId={training.id} candidates={candidates} />
      </Card>
    </div>
  );
}
