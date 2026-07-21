import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, Clock, ExternalLink } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  PRESENCIAL: "Presencial",
  WORKSHOP: "Workshop",
  CONFERENCIA: "Conferência",
  EXTERNO: "Externo",
  OUTRO: "Outro",
};

export default async function MyExternalTrainingsPage() {
  const session = await auth();

  const participations = await prisma.externalTrainingParticipant.findMany({
    where: { userId: session!.user.id },
    include: { externalTraining: true },
    orderBy: { externalTraining: { startDate: "desc" } },
  });

  return (
    <div>
      <PageHeader
        title="Treinamentos Presenciais e Externos"
        description="Histórico centralizado de capacitações realizadas fora do ambiente online: aulas presenciais, workshops e treinamentos externos."
      />

      {participations.length === 0 ? (
        <EmptyState
          title="Nenhum treinamento externo registrado ainda"
          description="Quando você participar de um treinamento presencial ou externo, o RH registrará sua presença aqui."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {participations.map((p) => {
            const t = p.externalTraining;
            return (
              <Card key={p.id}>
                <div className="flex items-center justify-between mb-2">
                  <Badge>{TYPE_LABEL[t.type]}</Badge>
                  {p.attended ? (
                    <Badge tone="success">
                      <CheckCircle2 size={12} className="mr-1 inline" /> Concluído
                    </Badge>
                  ) : (
                    <Badge tone="warning">
                      <Clock size={12} className="mr-1 inline" /> Pendente
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{t.title}</h3>
                <p className="text-xs text-slate-500 mb-3">{t.description}</p>
                <div className="text-xs text-slate-500 space-y-1 mb-3">
                  <p>
                    {formatDate(t.startDate)}
                    {t.endDate && ` – ${formatDate(t.endDate)}`}
                    {t.durationHours && ` · ${t.durationHours}h`}
                  </p>
                  {t.provider && <p>{t.provider}</p>}
                  {t.location && <p>{t.location}</p>}
                </div>
                {p.certificateUrl && (
                  <a
                    href={p.certificateUrl}
                    target="_blank"
                    className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={14} /> Ver comprovante/certificado
                  </a>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
