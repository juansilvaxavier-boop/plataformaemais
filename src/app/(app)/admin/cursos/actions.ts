"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { indexLessonTranscript, indexMaterialText } from "@/lib/ai/rag";
import { generateNaiveCaptionSegments } from "@/lib/captions";
import { generateLessonSummary, generateQuizFromTranscript, persistGeneratedQuiz } from "@/lib/ai/content-generation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LessonType, MaterialType, Role } from "@prisma/client";

async function requireInstructor() {
  const session = await auth();
  assertRole(session?.user?.role, "INSTRUCTOR");
  return session!;
}

export async function createCourse(formData: FormData) {
  const session = await requireInstructor();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const recert = formData.get("recertificationPeriodMonths");
  const recertificationPeriodMonths = recert ? Number(recert) : null;
  const coverUrl = String(formData.get("coverUrl") ?? "").trim() || null;

  if (!title || !description || !category) {
    throw new Error("Título, descrição e categoria são obrigatórios.");
  }

  const course = await prisma.course.create({
    data: {
      title,
      description,
      category,
      recertificationPeriodMonths,
      coverUrl,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "COURSE_CREATED",
    entityType: "Course",
    entityId: course.id,
  });

  redirect(`/admin/cursos/${course.id}`);
}

export async function setCoursePublished(courseId: string, published: boolean) {
  const session = await requireInstructor();
  await prisma.course.update({ where: { id: courseId }, data: { published } });
  await logAudit({
    userId: session.user.id,
    action: published ? "COURSE_PUBLISHED" : "COURSE_UNPUBLISHED",
    entityType: "Course",
    entityId: courseId,
  });
  revalidatePath(`/admin/cursos/${courseId}`);
  revalidatePath("/admin/cursos");
}

export async function setCourseTargetRoles(courseId: string, roles: Role[]) {
  await requireInstructor();
  await prisma.courseTargetRole.deleteMany({ where: { courseId } });
  if (roles.length > 0) {
    await prisma.courseTargetRole.createMany({
      data: roles.map((role) => ({ courseId, role })),
    });
  }
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function setCourseTargetDepartments(courseId: string, departmentIds: string[]) {
  await requireInstructor();
  await prisma.courseTargetDepartment.deleteMany({ where: { courseId } });
  if (departmentIds.length > 0) {
    await prisma.courseTargetDepartment.createMany({
      data: departmentIds.map((departmentId) => ({ courseId, departmentId })),
    });
  }
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function createModule(formData: FormData) {
  const session = await requireInstructor();
  const courseId = String(formData.get("courseId"));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Título do módulo é obrigatório.");

  const count = await prisma.module.count({ where: { courseId } });
  await prisma.module.create({ data: { courseId, title, order: count } });

  await logAudit({ userId: session.user.id, action: "MODULE_CREATED", entityType: "Course", entityId: courseId });
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function deleteModule(courseId: string, moduleId: string) {
  await requireInstructor();
  await prisma.module.delete({ where: { id: moduleId } });
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function createLesson(formData: FormData) {
  await requireInstructor();
  const courseId = String(formData.get("courseId"));
  const moduleId = String(formData.get("moduleId"));
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "VIDEO") as LessonType;
  const videoUrl = String(formData.get("videoUrl") ?? "").trim() || null;
  const videoDurationSeconds = formData.get("videoDurationSeconds")
    ? Number(formData.get("videoDurationSeconds"))
    : null;
  const transcript = String(formData.get("transcript") ?? "").trim() || null;

  if (!title) throw new Error("Título da aula é obrigatório.");

  const count = await prisma.lesson.count({ where: { moduleId } });
  const captionSegments =
    transcript && videoDurationSeconds
      ? generateNaiveCaptionSegments(transcript, videoDurationSeconds)
      : undefined;

  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title,
      type,
      videoUrl,
      videoDurationSeconds,
      transcript,
      captionSegments,
      order: count,
    },
  });

  if (transcript) {
    await indexLessonTranscript(lesson.id);
  }

  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function deleteLesson(courseId: string, lessonId: string) {
  await requireInstructor();
  await prisma.lesson.delete({ where: { id: lessonId } });
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function updateLessonTranscript(courseId: string, lessonId: string, transcript: string) {
  await requireInstructor();
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  const captionSegments = lesson.videoDurationSeconds
    ? generateNaiveCaptionSegments(transcript, lesson.videoDurationSeconds)
    : undefined;
  await prisma.lesson.update({ where: { id: lessonId }, data: { transcript, captionSegments } });
  await indexLessonTranscript(lessonId);
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function runLessonSummary(courseId: string, lessonId: string) {
  await requireInstructor();
  const summary = await generateLessonSummary(lessonId);
  await prisma.lesson.update({ where: { id: lessonId }, data: { summary } });
  revalidatePath(`/admin/cursos/${courseId}`);
  return summary;
}

export async function runAIQuizGeneration(
  courseId: string,
  moduleId: string,
  lessonId: string,
  passingScore: number
) {
  const session = await requireInstructor();
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  const questions = await generateQuizFromTranscript(lessonId);
  if (questions.length === 0) {
    throw new Error("Não há transcrição suficiente para gerar o quiz.");
  }
  const quiz = await persistGeneratedQuiz({
    moduleId,
    title: `Quiz (IA): ${lesson.title}`,
    passingScore,
    questions,
  });

  await logAudit({
    userId: session.user.id,
    action: "AI_QUIZ_GENERATED",
    entityType: "Quiz",
    entityId: quiz.id,
  });

  revalidatePath(`/admin/cursos/${courseId}`);
  return quiz;
}

export async function createMaterial(formData: FormData) {
  await requireInstructor();
  const courseId = String(formData.get("courseId"));
  const lessonId = String(formData.get("lessonId"));
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const type = String(formData.get("type") ?? "OTHER") as MaterialType;
  const extractedText = String(formData.get("extractedText") ?? "").trim() || null;

  if (!name || !url) throw new Error("Nome e URL do material são obrigatórios.");

  const material = await prisma.lessonMaterial.create({
    data: { lessonId, name, url, type, extractedText },
  });

  if (extractedText) {
    await indexMaterialText(material.id);
  }

  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function deleteMaterial(courseId: string, materialId: string) {
  await requireInstructor();
  await prisma.lessonMaterial.delete({ where: { id: materialId } });
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function createManualQuiz(formData: FormData) {
  const session = await requireInstructor();
  const courseId = String(formData.get("courseId"));
  const moduleId = String(formData.get("moduleId"));
  const title = String(formData.get("title") ?? "").trim();
  const passingScore = Number(formData.get("passingScore") ?? 70);

  const questionTexts = formData.getAll("questionText") as string[];
  const questions = questionTexts
    .map((text, idx) => {
      const optionTexts = (formData.getAll(`question-${idx}-optionText`) as string[]) ?? [];
      const correctIndex = Number(formData.get(`question-${idx}-correct`) ?? -1);
      return {
        text: text.trim(),
        options: optionTexts
          .map((t, oIdx) => ({ text: t.trim(), isCorrect: oIdx === correctIndex }))
          .filter((o) => o.text),
      };
    })
    .filter((q) => q.text && q.options.length >= 2);

  if (!title || questions.length === 0) {
    throw new Error("Informe o título e ao menos uma pergunta com 2+ alternativas.");
  }

  const quiz = await prisma.quiz.create({
    data: {
      moduleId,
      title,
      passingScore,
      questions: {
        create: questions.map((q, order) => ({
          text: q.text,
          order,
          options: { create: q.options },
        })),
      },
    },
  });

  await logAudit({ userId: session.user.id, action: "QUIZ_CREATED", entityType: "Quiz", entityId: quiz.id });
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function deleteQuiz(courseId: string, quizId: string) {
  await requireInstructor();
  await prisma.quiz.delete({ where: { id: quizId } });
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function setCourseCompetencies(courseId: string, entries: { skillId: string; level: number }[]) {
  await requireInstructor();
  await prisma.courseCompetency.deleteMany({ where: { courseId } });
  if (entries.length > 0) {
    await prisma.courseCompetency.createMany({
      data: entries.map((e) => ({ courseId, competencySkillId: e.skillId, levelGranted: e.level })),
    });
  }
  revalidatePath(`/admin/cursos/${courseId}`);
}
