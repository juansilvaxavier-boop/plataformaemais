"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState, useTransition } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Route,
  Building,
  Award,
  Trophy,
  Bell,
  Users,
  ShieldCheck,
  BarChart3,
  UserCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { t, type TranslationKey } from "@/lib/i18n";
import { updateMyLocale } from "@/app/(app)/account-actions";
import { Logo } from "@/components/logo";

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  icon: React.ElementType;
  minRole?: Role;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "nav_home", icon: LayoutDashboard },
  { href: "/cursos", labelKey: "nav_courses", icon: BookOpen },
  { href: "/trilhas", labelKey: "nav_paths", icon: Route },
  { href: "/treinamentos-externos", labelKey: "nav_external_trainings", icon: Building },
  { href: "/certificados", labelKey: "nav_certificates", icon: Award },
  { href: "/ranking", labelKey: "nav_ranking", icon: Trophy },
  { href: "/notificacoes", labelKey: "nav_notifications", icon: Bell },
  { href: "/manager", labelKey: "nav_manager", icon: Users, minRole: "MANAGER" },
  { href: "/admin", labelKey: "nav_admin", icon: ShieldCheck, minRole: "ADMIN" },
  { href: "/admin/relatorios", labelKey: "nav_reports", icon: BarChart3, minRole: "ADMIN" },
];

const ROLE_RANK: Record<Role, number> = { EMPLOYEE: 0, INSTRUCTOR: 1, MANAGER: 2, ADMIN: 3 };

export function SidebarNav({ role, locale }: { role: Role; locale: string }) {
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha o menu ao navegar para outra página (mobile).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Barra superior visível apenas em telas pequenas */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-950 text-white sticky top-0 z-30">
        <Logo theme="dark" />
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-800"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "w-64 shrink-0 bg-slate-950 text-slate-200 flex flex-col min-h-screen",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
          <Logo theme="dark" />
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-slate-800"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter((item) => !item.minRole || ROLE_RANK[role] >= ROLE_RANK[item.minRole]).map(
            (item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon size={18} />
                  {t(locale, item.labelKey)}
                </Link>
              );
            }
          )}
        </nav>
        <div className="px-3 py-3 border-t border-slate-800">
          <Link
            href="/conta"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1",
              pathname.startsWith("/conta")
                ? "bg-indigo-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <UserCircle size={18} />
            {t(locale, "nav_account")}
          </Link>
          <select
            defaultValue={locale}
            onChange={(e) => startTransition(() => updateMyLocale(e.target.value))}
            className="w-full bg-slate-900 text-slate-300 text-xs rounded-lg px-2 py-1.5 mb-2 border border-slate-800"
          >
            <option value="pt-BR">Português (BR)</option>
            <option value="en">English</option>
          </select>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white w-full"
          >
            <LogOut size={18} />
            {t(locale, "nav_signout")}
          </button>
        </div>
      </aside>
    </>
  );
}
