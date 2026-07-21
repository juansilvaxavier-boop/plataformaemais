"use client";

import { useTransition } from "react";
import type { Role } from "@prisma/client";
import { updateUserRole, toggleUserActive } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gestor",
  INSTRUCTOR: "Instrutor",
  EMPLOYEE: "Colaborador",
};

export function RoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={role}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateUserRole(userId, e.target.value as Role))}
      className="text-xs rounded border border-slate-300 px-2 py-1 bg-white disabled:opacity-50"
    >
      {Object.entries(ROLE_LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function ActiveToggle({ userId, active }: { userId: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => toggleUserActive(userId, !active))}
      className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
    >
      {active ? "Desativar" : "Reativar"}
    </button>
  );
}
