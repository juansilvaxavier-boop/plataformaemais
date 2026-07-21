import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { Award, ExternalLink } from "lucide-react";

export default async function CertificadosPage() {
  const session = await auth();
  const certificates = await prisma.certificate.findMany({
    where: { userId: session!.user.id },
    include: { course: true, learningPath: true },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Meus Certificados" description="Certificados emitidos automaticamente ao concluir cursos e trilhas." />

      {certificates.length === 0 ? (
        <EmptyState title="Nenhum certificado emitido ainda" description="Conclua um curso para gerar seu certificado." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certificates.map((c) => (
            <Card key={c.id} className="flex items-start gap-4">
              <Award className="text-indigo-600 shrink-0" size={28} />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">{c.course?.title ?? c.learningPath?.title}</h3>
                <p className="text-xs text-slate-400 mb-2">
                  Emitido em {formatDate(c.issuedAt)} · {c.verificationCode}
                </p>
                <div className="flex gap-2">
                  <a href={`/api/certificates/${c.id}/pdf`} target="_blank">
                    <Button size="sm">Baixar PDF</Button>
                  </a>
                  <a href={`/verify/${c.verificationCode}`} target="_blank">
                    <Button size="sm" variant="secondary">
                      <ExternalLink size={14} /> Verificar
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
