import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, XCircle, GraduationCap } from "lucide-react";

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { verificationCode: code },
    include: { user: true, course: true, learningPath: true },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <GraduationCap className="text-indigo-600" size={28} />
          <span className="text-lg font-bold text-slate-900">Plataforma+ | Verificação de Certificado</span>
        </div>

        {certificate ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto text-emerald-600 mb-3" size={40} />
            <p className="text-slate-500 text-sm mb-1">Certificado válido e autêntico</p>
            <h1 className="text-xl font-bold text-slate-900 mb-1">{certificate.user.name}</h1>
            <p className="text-slate-600 mb-4">
              concluiu {certificate.course ? "o curso" : "a trilha"}{" "}
              <strong>{certificate.course?.title ?? certificate.learningPath?.title}</strong>
            </p>
            <p className="text-xs text-slate-400">Emitido em {formatDate(certificate.issuedAt)}</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">{certificate.verificationCode}</p>
          </div>
        ) : (
          <div className="text-center">
            <XCircle className="mx-auto text-red-600 mb-3" size={40} />
            <p className="text-slate-700 font-medium">Código de verificação não encontrado.</p>
            <p className="text-xs text-slate-400 mt-1">Verifique se o código foi digitado corretamente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
