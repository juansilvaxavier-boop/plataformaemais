"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateMyLocale(locale: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
  await prisma.user.update({ where: { id: session.user.id }, data: { locale } });
  revalidatePath("/", "layout");
}
