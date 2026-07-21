"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";

async function requireInstructor() {
  const session = await auth();
  assertRole(session?.user?.role, "INSTRUCTOR");
  return session!;
}

export async function createLearningPath(formData: FormData) {
  const session = await requireInstructor();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isOnboarding = formData.get("isOnboarding") === "on";

  if (!title || !description) throw new Error("Título e descrição são obrigatórios.");

  const path = await prisma.learningPath.create({ data: { title, description, isOnboarding } });
  await logAudit({ userId: session.user.id, action: "LEARNING_PATH_CREATED", entityType: "LearningPath", entityId: path.id });
  revalidatePath("/admin/trilhas");
}

export async function deleteLearningPath(id: string) {
  await requireInstructor();
  await prisma.learningPath.delete({ where: { id } });
  revalidatePath("/admin/trilhas");
}

export async function addCourseToPath(pathId: string, courseId: string) {
  await requireInstructor();
  const count = await prisma.learningPathCourse.count({ where: { learningPathId: pathId } });
  await prisma.learningPathCourse.upsert({
    where: { learningPathId_courseId: { learningPathId: pathId, courseId } },
    update: {},
    create: { learningPathId: pathId, courseId, order: count },
  });
  revalidatePath("/admin/trilhas");
}

export async function removeCourseFromPath(pathId: string, courseId: string) {
  await requireInstructor();
  await prisma.learningPathCourse.delete({
    where: { learningPathId_courseId: { learningPathId: pathId, courseId } },
  });
  revalidatePath("/admin/trilhas");
}

export async function setPathTargetRoles(pathId: string, roles: Role[]) {
  await requireInstructor();
  await prisma.learningPathTargetRole.deleteMany({ where: { learningPathId: pathId } });
  if (roles.length > 0) {
    await prisma.learningPathTargetRole.createMany({
      data: roles.map((role) => ({ learningPathId: pathId, role })),
    });
  }
  revalidatePath("/admin/trilhas");
}

export async function setPathTargetDepartments(pathId: string, departmentIds: string[]) {
  await requireInstructor();
  await prisma.learningPathTargetDepartment.deleteMany({ where: { learningPathId: pathId } });
  if (departmentIds.length > 0) {
    await prisma.learningPathTargetDepartment.createMany({
      data: departmentIds.map((departmentId) => ({ learningPathId: pathId, departmentId })),
    });
  }
  revalidatePath("/admin/trilhas");
}
