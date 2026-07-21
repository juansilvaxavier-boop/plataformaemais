"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { awardPoints, checkAndAwardBadges, POINTS } from "@/lib/gamification";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ExternalTrainingStatus, ExternalTrainingType } from "@prisma/client";

async function requireInstructor() {
  const session = await auth();
  assertRole(session?.user?.role, "INSTRUCTOR");
  return session!;
}

export async function createExternalTraining(formData: FormData) {
  const session = await requireInstructor();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "PRESENCIAL") as ExternalTrainingType;
  const provider = String(formData.get("provider") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim();
  const startDate = new Date(String(formData.get("startDate")));
  const endDateRaw = String(formData.get("endDate") ?? "").trim();
  const endDate = endDateRaw ? new Date(endDateRaw) : null;
  const durationHours = formData.get("durationHours") ? Number(formData.get("durationHours")) : null;

  if (!title || !description || !category || Number.isNaN(startDate.getTime())) {
    throw new Error("Título, descrição, categoria e data de início são obrigatórios.");
  }

  const training = await prisma.externalTraining.create({
    data: {
      title,
      description,
      type,
      provider,
      location,
      category,
      startDate,
      endDate,
      durationHours,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "EXTERNAL_TRAINING_CREATED",
    entityType: "ExternalTraining",
    entityId: training.id,
  });

  redirect(`/admin/treinamentos-externos/${training.id}`);
}

export async function setExternalTrainingStatus(trainingId: string, status: ExternalTrainingStatus) {
  const session = await requireInstructor();
  await prisma.externalTraining.update({ where: { id: trainingId }, data: { status } });
  await logAudit({
    userId: session.user.id,
    action: "EXTERNAL_TRAINING_STATUS_UPDATED",
    entityType: "ExternalTraining",
    entityId: trainingId,
    metadata: { status },
  });
  revalidatePath(`/admin/treinamentos-externos/${trainingId}`);
  revalidatePath("/admin/treinamentos-externos");
}

export async function deleteExternalTraining(trainingId: string) {
  await requireInstructor();
  await prisma.externalTraining.delete({ where: { id: trainingId } });
  revalidatePath("/admin/treinamentos-externos");
}

export async function addParticipant(trainingId: string, userId: string) {
  await requireInstructor();
  await prisma.externalTrainingParticipant.upsert({
    where: { externalTrainingId_userId: { externalTrainingId: trainingId, userId } },
    update: {},
    create: { externalTrainingId: trainingId, userId },
  });
  revalidatePath(`/admin/treinamentos-externos/${trainingId}`);
}

export async function removeParticipant(trainingId: string, participantId: string) {
  await requireInstructor();
  await prisma.externalTrainingParticipant.delete({ where: { id: participantId } });
  revalidatePath(`/admin/treinamentos-externos/${trainingId}`);
}

export async function updateParticipantCompletion(
  trainingId: string,
  participantId: string,
  params: { attended: boolean; certificateUrl?: string; notes?: string }
) {
  const session = await requireInstructor();

  const participant = await prisma.externalTrainingParticipant.findUniqueOrThrow({
    where: { id: participantId },
  });
  const wasAttended = participant.attended;

  const updated = await prisma.externalTrainingParticipant.update({
    where: { id: participantId },
    data: {
      attended: params.attended,
      completionDate: params.attended ? (participant.completionDate ?? new Date()) : null,
      certificateUrl: params.certificateUrl,
      notes: params.notes,
    },
  });

  if (params.attended && !wasAttended) {
    const training = await prisma.externalTraining.findUniqueOrThrow({
      where: { id: trainingId },
      include: { competencies: true },
    });

    for (const comp of training.competencies) {
      await prisma.userCompetency.upsert({
        where: {
          userId_competencySkillId: { userId: participant.userId, competencySkillId: comp.competencySkillId },
        },
        update: { level: comp.levelGranted },
        create: {
          userId: participant.userId,
          competencySkillId: comp.competencySkillId,
          level: comp.levelGranted,
        },
      });
    }

    await awardPoints(
      participant.userId,
      POINTS.EXTERNAL_TRAINING_COMPLETED,
      "EXTERNAL_TRAINING_COMPLETED",
      trainingId
    );

    await notifyUser({
      userId: participant.userId,
      type: "CERTIFICATE_ISSUED",
      title: "Treinamento externo registrado",
      body: `Sua participação em "${training.title}" foi confirmada e registrada no seu histórico.`,
    });

    await logAudit({
      userId: session.user.id,
      action: "EXTERNAL_TRAINING_COMPLETED",
      entityType: "ExternalTraining",
      entityId: trainingId,
      metadata: { participantUserId: participant.userId },
    });

    await checkAndAwardBadges(participant.userId);
  }

  revalidatePath(`/admin/treinamentos-externos/${trainingId}`);
  revalidatePath("/treinamentos-externos");
  return updated;
}

export async function setExternalTrainingCompetencies(
  trainingId: string,
  entries: { skillId: string; level: number }[]
) {
  await requireInstructor();
  await prisma.externalTrainingCompetency.deleteMany({ where: { externalTrainingId: trainingId } });
  if (entries.length > 0) {
    await prisma.externalTrainingCompetency.createMany({
      data: entries.map((e) => ({
        externalTrainingId: trainingId,
        competencySkillId: e.skillId,
        levelGranted: e.level,
      })),
    });
  }
  revalidatePath(`/admin/treinamentos-externos/${trainingId}`);
}
