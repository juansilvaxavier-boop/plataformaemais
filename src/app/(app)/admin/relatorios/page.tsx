import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { RecertificationCheckButton } from "./recert-button";
import { Download } from "lucide-react";

export default async function RelatoriosPage() {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Relatórios & Auditoria"
        description="Logs auditáveis para conformidade legal e de RH."
        action={
          <a href="/api/reports/audit.csv">
            <Button>
              <Download size={16} /> Exportar CSV
            </Button>
          </a>
        }
      />

      <Card className="mb-6">
        <h3 className="font-semibold text-slate-800 mb-2 text-sm">Recertificação automática</h3>
        <p className="text-xs text-slate-500 mb-3">
          Verifica cursos com validade vencida e reabre a matrícula para renovação. Em produção,
          agende esta verificação via cron externo apontando para{" "}
          <code className="bg-slate-100 px-1 rounded">POST /api/admin/recertification-check</code>.
        </p>
        <RecertificationCheckButton />
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Data/Hora</th>
              <th className="px-4 py-2 font-medium">Usuário</th>
              <th className="px-4 py-2 font-medium">Ação</th>
              <th className="px-4 py-2 font-medium">Entidade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 text-slate-500">{formatDateTime(l.createdAt)}</td>
                <td className="px-4 py-2">{l.user?.name ?? "Sistema"}</td>
                <td className="px-4 py-2 font-mono">{l.action}</td>
                <td className="px-4 py-2 text-slate-500">
                  {l.entityType} {l.entityId ? `#${l.entityId.slice(0, 8)}` : ""}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Nenhum evento registrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
