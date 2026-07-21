import Link from "next/link";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import {
  Users,
  BookOpen,
  Route,
  Building2,
  BarChart3,
  Target,
  Award,
} from "lucide-react";

export default async function AdminHomePage() {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const [users, courses, paths, departments, certificates] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.learningPath.count(),
    prisma.department.count(),
    prisma.certificate.count(),
  ]);

  const links = [
    { href: "/admin/usuarios", label: "Colaboradores", value: users, icon: Users },
    { href: "/admin/cursos", label: "Cursos", value: courses, icon: BookOpen },
    { href: "/admin/trilhas", label: "Trilhas", value: paths, icon: Route },
    { href: "/admin/departamentos", label: "Departamentos", value: departments, icon: Building2 },
    { href: "/admin/competencias", label: "Matriz de Competências", value: "", icon: Target },
    { href: "/admin/badges", label: "Badges & Gamificação", value: "", icon: Award },
    { href: "/admin/relatorios", label: "Relatórios & Auditoria", value: certificates, icon: BarChart3 },
  ];

  return (
    <div>
      <PageHeader title="Administração" description="Visão geral da plataforma." />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href}>
              <Card className="hover:border-indigo-300 transition-colors">
                <Icon className="text-indigo-600 mb-3" size={22} />
                <p className="text-sm text-slate-500">{l.label}</p>
                {l.value !== "" && <p className="text-2xl font-bold text-slate-900">{l.value}</p>}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
