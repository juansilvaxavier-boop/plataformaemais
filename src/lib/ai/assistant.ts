import { prisma } from "@/lib/db";
import { AI_ENABLED, getChatCompletion } from "@/lib/ai/provider";
import { retrieveRelevantChunks } from "@/lib/ai/rag";

export async function askCourseAssistant(params: {
  userId: string;
  courseId: string;
  chatSessionId?: string;
  question: string;
}) {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: params.courseId } });

  const session = params.chatSessionId
    ? await prisma.chatSession.findUniqueOrThrow({ where: { id: params.chatSessionId } })
    : await prisma.chatSession.create({
        data: { userId: params.userId, courseId: params.courseId },
      });

  await prisma.chatMessage.create({
    data: { chatSessionId: session.id, role: "USER", content: params.question },
  });

  const chunks = await retrieveRelevantChunks(params.courseId, params.question, 5);
  const context = chunks.map((c, i) => `[Trecho ${i + 1}] ${c.content}`).join("\n\n");

  let answer: string;

  if (AI_ENABLED && chunks.length > 0) {
    const systemPrompt = `Você é o assistente de IA especialista no conteúdo do curso "${course.title}". Responda em português do Brasil, de forma objetiva, com base apenas nos trechos de contexto fornecidos. Se a resposta não estiver no contexto, diga que não encontrou essa informação no material do curso.`;
    const userPrompt = `Contexto do curso:\n${context}\n\nPergunta do colaborador: ${params.question}`;
    answer = await getChatCompletion(systemPrompt, userPrompt);
  } else if (chunks.length > 0) {
    answer = `[Modo offline — configure OPENAI_API_KEY para respostas geradas por IA]\n\nCom base no material do curso, os trechos mais relacionados à sua pergunta são:\n\n${context}`;
  } else {
    answer =
      "Ainda não há conteúdo indexado para este curso (transcrições ou materiais). Peça ao instrutor para adicionar a transcrição das aulas.";
  }

  await prisma.chatMessage.create({
    data: { chatSessionId: session.id, role: "ASSISTANT", content: answer },
  });

  return { chatSessionId: session.id, answer };
}

export async function getChatHistory(chatSessionId: string) {
  return prisma.chatMessage.findMany({
    where: { chatSessionId },
    orderBy: { createdAt: "asc" },
  });
}
