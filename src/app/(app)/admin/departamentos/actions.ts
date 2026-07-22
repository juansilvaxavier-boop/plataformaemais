"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createDepartment(formData: FormData) {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome do departamento é obrigatório.");

  const dept = await prisma.department.create({ data: { name } });
  await logAudit({
    userId: session!.user.id,
    action: "DEPARTMENT_CREATED",
    entityType: "Department",
    entityId: dept.id,
    metadata: { name },
  });

  revalidatePath("/admin/departamentos");
}

export async function deleteDepartment(id: string) {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  await prisma.department.delete({ where: { id } });
  await logAudit({
    userId: session!.user.id,
    action: "DEPARTMENT_DELETED",
    entityType: "Department",
    entityId: id,
  });

  revalidatePath("/admin/departamentos");
}

export async function createJobRole(formData: FormData) {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const departmentId = String(formData.get("departmentId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!departmentId || !name) throw new Error("Departamento e nome do cargo são obrigatórios.");

  const jobRole = await prisma.jobRole.create({ data: { departmentId, name } });
  await logAudit({
    userId: session!.user.id,
    action: "JOB_ROLE_CREATED",
    entityType: "JobRole",
    entityId: jobRole.id,
    metadata: { name, departmentId },
  });

  revalidatePath("/admin/departamentos");
}

export async function deleteJobRole(id: string) {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  await prisma.jobRole.delete({ where: { id } });
  await logAudit({
    userId: session!.user.id,
    action: "JOB_ROLE_DELETED",
    entityType: "JobRole",
    entityId: id,
  });

  revalidatePath("/admin/departamentos");
}
