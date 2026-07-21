import { prisma } from "@/lib/db";
import { AI_ENABLED, getChatCompletion } from "@/lib/ai/provider";

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

/** Gera um resumo executivo da aula a partir da transcrição. */
export async function generateLessonSummary(lessonId: string): Promise<string> {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  if (!lesson.transcript) {
    return "Nenhuma transcrição disponível para gerar o resumo desta aula.";
  }

  if (AI_ENABLED) {
    const systemPrompt =
      "Você resume aulas corporativas em português do Brasil. Produza um resumo executivo em até 5 tópicos objetivos (bullet points), focado nos pontos que o colaborador precisa lembrar.";
    return getChatCompletion(systemPrompt, lesson.transcript.slice(0, 12000));
  }

  const sentences = splitSentences(lesson.transcript);
  const picked = sentences.slice(0, 5);
  return (
    "[Modo offline — resumo extrativo]\n" + picked.map((s) => `• ${s}`).join("\n")
  );
}

type GeneratedQuestion = {
  text: string;
  type: "SINGLE_CHOICE" | "TRUE_FALSE";
  options: { text: string; isCorrect: boolean }[];
};

/** Gera perguntas de quiz automaticamente a partir da transcrição de uma aula. */
export async function generateQuizFromTranscript(
  lessonId: string,
  questionCount = 5
): Promise<GeneratedQuestion[]> {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  if (!lesson.transcript) return [];

  if (AI_ENABLED) {
    const systemPrompt = `Você cria quizzes de múltipla escolha em português do Brasil a partir de transcrições de treinamentos corporativos. Gere exatamente ${questionCount} perguntas de escolha única, cada uma com 4 alternativas (apenas 1 correta). Responda SOMENTE em JSON válido no formato: [{"text": "...", "options": [{"text": "...", "isCorrect": true|false}, ...]}].`;
    const raw = await getChatCompletion(systemPrompt, lesson.transcript.slice(0, 12000));
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as Array<{
        text: string;
        options: { text: string; isCorrect: boolean }[];
      }>;
      return parsed.map((q) => ({ ...q, type: "SINGLE_CHOICE" as const }));
    } catch {
      // se o parsing falhar, cai para o modo heurístico abaixo
    }
  }

  const sentences = splitSentences(lesson.transcript).slice(0, questionCount);
  return sentences.map((sentence) => ({
    text: `Verdadeiro ou falso: "${sentence}"`,
    type: "TRUE_FALSE" as const,
    options: [
      { text: "Verdadeiro", isCorrect: true },
      { text: "Falso", isCorrect: false },
    ],
  }));
}

export async function persistGeneratedQuiz(params: {
  moduleId?: string;
  lessonId?: string;
  title: string;
  passingScore: number;
  questions: GeneratedQuestion[];
}) {
  return prisma.quiz.create({
    data: {
      moduleId: params.moduleId,
      lessonId: params.lessonId,
      title: params.title,
      passingScore: params.passingScore,
      aiGenerated: true,
      questions: {
        create: params.questions.map((q, order) => ({
          text: q.text,
          type: q.type,
          order,
          aiGenerated: true,
          options: { create: q.options },
        })),
      },
    },
    include: { questions: { include: { options: true } } },
  });
}

/** Sugere novos cursos ao usuário com base no histórico (categoria) e cargo. */
export async function getPersonalizedSuggestions(userId: string, limit = 5) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const completed = await prisma.enrollment.findMany({
    where: { userId, courseId: { not: null }, status: "COMPLETED" },
    include: { course: true },
  });
  const completedCourseIds = completed.map((e) => e.courseId!);
  const favoriteCategories = [...new Set(completed.map((e) => e.course?.category).filter(Boolean))];

  const candidates = await prisma.course.findMany({
    where: {
      published: true,
      id: { notIn: completedCourseIds },
      OR: [
        favoriteCategories.length > 0 ? { category: { in: favoriteCategories as string[] } } : {},
        { targetRoles: { some: { role: user.role } } },
      ],
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  return candidates;
}
