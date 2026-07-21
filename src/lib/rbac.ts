import type { Role } from "@prisma/client";

/**
 * Hierarquia de papéis (RBAC): cada papel herda o acesso dos papéis abaixo dele.
 * ADMIN > MANAGER > INSTRUCTOR > EMPLOYEE
 */
const ROLE_RANK: Record<Role, number> = {
  EMPLOYEE: 0,
  INSTRUCTOR: 1,
  MANAGER: 2,
  ADMIN: 3,
};

export function hasRole(userRole: Role | undefined, minimumRole: Role): boolean {
  if (!userRole) return false;
  return ROLE_RANK[userRole] >= ROLE_RANK[minimumRole];
}

export function canManageContent(role: Role | undefined): boolean {
  return hasRole(role, "INSTRUCTOR");
}

export function canAccessAdmin(role: Role | undefined): boolean {
  return hasRole(role, "ADMIN");
}

export function canAccessManagerDashboard(role: Role | undefined): boolean {
  return hasRole(role, "MANAGER");
}

export class ForbiddenError extends Error {
  constructor(message = "Acesso negado para este papel.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertRole(userRole: Role | undefined, minimumRole: Role) {
  if (!hasRole(userRole, minimumRole)) {
    throw new ForbiddenError();
  }
}
