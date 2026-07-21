/**
 * Suporte multi-idioma (pt-BR / en). Escopo desta implementação: mecanismo de
 * tradução completo e aplicado à navegação principal e às telas de maior
 * tráfego. Para cobrir 100% da interface, use `t(locale, key)` nos textos
 * restantes seguindo o mesmo padrão dos dicionários abaixo.
 */

export const SUPPORTED_LOCALES = ["pt-BR", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const dictionaries = {
  "pt-BR": {
    nav_home: "Início",
    nav_courses: "Cursos",
    nav_paths: "Trilhas",
    nav_certificates: "Certificados",
    nav_ranking: "Ranking",
    nav_notifications: "Notificações",
    nav_manager: "Painel do Gestor",
    nav_admin: "Administração",
    nav_reports: "Relatórios & Auditoria",
    nav_signout: "Sair",
    dashboard_greeting: "Olá",
    dashboard_subtitle: "Continue sua jornada de aprendizado.",
  },
  en: {
    nav_home: "Home",
    nav_courses: "Courses",
    nav_paths: "Learning Paths",
    nav_certificates: "Certificates",
    nav_ranking: "Leaderboard",
    nav_notifications: "Notifications",
    nav_manager: "Manager Dashboard",
    nav_admin: "Administration",
    nav_reports: "Reports & Audit",
    nav_signout: "Sign out",
    dashboard_greeting: "Hello",
    dashboard_subtitle: "Continue your learning journey.",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type TranslationKey = keyof (typeof dictionaries)["pt-BR"];

export function t(locale: string | undefined | null, key: TranslationKey): string {
  const dict = dictionaries[(locale as Locale) in dictionaries ? (locale as Locale) : "pt-BR"];
  return dict[key];
}
