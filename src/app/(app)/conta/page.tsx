import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { ChangePasswordForm } from "./change-password-form";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gestor",
  INSTRUCTOR: "Instrutor",
  EMPLOYEE: "Colaborador",
};

export default async function ContaPage() {
  const session = await auth();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    include: { department: true, manager: true },
  });

  return (
    <div>
      <PageHeader title="Minha Conta" description="Dados do perfil e segurança da conta." />

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">Nome</p>
            <p className="text-slate-700 font-medium">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">E-mail</p>
            <p className="text-slate-700 font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Cargo</p>
            <p className="text-slate-700 font-medium">{user.jobTitle ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Departamento</p>
            <p className="text-slate-700 font-medium">{user.department?.name ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Gestor direto</p>
            <p className="text-slate-700 font-medium">{user.manager?.name ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Papel (RBAC)</p>
            <Badge tone="info">{ROLE_LABEL[user.role]}</Badge>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          O idioma da interface pode ser alterado no seletor no rodapé da barra lateral.
        </p>
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-800 mb-4 text-sm">Alterar senha</h3>
        {user.passwordHash ? (
          <ChangePasswordForm />
        ) : (
          <p className="text-sm text-slate-500">
            Esta conta usa login via SSO (Google/Microsoft/Okta) e não possui senha local para alterar.
          </p>
        )}
      </Card>
    </div>
  );
}
