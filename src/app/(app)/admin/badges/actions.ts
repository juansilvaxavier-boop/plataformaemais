"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function createBadge(formData: FormData) {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const icon = String(formData.get("icon") ?? "award");
  const type = String(formData.get("type") ?? "COURSE_COMPLETIONS");
  const value = Number(formData.get("value") ?? 1);

  if (!name || !description) throw new Error("Nome e descrição são obrigatórios.");

  const criteria =
    type === "STREAK" ? { type: "STREAK", days: value } : { type, count: value };

  await prisma.badge.create({ data: { name, description, icon, criteria } });
  revalidatePath("/admin/badges");
}

export async function deleteBadge(id: string) {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");
  await prisma.badge.delete({ where: { id } });
  revalidatePath("/admin/badges");
}
