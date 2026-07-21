"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function enrollInCourse(courseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    update: {},
    create: { userId: session.user.id, courseId, assignedReason: "MANUAL" },
  });

  await logAudit({
    userId: session.user.id,
    action: "COURSE_ENROLLED",
    entityType: "Course",
    entityId: courseId,
  });

  revalidatePath("/cursos");
  revalidatePath(`/cursos/${courseId}`);
}

export async function submitCourseFeedback(courseId: string, rating: number, comment: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.courseFeedback.upsert({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    update: { rating, comment },
    create: { userId: session.user.id, courseId, rating, comment },
  });

  const { awardPoints, POINTS } = await import("@/lib/gamification");
  await awardPoints(session.user.id, POINTS.FEEDBACK_GIVEN, "FEEDBACK_GIVEN", courseId);

  revalidatePath(`/cursos/${courseId}`);
}
