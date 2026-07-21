"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function createCompetencySkill(formData: FormData) {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!name || !category) throw new Error("Nome e categoria são obrigatórios.");

  await prisma.competencySkill.create({ data: { name, category } });
  revalidatePath("/admin/competencias");
}
